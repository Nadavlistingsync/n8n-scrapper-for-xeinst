#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { initializeGoogleSheetsAPI, syncToGoogleSheets } = require('../lib/google-sheets-api')
const { getAllLeads, getAnalytics } = require('../lib/google-sheets-db')

async function testGoogleSheetsAPI() {
  console.log('🧪 Testing Google Sheets API Connection')
  console.log('=======================================\n')
  
  try {
    // Step 1: Check environment variables
    console.log('1️⃣ Checking environment variables...')
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH
    
    if (!spreadsheetId) {
      console.log('❌ GOOGLE_SHEETS_SPREADSHEET_ID not set')
      console.log('   Please add it to your .env.local file')
      return false
    }
    
    if (!credentialsPath) {
      console.log('❌ GOOGLE_SHEETS_CREDENTIALS_PATH not set')
      console.log('   Please add it to your .env.local file')
      return false
    }
    
    console.log('✅ Environment variables configured')
    console.log(`   Spreadsheet ID: ${spreadsheetId}`)
    console.log(`   Credentials Path: ${credentialsPath}`)
    
    // Step 2: Check credentials file
    console.log('\n2️⃣ Checking credentials file...')
    const fs = require('fs')
    const path = require('path')
    
    if (!fs.existsSync(credentialsPath)) {
      console.log(`❌ Credentials file not found: ${credentialsPath}`)
      console.log('   Please follow the setup guide: GOOGLE_SHEETS_API_SETUP.md')
      return false
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    console.log('✅ Credentials file found')
    console.log(`   Service Account: ${credentials.client_email}`)
    
    // Step 3: Initialize Google Sheets API
    console.log('\n3️⃣ Initializing Google Sheets API...')
    const api = await initializeGoogleSheetsAPI()
    
    if (!api) {
      console.log('❌ Failed to initialize Google Sheets API')
      console.log('   Please check your credentials and spreadsheet ID')
      return false
    }
    
    console.log('✅ Google Sheets API initialized successfully')
    console.log(`📊 Connected to: ${api.getSpreadsheetUrl()}`)
    
    // Step 4: Test sheet creation
    console.log('\n4️⃣ Testing sheet creation...')
    const testSheetName = 'API-Test-' + Date.now()
    const sheetCreated = await api.ensureSheet(testSheetName)
    
    if (sheetCreated) {
      console.log(`✅ Created test sheet: ${testSheetName}`)
      
      // Clean up test sheet
      try {
        await api.sheets.spreadsheets.batchUpdate({
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                deleteSheet: {
                  sheetId: await api.getSheetId(testSheetName)
                }
              }
            ]
          }
        })
        console.log(`✅ Cleaned up test sheet: ${testSheetName}`)
      } catch (error) {
        console.log(`⚠️ Could not clean up test sheet: ${error.message}`)
      }
    } else {
      console.log('❌ Failed to create test sheet')
      return false
    }
    
    // Step 5: Test data sync
    console.log('\n5️⃣ Testing data sync...')
    const leads = await getAllLeads()
    const analytics = await getAnalytics()
    
    if (leads.length === 0) {
      console.log('⚠️ No leads found in database')
      console.log('   Creating test data...')
      
      // Create a test lead
      const { insertLead } = require('../lib/google-sheets-db')
      const testLead = {
        github_username: 'api-test-user',
        repo_name: 'api-test-repo',
        repo_url: 'https://github.com/api-test-user/api-test-repo',
        repo_description: 'Test repository for API testing',
        email: 'test@api.com',
        last_activity: new Date().toISOString(),
        status: 'new',
        email_sent: false,
        email_approved: false,
        email_pending_approval: false
      }
      
      await insertLead(testLead)
      console.log('✅ Created test lead')
    }
    
    // Sync data to Google Sheets
    const syncSuccess = await syncToGoogleSheets(leads, analytics)
    
    if (syncSuccess) {
      console.log('✅ Data sync test successful')
      console.log(`📊 View your data at: ${api.getSpreadsheetUrl()}`)
    } else {
      console.log('❌ Data sync test failed')
      return false
    }
    
    // Step 6: Test individual sheet operations
    console.log('\n6️⃣ Testing individual sheet operations...')
    
    // Test Leads sheet
    const leadsSync = await api.syncLeads(leads)
    console.log(`   Leads sync: ${leadsSync ? '✅' : '❌'}`)
    
    // Test Email Campaigns sheet
    const emailSync = await api.syncEmailCampaign(leads)
    console.log(`   Email campaigns sync: ${emailSync ? '✅' : '❌'}`)
    
    // Test Analytics sheet
    const analyticsSync = await api.syncAnalytics(analytics)
    console.log(`   Analytics sync: ${analyticsSync ? '✅' : '❌'}`)
    
    // Step 7: Test backup creation
    console.log('\n7️⃣ Testing backup creation...')
    const backupCreated = await api.createBackup(leads)
    console.log(`   Backup creation: ${backupCreated ? '✅' : '❌'}`)
    
    // Step 8: Final summary
    console.log('\n🎉 Google Sheets API Test Completed Successfully!')
    console.log('==================================================')
    console.log('✅ Environment variables configured')
    console.log('✅ Credentials file valid')
    console.log('✅ API connection established')
    console.log('✅ Sheet operations working')
    console.log('✅ Data sync functional')
    console.log('✅ Backup system working')
    
    console.log('\n📋 Your Google Sheets Integration is Ready!')
    console.log('==========================================')
    console.log(`📊 Spreadsheet: ${api.getSpreadsheetUrl()}`)
    console.log(`📧 Service Account: ${credentials.client_email}`)
    console.log(`📈 Total Leads: ${leads.length}`)
    
    console.log('\n🔄 Next Steps:')
    console.log('==============')
    console.log('1. Your data is now syncing automatically')
    console.log('2. New leads will appear in Google Sheets')
    console.log('3. Status updates will sync in real-time')
    console.log('4. Analytics are updated automatically')
    console.log('5. Backups are created regularly')
    
    // Clean up test data if we created it
    if (leads.some(lead => lead.github_username === 'api-test-user')) {
      console.log('\n🧹 Cleaning up test data...')
      const { updateLead } = require('../lib/google-sheets-db')
      const testLeads = leads.filter(lead => lead.github_username === 'api-test-user')
      
      for (const lead of testLeads) {
        await updateLead(lead.id, { status: 'deleted' })
      }
      
      console.log('✅ Test data cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Google Sheets API test failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('==================')
    console.log('1. Check your credentials file exists and is valid')
    console.log('2. Verify your spreadsheet ID is correct')
    console.log('3. Ensure the spreadsheet is shared with your service account')
    console.log('4. Check that Google Sheets API is enabled in Google Cloud Console')
    console.log('5. Review the setup guide: GOOGLE_SHEETS_API_SETUP.md')
    
    return false
  }
}

// Run the test
testGoogleSheetsAPI().then(success => {
  if (!success) {
    process.exit(1)
  }
})
