import { NextRequest, NextResponse } from 'next/server'
import { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } from '@/lib/github'
import { insertLead, checkLeadExists } from '@/lib/google-sheets-db'
import { ScrapeResult } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const maxPages = parseInt(searchParams.get('maxPages') || '3')

    console.log(`Starting scrape for page ${page} to ${page + maxPages - 1}`)

    let totalLeadsFound = 0
    let totalLeadsAdded = 0
    const errors: string[] = []

    for (let currentPage = page; currentPage < page + maxPages; currentPage++) {
      console.log(`Scraping page ${currentPage}...`)
      
      const repos = await searchN8nRepositories(currentPage)
      
      if (repos.length === 0) {
        console.log(`No more repositories found on page ${currentPage}`)
        break
      }

      totalLeadsFound += repos.length

      for (const repo of repos) {
        try {
          // Skip if not a valid n8n repo
          if (!isValidN8nRepo(repo)) {
            continue
          }

          // Skip if not active (no commits in 90+ days)
          if (!isActiveRepository(repo)) {
            console.log(`Skipping inactive repo: ${repo.full_name}`)
            continue
          }

          // Check if lead already exists
          const exists = await checkLeadExists(repo.owner.login, repo.name)
          if (exists) {
            console.log(`Lead already exists: ${repo.full_name}`)
            continue
          }

          // Get user info to extract email
          const userInfo = await getUserInfo(repo.owner.login)
          
          // Create lead object
          const lead = {
            github_username: repo.owner.login,
            repo_name: repo.name,
            repo_url: repo.html_url,
            repo_description: repo.description,
            email: userInfo?.email,
            last_activity: repo.pushed_at,
            status: 'new' as const,
          }

          // Insert into database
          const insertedLead = await insertLead(lead)
          if (insertedLead) {
            totalLeadsAdded++
            console.log(`Added lead: ${repo.full_name}`)
          } else {
            errors.push(`Failed to insert lead: ${repo.full_name}`)
          }

          // Rate limiting - GitHub API has rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          const errorMsg = `Error processing repo ${repo.full_name}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      // Rate limiting between pages
      if (currentPage < page + maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const result: ScrapeResult = {
      success: true,
      message: `Scraping completed. Found ${totalLeadsFound} repositories, added ${totalLeadsAdded} new leads.`,
      leadsFound: totalLeadsFound,
      leadsAdded: totalLeadsAdded,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('Scraping result:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Scraping error:', error)
    
    const result: ScrapeResult = {
      success: false,
      message: `Scraping failed: ${error}`,
      leadsFound: 0,
      leadsAdded: 0,
      errors: [error as string],
    }

    return NextResponse.json(result, { status: 500 })
  }
} 