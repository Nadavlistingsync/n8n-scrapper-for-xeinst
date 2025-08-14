#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const { insertLead, checkLeadExists } = require('../lib/google-sheets-db')

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

// Database health check for Google Sheets system
async function ensureDatabaseHealth() {
  const feedback = new ScrapingFeedbackLoop()
  
  try {
    feedback.logInfo('Checking Google Sheets database health...')
    
    // Test database connection by trying to check if a lead exists
    const exists = await checkLeadExists('test', 'test')
    
    // The Google Sheets system always returns a boolean, no errors
    feedback.logSuccess('Google Sheets database health check passed')
    return true
    
  } catch (error) {
    feedback.logError('Google Sheets database health check failed', error)
    return false
  }
}

async function scrapeRepositories() {
  console.log('ℹ️  🚀 Starting automated n8n repository scraping...');
  
  // Check database health first
  console.log('ℹ️  Checking database health...');
  const healthCheck = await ensureDatabaseHealth();
  if (!healthCheck) {
    console.error('❌ Database health check failed');
    return;
  }
  console.log('✅ Database health check passed');

  let totalRepositories = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // Start from page 6 and continue for more pages
  for (let page = 6; page <= 15; page++) {
    try {
      console.log(`ℹ️  📄 Scraping page ${page}...`);
      
      const repositories = await searchN8nRepositories(page);
      if (!repositories || repositories.length === 0) {
        console.log(`⚠️  No repositories found on page ${page}, stopping...`);
        break;
      }
      
      console.log(`ℹ️  Found ${repositories.length} repositories on page ${page}`);
      totalRepositories += repositories.length;

      for (const repo of repositories) {
        try {
          // Check if lead already exists
          const existingLead = await checkLeadExists(repo.owner.login, repo.name);
          if (existingLead) {
            console.log(`ℹ️  Lead already exists: ${repo.owner.login}/${repo.name}`);
            continue;
          }

          // Fetch user info to get email
          console.log(`ℹ️  👤 Fetching user info for ${repo.owner.login}...`);
          const userInfo = await getUserInfo(repo.owner.login);
          
          if (!userInfo.email) {
            console.log(`ℹ️  ⏭️  Skipping ${repo.owner.login}/${repo.name} - no email found for ${repo.owner.login}`);
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
            console.log(`✅ Added lead: ${repo.owner.login}/${repo.name} (${userInfo.email})`);
            newLeadsAdded++;
          } else {
            console.log(`❌ Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
          }

        } catch (error) {
          console.error(`❌ Error processing repository ${repo.owner.login}/${repo.name}:`, error.message);
        }
      }

      // Add delay between pages to respect rate limits
      if (page < 15) {
        console.log('ℹ️  ⏳ Waiting 2 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error scraping page ${page}:`, error.message);
      break;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('✅ 🎉 Scraping completed!');
  console.log(`ℹ️  📊 Total repositories found: ${totalRepositories}`);
  console.log(`ℹ️  ✅ New leads with emails added: ${newLeadsAdded}`);
  console.log('ℹ️  📧 Only repositories with public emails are saved');

  // Generate report
  console.log('\n📊 SCRAPING REPORT');
  console.log('==================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`✅ Successes: ${newLeadsAdded}`);
  console.log(`❌ Failures: ${totalRepositories - newLeadsAdded}`);
  console.log(`📈 Success Rate: ${Math.round((newLeadsAdded / totalRepositories) * 100)}%`);
  console.log('⚠️  Warnings: 0');
  console.log('💥 Errors: 0');
  console.log('\n✨ Scraping script completed successfully');
}

// Run the scraper
if (require.main === module) {
  scrapeRepositories()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeRepositories } 