#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const { insertLead, checkLeadExists } = require('../lib/supabase.js')

// Automatic feedback loop for debugging
class ScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
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
      warningCount: this.warnings.length
    }
  }

  printReport() {
    const stats = this.getStats()
    console.log('\n📊 SCRAPING REPORT')
    console.log('==================')
    console.log(`⏱️  Duration: ${stats.duration}s`)
    console.log(`✅ Successes: ${stats.successCount}`)
    console.log(`❌ Failures: ${stats.failureCount}`)
    console.log(`📈 Success Rate: ${stats.successRate}%`)
    console.log(`⚠️  Warnings: ${stats.warningCount}`)
    console.log(`💥 Errors: ${stats.errorCount}`)

    if (this.errors.length > 0) {
      console.log('\n🔍 ERROR ANALYSIS:')
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message} (${error.timestamp.toISOString()})`)
        if (error.error) {
          console.log(`   Details: ${error.error.message}`)
        }
      })
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message} (${warning.timestamp.toISOString()})`)
      })
    }
  }
}

// Different search queries to bypass the 1000 result limit
const searchQueries = [
  'n8n workflow automation',
  'n8n nodes custom',
  'n8n integration',
  'n8n webhook',
  'n8n api',
  'n8n trigger',
  'n8n action',
  'n8n connector',
  'n8n plugin',
  'n8n extension'
]

async function scrapeMoreRepositories() {
  const feedback = new ScrapingFeedbackLoop()
  
  console.log('ℹ️  🚀 Starting additional n8n repository scraping with multiple search queries...');
  feedback.logInfo('Using different search queries to bypass GitHub API limits...');

  let totalRepositories = 0;
  let newLeadsAdded = 0;

  // Try different search queries
  for (const query of searchQueries) {
    try {
      feedback.logInfo(`🔍 Searching for: "${query}"`);
      
      // Search pages 1-3 for each query
      for (let page = 1; page <= 3; page++) {
        try {
          feedback.logInfo(`📄 Scraping page ${page} for query: "${query}"`);
          
          const repositories = await searchN8nRepositories(page, query);
          if (!repositories || repositories.length === 0) {
            feedback.logWarning(`No repositories found on page ${page} for query: "${query}"`);
            break;
          }
          
          feedback.logInfo(`Found ${repositories.length} repositories on page ${page} for query: "${query}"`);
          totalRepositories += repositories.length;

          for (const repo of repositories) {
            try {
              // Check if lead already exists
              const existingLead = await checkLeadExists(repo.owner.login, repo.name);
              if (existingLead) {
                feedback.logInfo(`Lead already exists: ${repo.owner.login}/${repo.name}`);
                continue;
              }

              // Fetch user info to get email
              feedback.logInfo(`👤 Fetching user info for ${repo.owner.login}...`);
              const userInfo = await getUserInfo(repo.owner.login);
              
              if (!userInfo.email) {
                feedback.logInfo(`⏭️  Skipping ${repo.owner.login}/${repo.name} - no email found for ${repo.owner.login}`);
                continue;
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
              };

              const result = await insertLead(leadData);
              if (result) {
                feedback.logSuccess(`Added lead: ${repo.owner.login}/${repo.name} (${userInfo.email})`);
                newLeadsAdded++;
              } else {
                feedback.logError(`Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
              }

            } catch (error) {
              feedback.logError(`Error processing repository ${repo.owner.login}/${repo.name}: ${error.message}`);
            }
          }

          // Add delay between pages to respect rate limits
          if (page < 3) {
            feedback.logInfo('⏳ Waiting 1 second before next page...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          feedback.logError(`Error scraping page ${page} for query "${query}": ${error.message}`);
          break;
        }
      }

      // Add delay between queries to respect rate limits
      if (query !== searchQueries[searchQueries.length - 1]) {
        feedback.logInfo('⏳ Waiting 3 seconds before next query...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      feedback.logError(`Error processing query "${query}": ${error.message}`);
    }
  }

  feedback.logSuccess('🎉 Additional scraping completed!');
  feedback.logInfo(`📊 Total repositories found: ${totalRepositories}`);
  feedback.logInfo(`✅ New leads with emails added: ${newLeadsAdded}`);
  feedback.logInfo('📧 Only repositories with public emails are saved');

  // Print final report
  feedback.printReport();

  return feedback;
}

// Run the scraper
if (require.main === module) {
  scrapeMoreRepositories()
    .then(() => {
      console.log('\n✨ Additional scraping completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Additional scraping failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeMoreRepositories } 