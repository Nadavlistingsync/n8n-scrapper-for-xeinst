#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

// Import the new Google Sheets database functions
const {
  getAllLeads,
  exportToCSV,
  getAnalytics
} = require('../lib/google-sheets-db')

async function exportToGoogleSheetsSimple() {
  console.log('📤 Exporting Data to Google Sheets Format')
  console.log('=========================================\n')
  
  try {
    // Get all leads
    console.log('📊 Fetching all leads...')
    const leads = await getAllLeads()
    
    if (leads.length === 0) {
      console.log('❌ No leads found in the system')
      console.log('Please run some scraping first or migrate from Supabase')
      process.exit(1)
    }
    
    console.log(`✅ Found ${leads.length} leads`)
    
    // Export to CSV
    console.log('\n💾 Creating CSV export...')
    const csvFile = await exportToCSV()
    
    // Get analytics
    console.log('\n📈 Generating analytics...')
    const analytics = await getAnalytics()
    
    // Create Google Sheets ready files
    const timestamp = new Date().toISOString().split('T')[0]
    const dataDir = path.join(__dirname, '..', 'data')
    
    // 1. Main leads data
    console.log('\n📋 Creating Google Sheets ready files...')
    
    // 2. Email campaign data
    const emailLeads = leads.filter(lead => 
      lead.email && 
      !lead.email_sent && 
      lead.email_approved === true &&
      lead.status === 'new'
    )
    
    const emailHeaders = [
      'Email',
      'GitHub Username', 
      'Repository Name',
      'Repository URL',
      'Description',
      'Last Activity',
      'AI Score',
      'AI Recommendation'
    ]
    
    const emailData = emailLeads.map(lead => [
      lead.email,
      lead.github_username,
      lead.repo_name,
      lead.repo_url,
      lead.repo_description || '',
      lead.last_activity,
      lead.ai_score?.toString() || '',
      lead.ai_recommendation || ''
    ])
    
    const emailCsvContent = [
      emailHeaders.join(','),
      ...emailData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const emailCsvFile = path.join(dataDir, `email-campaign-${timestamp}.csv`)
    fs.writeFileSync(emailCsvFile, emailCsvContent)
    
    // 3. Analytics summary
    const analyticsHeaders = [
      'Metric',
      'Value'
    ]
    
    const analyticsData = [
      ['Total Leads', analytics.total],
      ['With Emails', analytics.withEmail],
      ['Email Sent', analytics.emailSent],
      ['Email Approved', analytics.emailApproved],
      ['AI Analyzed', analytics.aiAnalyzed],
      ['Status - New', analytics.byStatus.new],
      ['Status - Contacted', analytics.byStatus.contacted],
      ['Status - Responded', analytics.byStatus.responded],
      ['Status - Converted', analytics.byStatus.converted],
      ['AI - Approve', analytics.aiRecommendations.approve],
      ['AI - Reject', analytics.aiRecommendations.reject],
      ['AI - Review', analytics.aiRecommendations.review]
    ]
    
    const analyticsCsvContent = [
      analyticsHeaders.join(','),
      ...analyticsData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const analyticsCsvFile = path.join(dataDir, `analytics-${timestamp}.csv`)
    fs.writeFileSync(analyticsCsvFile, analyticsCsvContent)
    
    // 4. Simple email list
    const emailsOnly = leads
      .filter(lead => lead.email)
      .map(lead => lead.email)
      .filter((email, index, arr) => arr.indexOf(email) === index) // Remove duplicates
    
    const emailsOnlyFile = path.join(dataDir, `emails-only-${timestamp}.txt`)
    fs.writeFileSync(emailsOnlyFile, emailsOnly.join('\n'))
    
    // 5. Emails with names
    const emailsWithNames = leads
      .filter(lead => lead.email)
      .map(lead => `${lead.email},${lead.github_username}`)
      .filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates
    
    const emailsWithNamesFile = path.join(dataDir, `emails-with-names-${timestamp}.txt`)
    fs.writeFileSync(emailsWithNamesFile, emailsWithNames.join('\n'))
    
    console.log('\n🎉 Export completed successfully!')
    console.log('================================')
    console.log(`📊 Main data: ${csvFile}`)
    console.log(`📧 Email campaign: ${emailCsvFile}`)
    console.log(`📈 Analytics: ${analyticsCsvFile}`)
    console.log(`📧 Emails only: ${emailsOnlyFile}`)
    console.log(`👤 Emails with names: ${emailsWithNamesFile}`)
    
    console.log('\n📋 How to import to Google Sheets:')
    console.log('==================================')
    console.log('1. Go to https://sheets.google.com')
    console.log('2. Create a new spreadsheet')
    console.log('3. For each file:')
    console.log('   - Go to File > Import > Upload')
    console.log('   - Select the CSV file')
    console.log('   - Choose "Replace current sheet" or "Insert new sheet"')
    console.log('   - Click "Import data"')
    
    console.log('\n📊 Summary:')
    console.log('==========')
    console.log(`Total leads: ${analytics.total}`)
    console.log(`Ready for email campaign: ${emailLeads.length}`)
    console.log(`Unique emails: ${emailsOnly.length}`)
    console.log(`AI analyzed: ${analytics.aiAnalyzed}`)
    
    // Create a summary file
    const summary = {
      exportDate: new Date().toISOString(),
      totalLeads: analytics.total,
      emailCampaignReady: emailLeads.length,
      uniqueEmails: emailsOnly.length,
      aiAnalyzed: analytics.aiAnalyzed,
      files: {
        mainData: csvFile,
        emailCampaign: emailCsvFile,
        analytics: analyticsCsvFile,
        emailsOnly: emailsOnlyFile,
        emailsWithNames: emailsWithNamesFile
      }
    }
    
    const summaryFile = path.join(dataDir, `export-summary-${timestamp}.json`)
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2))
    
    console.log(`\n📄 Export summary saved to: ${summaryFile}`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

// Run export
exportToGoogleSheetsSimple()
