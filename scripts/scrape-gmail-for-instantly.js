#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { searchN8nRepositories, getUserInfo, isActiveRepository, isValidN8nRepo } = require('../lib/github.js')
const fs = require('fs')
const path = require('path')

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
    this.leads = []
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

  addLead(lead) {
    this.leads.push(lead)
    this.logGmailLeadAdded()
  }

  exportLeads() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dataDir = path.join(process.cwd(), 'data')
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Export as CSV for Instantly import
    const csvPath = path.join(dataDir, `instantly-gmail-leads-${timestamp}.csv`)
    const csvContent = this.generateCSV()
    fs.writeFileSync(csvPath, csvContent)

    // Export as JSON for backup
    const jsonPath = path.join(dataDir, `instantly-gmail-leads-${timestamp}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(this.leads, null, 2))

    // Export as simple email list
    const emailPath = path.join(dataDir, `instantly-gmail-emails-${timestamp}.txt`)
    const emailContent = this.leads.map(lead => lead.email).join('\n')
    fs.writeFileSync(emailPath, emailContent)

    return {
      csv: csvPath,
      json: jsonPath,
      emails: emailPath,
      count: this.leads.length
    }
  }

  generateCSV() {
    const headers = [
      'email',
      'first_name',
      'last_name',
      'company',
      'website',
      'linkedin_url',
      'phone',
      'github_username',
      'repo_name',
      'repo_description',
      'last_activity',
      'status'
    ]

    const csvRows = [headers.join(',')]
    
    this.leads.forEach(lead => {
      const row = [
        lead.email,
        lead.github_username || '',
        '',
        '',
        lead.repo_url || '',
        '',
        '',
        lead.github_username || '',
        lead.repo_name || '',
        (lead.repo_description || '').replace(/"/g, '""'),
        lead.last_activity || '',
        lead.status || 'new'
      ].map(field => `"${field}"`)
      
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }
}

// Gmail filter function
function isGmailEmail(email) {
  if (!email) return false
  const emailLower = email.toLowerCase().trim()
  return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
}

async function scrapeGmailForInstantly() {
  const feedback = new ScrapingFeedbackLoop()
  
  console.log('ℹ️  🚀 Starting automated n8n repository scraping for 500 Gmail leads...');
  console.log('ℹ️  📧 Leads will be exported in formats ready for Instantly import');

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

          feedback.addLead(leadData)
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

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('✅ 🎉 Scraping completed!');
  console.log(`ℹ️  📊 Total repositories processed: ${totalRepositories}`);
  console.log(`ℹ️  📧 Gmail leads collected: ${feedback.gmailLeadsAdded}`);

  // Export leads
  console.log('\n📤 Exporting leads for Instantly import...');
  const exportResults = feedback.exportLeads()
  
  console.log(`✅ CSV exported: ${exportResults.csv} (${exportResults.count} leads)`)
  console.log(`✅ JSON backup: ${exportResults.json}`)
  console.log(`✅ Email list: ${exportResults.emails}`)

  // Print detailed report
  feedback.printReport();

  // Final status
  if (feedback.isTargetReached()) {
    console.log('\n🎉 SUCCESS: Target of 500 Gmail leads reached!');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Could not reach target of 500 Gmail leads');
    console.log(`📧 Gmail leads collected: ${feedback.gmailLeadsAdded}/500`);
  }

  console.log('\n📋 NEXT STEPS:')
  console.log('1. Import the CSV file into Instantly:')
  console.log(`   📁 ${exportResults.csv}`)
  console.log('2. Or use the email list for manual import')
  console.log('3. Check the JSON file for complete lead data')

  console.log('\n✨ Scraping script completed');
}

// Run the scraper
if (require.main === module) {
  scrapeGmailForInstantly()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeGmailForInstantly }
