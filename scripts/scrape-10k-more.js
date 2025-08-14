#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const { insertLead, checkLeadExists } = require('../lib/supabase.js')

// Enhanced feedback loop for large-scale scraping
class LargeScaleScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
    this.pagesScraped = 0
    this.reposProcessed = 0
    this.rateLimitHits = 0
    this.lastRateLimitReset = null
  }

  logError(message, error = null) {
    this.errors.push({ message, error, timestamp: new Date() })
    console.error(`❌ ${message}`, error ? `(${error.message})` : '')
  }

  logWarning(message) {
    this.warnings.push({ message, timestamp: new Date() })
    console.warn(`⚠️  ${message}`)
  }

  logSuccess(message) {
    this.successCount++
    console.log(`✅ ${message}`)
  }

  logInfo(message) {
    console.log(`ℹ️  ${message}`)
  }

  logRateLimit(resetTime) {
    this.rateLimitHits++
    this.lastRateLimitReset = resetTime
    console.log(`⏰ Rate limit hit. Reset at: ${resetTime}`)
  }

  getStats() {
    const duration = Math.round((Date.now() - this.startTime) / 1000)
    const successRate = this.successCount + this.failureCount > 0 
      ? Math.round(this.successCount / (this.successCount + this.failureCount) * 100)
      : 0

    return {
      duration,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      pagesScraped: this.pagesScraped,
      reposProcessed: this.reposProcessed,
      rateLimitHits: this.rateLimitHits
    }
  }

  printReport() {
    const stats = this.getStats()
    console.log('\n📊 LARGE-SCALE SCRAPING REPORT')
    console.log('==============================')
    console.log(`⏱️  Duration: ${stats.duration}s`)
    console.log(`📄 Pages scraped: ${stats.pagesScraped}`)
    console.log(`🔍 Repos processed: ${stats.reposProcessed}`)
    console.log(`✅ New leads added: ${stats.successCount}`)
    console.log(`❌ Failures: ${stats.failureCount}`)
    console.log(`📈 Success Rate: ${stats.successRate}%`)
    console.log(`⏰ Rate limit hits: ${stats.rateLimitHits}`)
    console.log(`⚠️  Warnings: ${stats.warningCount}`)
    console.log(`💥 Errors: ${stats.errorCount}`)

    if (this.errors.length > 0) {
      console.log('\n🔍 ERROR ANALYSIS:')
      this.errors.slice(-10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.message} (${error.timestamp.toISOString()})`)
        if (error.error) {
          console.log(`   Details: ${error.error.message}`)
        }
      })
    }
  }
}

// Multiple search strategies for comprehensive coverage
const searchStrategies = [
  {
    name: 'n8n-core',
    query: 'n8n language:javascript language:typescript language:json',
    description: 'Core n8n repositories'
  },
  {
    name: 'n8n-workflows',
    query: 'n8n-workflow language:javascript language:typescript',
    description: 'n8n workflow repositories'
  },
  {
    name: 'n8n-automation',
    query: 'n8n automation language:javascript language:typescript',
    description: 'n8n automation projects'
  },
  {
    name: 'n8n-integration',
    query: 'n8n integration language:javascript language:typescript',
    description: 'n8n integration projects'
  },
  {
    name: 'n8n-node',
    query: 'n8n-node language:javascript language:typescript',
    description: 'n8n node repositories'
  },
  {
    name: 'n8n-webhook',
    query: 'n8n webhook language:javascript language:typescript',
    description: 'n8n webhook projects'
  },
  {
    name: 'n8n-api',
    query: 'n8n api language:javascript language:typescript',
    description: 'n8n API projects'
  },
  {
    name: 'n8n-plugin',
    query: 'n8n plugin language:javascript language:typescript',
    description: 'n8n plugin repositories'
  },
  {
    name: 'n8n-connector',
    query: 'n8n connector language:javascript language:typescript',
    description: 'n8n connector projects'
  },
  {
    name: 'n8n-custom',
    query: 'n8n custom language:javascript language:typescript',
    description: 'n8n custom implementations'
  }
]

// Enhanced search function with multiple strategies
async function searchWithStrategy(strategy, page = 1) {
  const { Octokit } = require('octokit')
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  try {
    const response = await octokit.rest.search.repos({
      q: strategy.query,
      sort: 'updated',
      order: 'desc',
      per_page: 100,
      page,
    })

    return response.data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      html_url: repo.html_url,
      owner: {
        login: repo.owner?.login || 'unknown',
        type: repo.owner?.type || 'User',
      },
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      topics: repo.topics || [],
      strategy: strategy.name
    }))
  } catch (error) {
    if (error.status === 403) {
      // Rate limit hit
      const resetTime = error.response?.headers?.['x-ratelimit-reset']
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime) * 1000)
        throw new Error(`Rate limit exceeded. Reset at: ${resetDate.toISOString()}`)
      }
    }
    throw error
  }
}

// Database health check
async function ensureDatabaseHealth() {
  const feedback = new LargeScaleScrapingFeedbackLoop()
  
  try {
    feedback.logInfo('Checking database health...')
    
    const { data, error } = await checkLeadExists('test', 'test')
    
    if (error && error.code === '42P01') {
      feedback.logWarning('Leads table does not exist, attempting to create...')
      
      const { createClient } = require('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        feedback.logError('Missing Supabase credentials for table creation')
        return false
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS leads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          github_username TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          repo_description TEXT,
          email TEXT,
          last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          email_sent BOOLEAN DEFAULT FALSE,
          email_sent_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'converted')),
          email_approved BOOLEAN DEFAULT FALSE,
          email_pending_approval BOOLEAN DEFAULT FALSE,
          ai_score DECIMAL(3,2),
          ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
          ai_analysis TEXT,
          search_strategy TEXT,
          UNIQUE(github_username, repo_name)
        );
      `
      
      try {
        await supabase.rpc('exec_sql', { sql: createTableSQL })
        feedback.logSuccess('Leads table created successfully')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: testData, error: testError } = await checkLeadExists('test', 'test')
        if (testError && testError.code === '42P01') {
          feedback.logError('Table creation failed - table still does not exist')
          return false
        }
        
        return true
      } catch (createError) {
        feedback.logError('Failed to create table automatically', createError)
        return false
      }
    } else if (error) {
      feedback.logError('Database connection failed', error)
      return false
    } else {
      feedback.logSuccess('Database health check passed')
      return true
    }
  } catch (error) {
    feedback.logError('Database health check failed', error)
    return false
  }
}

// Enhanced repository processing with better filtering
async function processRepository(repo, feedback) {
  try {
    // Check if lead already exists
    const existingLead = await checkLeadExists(repo.owner.login, repo.name)
    if (existingLead) {
      return { status: 'exists', message: `Lead already exists: ${repo.owner.login}/${repo.name}` }
    }

    // Enhanced filtering
    if (!isActiveRepository(repo)) {
      return { status: 'inactive', message: `Skipping inactive repo: ${repo.owner.login}/${repo.name}` }
    }

    if (!isValidN8nRepo(repo)) {
      return { status: 'invalid', message: `Skipping invalid n8n repo: ${repo.owner.login}/${repo.name}` }
    }

    // Fetch user info to get email
    const userInfo = await getUserInfo(repo.owner.login)
    
    if (!userInfo) {
      return { status: 'no-user', message: `No user info for: ${repo.owner.login}` }
    }

    if (!userInfo.email) {
      return { status: 'no-email', message: `No email for: ${repo.owner.login}` }
    }

    // Save lead to database
    const leadData = {
      github_username: repo.owner.login,
      repo_name: repo.name,
      repo_url: repo.html_url,
      repo_description: repo.description,
      email: userInfo.email,
      last_activity: repo.pushed_at,
      status: 'new',
      email_sent: false,
      email_approved: false,
      email_pending_approval: false
    }

    const result = await insertLead(leadData)
    if (result) {
      return { status: 'success', message: `Added lead: ${repo.owner.login}/${repo.name} (${userInfo.email})` }
    } else {
      return { status: 'db-error', message: `Failed to save lead: ${repo.owner.login}/${repo.name}` }
    }

  } catch (error) {
    return { status: 'error', message: `Error processing ${repo.owner.login}/${repo.name}: ${error.message}` }
  }
}

// Main scraping function
async function scrape10KMoreLeads() {
  const feedback = new LargeScaleScrapingFeedbackLoop()
  
  console.log('🚀 Starting large-scale n8n repository scraping for 10K more leads...')
  
  // Check database health first
  const healthCheck = await ensureDatabaseHealth()
  if (!healthCheck) {
    feedback.logError('Database health check failed')
    return
  }
  feedback.logSuccess('Database health check passed')

  let totalNewLeads = 0
  const targetLeads = 10000
  const maxPagesPerStrategy = 50 // Increased from 15 to 50

  for (const strategy of searchStrategies) {
    if (totalNewLeads >= targetLeads) {
      feedback.logInfo(`Target reached: ${totalNewLeads} new leads`)
      break
    }

    feedback.logInfo(`🔍 Using strategy: ${strategy.name} - ${strategy.description}`)
    
    for (let page = 1; page <= maxPagesPerStrategy; page++) {
      if (totalNewLeads >= targetLeads) {
        break
      }

      try {
        feedback.logInfo(`📄 Scraping ${strategy.name} page ${page}...`)
        
        const repositories = await searchWithStrategy(strategy, page)
        if (!repositories || repositories.length === 0) {
          feedback.logWarning(`No repositories found on ${strategy.name} page ${page}, moving to next strategy`)
          break
        }
        
        feedback.logInfo(`Found ${repositories.length} repositories on ${strategy.name} page ${page}`)
        feedback.reposProcessed += repositories.length
        feedback.pagesScraped++

        let pageNewLeads = 0
        for (const repo of repositories) {
          if (totalNewLeads >= targetLeads) {
            break
          }

          const result = await processRepository(repo, feedback)
          
          switch (result.status) {
            case 'success':
              feedback.logSuccess(result.message)
              totalNewLeads++
              pageNewLeads++
              break
            case 'exists':
              // Silent skip for existing leads
              break
            case 'inactive':
            case 'invalid':
            case 'no-user':
            case 'no-email':
            case 'db-error':
              feedback.failureCount++
              break
            case 'error':
              feedback.logError(result.message)
              feedback.failureCount++
              break
          }

          // Small delay between repositories to be respectful
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        feedback.logInfo(`Page ${page} completed: ${pageNewLeads} new leads added`)
        
        // Progress update
        if (totalNewLeads % 100 === 0) {
          feedback.logInfo(`🎯 Progress: ${totalNewLeads}/${targetLeads} leads collected`)
        }

        // Add delay between pages to respect rate limits
        if (page < maxPagesPerStrategy) {
          feedback.logInfo('⏳ Waiting 3 seconds before next page...')
          await new Promise(resolve => setTimeout(resolve, 3000))
        }

      } catch (error) {
        if (error.message.includes('Rate limit exceeded')) {
          feedback.logRateLimit(error.message)
          feedback.logInfo('⏳ Waiting 60 seconds for rate limit reset...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          page-- // Retry this page
        } else {
          feedback.logError(`Error scraping ${strategy.name} page ${page}:`, error)
          break
        }
      }
    }

    // Delay between strategies
    if (totalNewLeads < targetLeads) {
      feedback.logInfo('⏳ Waiting 5 seconds before next strategy...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  const duration = Math.round((Date.now() - feedback.startTime) / 1000)
  
  feedback.logSuccess('🎉 Large-scale scraping completed!')
  feedback.logInfo(`📊 Total new leads added: ${totalNewLeads}`)
  feedback.logInfo(`⏱️  Total duration: ${duration}s`)

  feedback.printReport()
  
  return totalNewLeads
}

// Run the scraper
if (require.main === module) {
  scrape10KMoreLeads()
    .then((totalLeads) => {
      console.log(`\n✨ Large-scale scraping completed successfully! Added ${totalLeads} new leads`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Large-scale scraping failed:', error)
      process.exit(1)
    })
}

module.exports = { scrape10KMoreLeads } 