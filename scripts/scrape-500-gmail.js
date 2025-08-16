#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const { insertLead, checkLeadExists, getAllLeads } = require('../lib/google-sheets-db')

// Automatic feedback loop for debugging
class ScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
    this.gmailLeadsAdded = 0
    this.targetGmailLeads = 500
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

  logGmailLeadAdded() {
    this.gmailLeadsAdded++
    console.log(`📧 Gmail lead added! (${this.gmailLeadsAdded}/${this.targetGmailLeads})`)
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
      gmailLeadsAdded: this.gmailLeadsAdded,
      targetGmailLeads: this.targetGmailLeads
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
    console.log(`📧 Gmail Leads Added: ${stats.gmailLeadsAdded}/${stats.targetGmailLeads}`)
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

  isTargetReached() {
    return this.gmailLeadsAdded >= this.targetGmailLeads
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

async function getCurrentGmailLeadsCount() {
  try {
    const allLeads = await getAllLeads()
    const gmailLeads = allLeads.filter(lead => {
      if (!lead.email) return false
      const emailLower = lead.email.toLowerCase().trim()
      return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
    })
    return gmailLeads.length
  } catch (error) {
    console.error('Error getting current Gmail leads count:', error)
    return 0
  }
}

async function scrape500GmailLeads() {
  const feedback = new ScrapingFeedbackLoop()
  
  console.log('ℹ️  🚀 Starting automated n8n repository scraping for 500 Gmail leads...');
  
  // Check database health first
  console.log('ℹ️  Checking database health...');
  const healthCheck = await ensureDatabaseHealth();
  if (!healthCheck) {
    console.error('❌ Database health check failed');
    return;
  }
  console.log('✅ Database health check passed');

  // Get current Gmail leads count
  const currentGmailCount = await getCurrentGmailLeadsCount()
  console.log(`ℹ️  Current Gmail leads in database: ${currentGmailCount}`)
  console.log(`ℹ️  Target: ${feedback.targetGmailLeads} additional Gmail leads`)

  let totalRepositories = 0;
  let startTime = Date.now();
  let page = 1;

  // Continue scraping until we reach 500 Gmail leads or hit rate limits
  while (!feedback.isTargetReached() && page <= 50) { // Limit to 50 pages to prevent infinite loops
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
        // Check if we've reached our target
        if (feedback.isTargetReached()) {
          console.log('🎯 Target reached! Stopping scraping...');
          break;
        }

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

          // Save lead to database (this will automatically filter for Gmail only)
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
            feedback.logGmailLeadAdded()
            feedback.logSuccess(`Added Gmail lead: ${repo.owner.login}/${repo.name} (${userInfo.email})`)
          } else {
            // Lead was not added (likely not Gmail or duplicate)
            feedback.logWarning(`Lead not added: ${repo.owner.login}/${repo.name} - may not be Gmail or duplicate`)
          }

        } catch (error) {
          feedback.logError(`Error processing repository ${repo.owner.login}/${repo.name}`, error)
        }
      }

      // Check if we've reached our target after processing this page
      if (feedback.isTargetReached()) {
        console.log('🎯 Target reached! Stopping scraping...');
        break;
      }

      // Add delay between pages to respect rate limits
      console.log('ℹ️  ⏳ Waiting 2 seconds before next page...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      page++;

    } catch (error) {
      feedback.logError(`Error scraping page ${page}`, error)
      break;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('✅ 🎉 Scraping completed!');
  console.log(`ℹ️  📊 Total repositories processed: ${totalRepositories}`);
  console.log(`ℹ️  📧 Gmail leads added: ${feedback.gmailLeadsAdded}`);
  console.log(`ℹ️  🎯 Target reached: ${feedback.isTargetReached() ? 'Yes' : 'No'}`);

  // Print detailed report
  feedback.printReport();

  // Final status
  if (feedback.isTargetReached()) {
    console.log('\n🎉 SUCCESS: Target of 500 Gmail leads reached!');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Could not reach target of 500 Gmail leads');
    console.log(`📧 Gmail leads added: ${feedback.gmailLeadsAdded}/500`);
  }

  console.log('\n✨ Scraping script completed');
}

// Run the scraper
if (require.main === module) {
  scrape500GmailLeads()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrape500GmailLeads }
