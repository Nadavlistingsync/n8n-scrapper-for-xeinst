#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { syncToGoogleSheets } = require('../lib/google-sheets-api')
const { getAllLeads, getAnalytics } = require('../lib/google-sheets-db')

async function syncToGoogleSheetsManual() {
  console.log('🔄 Manual Sync to Google Sheets')
  console.log('===============================\n')
  
  try {
    // Check if API is configured
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH
    
    if (!spreadsheetId || !credentialsPath) {
      console.log('❌ Google Sheets API not configured')
      console.log('Please set up the API first:')
      console.log('1. Follow the guide: GOOGLE_SHEETS_API_SETUP.md')
      console.log('2. Add to .env.local:')
      console.log('   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id')
      console.log('   GOOGLE_SHEETS_CREDENTIALS_PATH=google-credentials.json')
      process.exit(1)
    }
    
    // Get all data
    console.log('📊 Fetching data from local database...')
    const leads = await getAllLeads()
    const analytics = await getAnalytics()
    
    if (leads.length === 0) {
      console.log('⚠️ No leads found in database')
      console.log('Please run some scraping first: node scripts/scrape.js')
      process.exit(1)
    }
    
    console.log(`✅ Found ${leads.length} leads`)
    console.log(`📈 Analytics: ${analytics.total} total, ${analytics.withEmail} with emails`)
    
    // Sync to Google Sheets
    console.log('\n🔄 Syncing to Google Sheets...')
    const success = await syncToGoogleSheets(leads, analytics)
    
    if (success) {
      console.log('\n🎉 Sync completed successfully!')
      console.log('===============================')
      console.log(`📊 Total leads synced: ${leads.length}`)
      console.log(`📧 Email campaigns: ${leads.filter(l => l.email && !l.email_sent && l.email_approved).length}`)
      console.log(`📈 Analytics updated`)
      console.log(`💾 Backup created (if needed)`)
      
      console.log('\n📋 What was synced:')
      console.log('==================')
      console.log('✅ Leads sheet - Complete lead data')
      console.log('✅ Email Campaigns sheet - Ready for outreach')
      console.log('✅ Analytics sheet - Performance metrics')
      console.log('✅ Backup sheet - Historical snapshot')
      
      console.log('\n🔗 View your data:')
      console.log('=================')
      console.log(`📊 Spreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)
      
    } else {
      console.log('❌ Sync failed')
      console.log('Please check:')
      console.log('1. Your credentials file is valid')
      console.log('2. Spreadsheet is shared with service account')
      console.log('3. Google Sheets API is enabled')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Run sync
syncToGoogleSheetsManual()
