#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupGoogleSheetsAPI() {
  console.log('🔗 Google Sheets API Setup')
  console.log('=========================\n')
  
  console.log('This script will help you set up Google Sheets API integration.')
  console.log('Follow the steps to enable automated sync to Google Sheets.\n')
  
  // Check if already configured
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH
  
  if (spreadsheetId && credentialsPath && fs.existsSync(credentialsPath)) {
    console.log('✅ Google Sheets API appears to be already configured!')
    console.log(`   Spreadsheet ID: ${spreadsheetId}`)
    console.log(`   Credentials: ${credentialsPath}`)
    
    const testNow = await question('\nWould you like to test the connection now? (y/n): ')
    if (testNow.toLowerCase() === 'y') {
      rl.close()
      console.log('\n🧪 Running connection test...')
      require('./test-google-sheets-api.js')
      return
    }
  }
  
  console.log('📋 SETUP STEPS:')
  console.log('===============')
  console.log('1. Create Google Cloud Project')
  console.log('2. Enable Google Sheets API')
  console.log('3. Create Service Account')
  console.log('4. Download credentials JSON')
  console.log('5. Create Google Sheet')
  console.log('6. Share with service account')
  console.log('7. Configure environment variables\n')
  
  const ready = await question('Have you completed steps 1-6 above? (y/n): ')
  
  if (ready.toLowerCase() !== 'y') {
    console.log('\n📖 Please complete the setup steps first.')
    console.log('📖 See GOOGLE_SHEETS_API_SETUP.md for detailed instructions.')
    rl.close()
    return
  }
  
  // Step 7: Configure environment variables
  console.log('\n🔧 Step 7: Configure Environment Variables')
  console.log('==========================================')
  
  // Get spreadsheet ID
  const newSpreadsheetId = await question('Enter your Google Spreadsheet ID: ')
  if (!newSpreadsheetId || newSpreadsheetId.trim() === '') {
    console.log('❌ Spreadsheet ID is required')
    rl.close()
    return
  }
  
  // Check credentials file
  const defaultCredentialsPath = 'google-credentials.json'
  const credentialsFile = await question(`Enter path to credentials file (default: ${defaultCredentialsPath}): `)
  const finalCredentialsPath = credentialsFile.trim() || defaultCredentialsPath
  
  if (!fs.existsSync(finalCredentialsPath)) {
    console.log(`❌ Credentials file not found: ${finalCredentialsPath}`)
    console.log('Please download the JSON credentials file from Google Cloud Console')
    rl.close()
    return
  }
  
  // Validate credentials file
  try {
    const credentials = JSON.parse(fs.readFileSync(finalCredentialsPath, 'utf8'))
    if (!credentials.client_email || !credentials.private_key) {
      console.log('❌ Invalid credentials file format')
      console.log('Please download a valid service account JSON file')
      rl.close()
      return
    }
    console.log(`✅ Credentials file valid - Service Account: ${credentials.client_email}`)
  } catch (error) {
    console.log('❌ Invalid JSON in credentials file')
    rl.close()
    return
  }
  
  // Update .env.local
  console.log('\n📝 Updating .env.local file...')
  const envPath = '.env.local'
  let envContent = ''
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }
  
  // Remove existing Google Sheets config
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('GOOGLE_SHEETS_'))
    .join('\n')
  
  // Add new config
  envContent += `\n# Google Sheets API Configuration\n`
  envContent += `GOOGLE_SHEETS_SPREADSHEET_ID=${newSpreadsheetId}\n`
  envContent += `GOOGLE_SHEETS_CREDENTIALS_PATH=${finalCredentialsPath}\n`
  
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Updated .env.local file')
  
  // Add credentials to .gitignore
  console.log('\n🔒 Adding credentials to .gitignore...')
  const gitignorePath = '.gitignore'
  let gitignoreContent = ''
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
  }
  
  if (!gitignoreContent.includes('google-credentials.json')) {
    gitignoreContent += '\n# Google Sheets API Credentials\ngoogle-credentials.json\n'
    fs.writeFileSync(gitignorePath, gitignoreContent)
    console.log('✅ Added credentials to .gitignore')
  } else {
    console.log('✅ Credentials already in .gitignore')
  }
  
  // Test the setup
  console.log('\n🧪 Testing the setup...')
  const testSetup = await question('Would you like to test the connection now? (y/n): ')
  
  if (testSetup.toLowerCase() === 'y') {
    rl.close()
    console.log('\n🧪 Running connection test...')
    
    // Set environment variables for the test
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = newSpreadsheetId
    process.env.GOOGLE_SHEETS_CREDENTIALS_PATH = finalCredentialsPath
    
    // Run the test
    require('./test-google-sheets-api.js')
  } else {
    console.log('\n🎉 Setup completed!')
    console.log('==================')
    console.log('✅ Environment variables configured')
    console.log('✅ Credentials file validated')
    console.log('✅ .gitignore updated')
    console.log(`📊 Spreadsheet ID: ${newSpreadsheetId}`)
    console.log(`🔑 Credentials: ${finalCredentialsPath}`)
    
    console.log('\n📋 Next Steps:')
    console.log('==============')
    console.log('1. Test the connection: node scripts/test-google-sheets-api.js')
    console.log('2. Sync your data: node scripts/sync-to-google-sheets.js')
    console.log('3. Start scraping - data will auto-sync to Google Sheets')
    
    rl.close()
  }
}

// Run setup
setupGoogleSheetsAPI().catch(console.error)
