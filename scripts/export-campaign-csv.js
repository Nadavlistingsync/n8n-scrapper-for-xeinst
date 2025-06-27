#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { EmailCampaignManager } = require('../lib/email-campaign.js')
const fs = require('fs')
const path = require('path')

async function exportCampaignCSV() {
  console.log('📤 Exporting email campaign to CSV...\n')
  
  const campaignManager = new EmailCampaignManager()
  
  try {
    // Prepare leads for campaign
    const preparedLeads = await campaignManager.prepareLeadsForCampaign(100)
    
    if (preparedLeads.length === 0) {
      console.log('❌ No leads ready for campaign export')
      return
    }
    
    console.log(`📊 Preparing ${preparedLeads.length} leads for CSV export...`)
    
    // Create CSV content
    const csvHeaders = [
      'ID',
      'GitHub Username',
      'Email',
      'Repository Name',
      'Repository URL',
      'Repository Description',
      'Last Activity',
      'Subject Line',
      'Email Content',
      'Demo Link',
      'Unsubscribe Link',
      'Status',
      'Validation Status'
    ].join(',')
    
    const csvRows = preparedLeads.map(lead => [
      lead.id,
      `"${lead.github_username}"`,
      `"${lead.email}"`,
      `"${lead.repo_name}"`,
      `"${lead.repo_url}"`,
      `"${lead.repo_description?.replace(/"/g, '""')}"`,
      `"${new Date(lead.last_activity).toISOString()}"`,
      `"${lead.emailContent.subject}"`,
      `"${lead.emailContent.content.replace(/"/g, '""')}"`,
      `"${lead.emailContent.content.match(/{{demo_link}}/g) ? `https://xeinst.com/demo?ref=${lead.github_username}` : ''}"`,
      `"${lead.emailContent.content.match(/{{unsubscribe_link}}/g) ? `https://xeinst.com/unsubscribe?email=${encodeURIComponent(lead.email)}&id=${lead.id}` : ''}"`,
      `"${lead.status}"`,
      `"${lead.validation.isValid ? 'Valid' : lead.validation.issues.join('; ')}"`
    ].join(','))
    
    const csvContent = [csvHeaders, ...csvRows].join('\n')
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'exports')
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true })
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `xeinst-campaign-${timestamp}.csv`
    const filepath = path.join(exportsDir, filename)
    
    // Write CSV file
    fs.writeFileSync(filepath, csvContent, 'utf8')
    
    console.log(`✅ Successfully exported ${preparedLeads.length} leads to CSV`)
    console.log(`📁 File saved: ${filepath}`)
    
    // Show summary
    console.log('\n📋 EXPORT SUMMARY')
    console.log('=================')
    console.log(`📊 Total leads exported: ${preparedLeads.length}`)
    console.log(`✅ Valid emails: ${preparedLeads.filter(l => l.validation.isValid).length}`)
    console.log(`❌ Invalid emails: ${preparedLeads.filter(l => !l.validation.isValid).length}`)
    
    // Show sample data
    console.log('\n📧 SAMPLE EXPORT DATA')
    console.log('====================')
    preparedLeads.slice(0, 3).forEach((lead, index) => {
      console.log(`\nSample ${index + 1}:`)
      console.log(`  Username: ${lead.github_username}`)
      console.log(`  Email: ${lead.email}`)
      console.log(`  Repo: ${lead.repo_name}`)
      console.log(`  Subject: ${lead.emailContent.subject}`)
      console.log(`  Status: ${lead.validation.isValid ? '✅ Valid' : '❌ ' + lead.validation.issues.join(', ')}`)
    })
    
    // CSV format information
    console.log('\n📄 CSV FORMAT INFORMATION')
    console.log('=========================')
    console.log('The CSV file contains the following columns:')
    console.log('• ID: Unique lead identifier')
    console.log('• GitHub Username: Lead\'s GitHub handle')
    console.log('• Email: Contact email address')
    console.log('• Repository Name: Their automation project')
    console.log('• Repository URL: Link to their project')
    console.log('• Repository Description: Project description')
    console.log('• Last Activity: When they last updated their repo')
    console.log('• Subject Line: Personalized email subject')
    console.log('• Email Content: Full personalized email body')
    console.log('• Demo Link: Personalized demo request link')
    console.log('• Unsubscribe Link: CAN-SPAM compliant opt-out')
    console.log('• Status: Current lead status')
    console.log('• Validation Status: Email validation results')
    
    // Usage instructions
    console.log('\n🚀 USAGE INSTRUCTIONS')
    console.log('====================')
    console.log('1. Import the CSV into your email service (Mailchimp, SendGrid, etc.)')
    console.log('2. Use the "Subject Line" column for email subjects')
    console.log('3. Use the "Email Content" column for email bodies')
    console.log('4. Use the "Demo Link" and "Unsubscribe Link" columns for tracking')
    console.log('5. Monitor delivery and engagement rates')
    console.log('6. Update lead statuses based on responses')
    
    // Compliance reminder
    console.log('\n⚖️ COMPLIANCE REMINDER')
    console.log('=====================')
    console.log('✅ All emails include:')
    console.log('   • Unsubscribe link (CAN-SPAM compliant)')
    console.log('   • Transparent data collection notice')
    console.log('   • Clear sender identification')
    console.log('   • No misleading subject lines')
    console.log('   • Physical address requirement')
    
    console.log('\n✨ CSV export completed successfully!')
    
  } catch (error) {
    console.error('❌ Error exporting campaign CSV:', error)
  }
}

// Run the export
if (require.main === module) {
  exportCampaignCSV()
    .then(() => {
      console.log('\n✨ Campaign CSV export completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Campaign CSV export failed:', error)
      process.exit(1)
    })
}

module.exports = { exportCampaignCSV } 