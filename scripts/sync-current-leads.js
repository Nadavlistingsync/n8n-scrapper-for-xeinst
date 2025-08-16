#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getAllLeads, getAnalytics } = require('../lib/google-sheets-db')
const { initializeGoogleSheetsAPI } = require('../lib/google-sheets-api')

async function syncCurrentLeads() {
  console.log('🔄 Syncing Current Leads to Google Sheets')
  console.log('=========================================\n')
  
  try {
    // Step 1: Get current leads
    console.log('1️⃣ Fetching current leads...')
    const leads = await getAllLeads()
    
    if (leads.length === 0) {
      console.log('❌ No leads found in the system')
      console.log('Please run some scraping first')
      process.exit(1)
    }
    
    console.log(`✅ Found ${leads.length} leads to sync`)
    
    // Step 2: Initialize Google Sheets API
    console.log('\n2️⃣ Initializing Google Sheets API...')
    const sheetsAPI = await initializeGoogleSheetsAPI()
    console.log('✅ Google Sheets API initialized successfully')
    
    // Step 3: Sync simplified leads (email + github_username only)
    console.log('\n3️⃣ Syncing simplified leads to Google Sheets...')
    
    // Filter to only Gmail emails
    const gmailLeads = leads.filter(lead => {
      if (!lead.email) return false
      const emailLower = lead.email.toLowerCase().trim()
      return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
    })
    
    console.log(`📧 Found ${gmailLeads.length} Gmail emails out of ${leads.length} total leads`)
    
    // Create simplified data with only Gmail email and github_username
    const simplifiedLeads = gmailLeads.map(lead => ({
      email: lead.email,
      github_username: lead.github_username
    }))
    
    // Prepare headers for the simplified sheet
    const headers = ['Email', 'GitHub Username']
    
    // Prepare data rows
    const dataRows = simplifiedLeads.map(lead => [
      lead.email,
      lead.github_username
    ])
    
    // Combine headers and data
    const sheetData = [headers, ...dataRows]
    
    // Sync to Google Sheets using the API method
    await sheetsAPI.syncLeads(leads)
    
    console.log(`✅ Synced ${leads.length} leads to Google Sheets`)
    console.log('✅ Successfully synced simplified leads to Google Sheets')
    
    // Step 4: Show summary
    console.log('\n🎉 Sync completed successfully!')
    console.log('===============================')
    console.log(`📊 Total leads: ${leads.length}`)
    console.log(`📧 Gmail emails synced: ${gmailLeads.length}`)
    console.log(`📊 View at: ${sheetsAPI.getSpreadsheetUrl()}`)
    
    console.log('\n📋 Next Steps:')
    console.log('==============')
    console.log('1. Open your Google Sheet to see the simplified data')
    console.log('2. Run scraping again - it will auto-sync')
    console.log('3. Use the web interface to manage leads')
    
  } catch (error) {
    console.error('❌ Error syncing leads:', error.message)
    if (error.code === 'ENOENT') {
      console.log('\n💡 Make sure you have:')
      console.log('1. Created a Google Sheet')
      console.log('2. Set GOOGLE_SHEETS_SPREADSHEET_ID in .env.local')
      console.log('3. Placed google-credentials.json in the project root')
    }
    process.exit(1)
  }
}

// Run the sync
syncCurrentLeads().then(() => {
  console.log('\n✨ Sync script completed')
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
