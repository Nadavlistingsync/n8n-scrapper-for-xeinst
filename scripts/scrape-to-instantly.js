#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const { createInstantlyAPI } = require('../lib/instantly-api.js')

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
    this.leadsBuffer = []
    this.bufferSize = 50 // Send to Instantly in batches of 50
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

  // Add lead to buffer and send to Instantly when buffer is full
  async addLeadToBuffer(lead, instantlyAPI, campaignId) {
    this.leadsBuffer.push(lead)
    
    if (this.leadsBuffer.length >= this.bufferSize) {
      await this.flushBuffer(instantlyAPI, campaignId)
    }
  }

  // Send buffered leads to Instantly
  async flushBuffer(instantlyAPI, campaignId) {
    if (this.leadsBuffer.length === 0) return

    try {
      console.log(`📦 Sending ${this.leadsBuffer.length} leads to Instantly...`)
      const result = await instantlyAPI.batchAddLeadsToCampaign(campaignId, this.leadsBuffer)
      
      if (result.success > 0) {
        this.gmailLeadsAdded += result.success
        console.log(`✅ Successfully sent ${result.success} leads to Instantly`)
      }
      
      if (result.failed > 0) {
        console.log(`❌ Failed to send ${result.failed} leads to Instantly`)
      }

      // Clear the buffer
      this.leadsBuffer = []
      
    } catch (error) {
      this.logError('Error flushing buffer to Instantly', error)
    }
  }
}

// Gmail filter function
function isGmailEmail(email) {
  if (!email) return false
  const emailLower = email.toLowerCase().trim()
  return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
}

// Database health check for Instantly API
async function ensureInstantlyHealth() {
  const feedback = new ScrapingFeedbackLoop()
  
  try {
    feedback.logInfo('Checking Instantly API health...')
    
    const instantlyAPI = createInstantlyAPI()
    const testResult = await instantlyAPI.testConnection()
    
    if (testResult.success) {
      feedback.logSuccess('Instantly API health check passed')
      return { success: true, api: instantlyAPI }
    } else {
      feedback.logError('Instantly API health check failed', testResult.error)
      return { success: false, error: testResult.error }
    }
    
  } catch (error) {
    feedback.logError('Instantly API health check failed', error)
    return { success: false, error }
  }
}

async function scrapeToInstantly() {
  const feedback = new ScrapingFeedbackLoop()
  
  console.log('ℹ️  🚀 Starting automated n8n repository scraping for 500 Gmail leads to Instantly...');
  
  // Check Instantly API health first
  console.log('ℹ️  Checking Instantly API health...');
  const healthCheck = await ensureInstantlyHealth();
  if (!healthCheck.success) {
    console.error('❌ Instantly API health check failed');
    return;
  }
  console.log('✅ Instantly API health check passed');

  const instantlyAPI = healthCheck.api

  // Get or create campaign
  let campaignId = process.env.INSTANTLY_CAMPAIGN_ID
  if (!campaignId) {
    console.log('ℹ️  No campaign ID provided, creating new campaign...')
    try {
      const campaignData = {
        name: `n8n Gmail Leads - ${new Date().toISOString().split('T')[0]}`,
        description: 'Automatically scraped n8n repository leads with Gmail addresses'
      }
      const newCampaign = await instantlyAPI.createCampaign(campaignData)
      campaignId = newCampaign.id
      console.log(`✅ Created new campaign: ${campaignId}`)
    } catch (error) {
      console.error('❌ Failed to create campaign:', error.message)
      return
    }
  } else {
    console.log(`ℹ️  Using existing campaign: ${campaignId}`)
  }

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
          // Fetch user info to get email
          console.log(`ℹ️  👤 Fetching user info for ${repo.owner.login}...`);
          const userInfo = await getUserInfo(repo.owner.login);
          
          if (!userInfo.email) {
            console.log(`ℹ️  ⏭️  Skipping ${repo.owner.login}/${repo.name} - no email found for ${repo.owner.login}`);
            continue;
          }

          // Check if it's a Gmail email
          if (!isGmailEmail(userInfo.email)) {
            console.log(`ℹ️  ⏭️  Skipping ${repo.owner.login}/${repo.name} - not a Gmail email: ${userInfo.email}`);
            continue;
          }

          // Prepare lead data
          const leadData = {
            github_username: repo.owner.login,
            repo_name: repo.name,
            repo_url: repo.html_url,
            repo_description: repo.description,
            email: userInfo.email,
            last_activity: repo.pushed_at,
            status: 'new'
          };

          // Add to buffer (will be sent to Instantly when buffer is full)
          await feedback.addLeadToBuffer(leadData, instantlyAPI, campaignId)
          feedback.logGmailLeadAdded()
          feedback.logSuccess(`Added Gmail lead: ${repo.owner.login}/${repo.name} (${userInfo.email})`)

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

  // Flush any remaining leads in buffer
  await feedback.flushBuffer(instantlyAPI, campaignId)

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('✅ 🎉 Scraping completed!');
  console.log(`ℹ️  📊 Total repositories processed: ${totalRepositories}`);
  console.log(`ℹ️  📧 Gmail leads added to Instantly: ${feedback.gmailLeadsAdded}`);
  console.log(`ℹ️  🎯 Target reached: ${feedback.isTargetReached() ? 'Yes' : 'No'}`);
  console.log(`ℹ️  📧 Campaign ID: ${campaignId}`);

  // Print detailed report
  feedback.printReport();

  // Final status
  if (feedback.isTargetReached()) {
    console.log('\n🎉 SUCCESS: Target of 500 Gmail leads reached and sent to Instantly!');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Could not reach target of 500 Gmail leads');
    console.log(`📧 Gmail leads added to Instantly: ${feedback.gmailLeadsAdded}/500`);
  }

  console.log('\n✨ Scraping script completed');
}

// Run the scraper
if (require.main === module) {
  scrapeToInstantly()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeToInstantly }
