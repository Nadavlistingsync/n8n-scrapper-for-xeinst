#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github')
const { insertLead, checkLeadExists } = require('../lib/supabase')

async function scrapeN8nRepositories() {
  console.log('🚀 Starting automated n8n repository scraping...')
  
  const startTime = Date.now()
  let totalLeadsFound = 0
  let totalLeadsAdded = 0
  const errors = []

  try {
    // Scrape multiple pages
    for (let page = 1; page <= 5; page++) {
      console.log(`\n📄 Scraping page ${page}...`)
      
      const repos = await searchN8nRepositories(page)
      
      if (repos.length === 0) {
        console.log(`No more repositories found on page ${page}`)
        break
      }

      totalLeadsFound += repos.length
      console.log(`Found ${repos.length} repositories on page ${page}`)

      for (const repo of repos) {
        try {
          // Skip if not a valid n8n repo
          if (!isValidN8nRepo(repo)) {
            continue
          }

          // Skip if not active (no commits in 90+ days)
          if (!isActiveRepository(repo)) {
            console.log(`⏭️  Skipping inactive repo: ${repo.full_name}`)
            continue
          }

          // Check if lead already exists
          const exists = await checkLeadExists(repo.owner.login, repo.name)
          if (exists) {
            console.log(`✅ Lead already exists: ${repo.full_name}`)
            continue
          }

          // Get user info to extract email
          console.log(`👤 Fetching user info for ${repo.owner.login}...`)
          const userInfo = await getUserInfo(repo.owner.login)
          
          // Create lead object
          const lead = {
            github_username: repo.owner.login,
            repo_name: repo.name,
            repo_url: repo.html_url,
            repo_description: repo.description,
            email: userInfo?.email,
            last_activity: repo.pushed_at,
            status: 'new',
          }

          // Insert into database
          const insertedLead = await insertLead(lead)
          if (insertedLead) {
            totalLeadsAdded++
            console.log(`✅ Added lead: ${repo.full_name}${userInfo?.email ? ` (${userInfo.email})` : ' (no email)'}`)
          } else {
            const errorMsg = `❌ Failed to insert lead: ${repo.full_name}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }

          // Rate limiting - GitHub API has rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          const errorMsg = `❌ Error processing repo ${repo.full_name}: ${error}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      // Rate limiting between pages
      if (page < 5) {
        console.log('⏳ Waiting 2 seconds before next page...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n🎉 Scraping completed!')
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📊 Total repositories found: ${totalLeadsFound}`)
    console.log(`✅ New leads added: ${totalLeadsAdded}`)
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`)
      errors.forEach(error => console.error(`   ${error}`))
    }

    // Log summary for monitoring
    console.log(`\n📈 Summary: ${totalLeadsAdded}/${totalLeadsFound} leads added (${Math.round(totalLeadsAdded/totalLeadsFound*100)}% success rate)`)

  } catch (error) {
    console.error('💥 Fatal error during scraping:', error)
    process.exit(1)
  }
}

// Run the scraper
if (require.main === module) {
  scrapeN8nRepositories()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeN8nRepositories } 