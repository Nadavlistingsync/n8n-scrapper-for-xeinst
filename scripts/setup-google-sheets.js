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

async function setupGoogleSheets() {
  console.log('🚀 Google Sheets Integration Setup')
  console.log('==================================\n')

  console.log('This script will help you set up Google Sheets integration.')
  console.log('You\'ll need to create a Google Cloud project and service account.\n')

  const hasCredentials = fs.existsSync(path.join(__dirname, '..', 'google-credentials.json'))
  
  if (hasCredentials) {
    console.log('✅ Google credentials file found!')
    const useExisting = await question('Do you want to use the existing credentials? (y/n): ')
    
    if (useExisting.toLowerCase() === 'y') {
      console.log('\n✅ Using existing credentials')
      console.log('\n📋 Next steps:')
      console.log('1. Run: node scripts/export-to-google-sheets.js')
      console.log('2. Follow the setup guide: GOOGLE_SHEETS_SETUP.md')
      rl.close()
      return
    }
  }

  console.log('\n📋 SETUP STEPS:')
  console.log('===============')
  console.log('1. Go to https://console.cloud.google.com/')
  console.log('2. Create a new project or select existing one')
  console.log('3. Enable Google Sheets API')
  console.log('4. Create a Service Account')
  console.log('5. Download the JSON credentials file')
  console.log('6. Save it as "google-credentials.json" in the project root\n')

  const ready = await question('Have you completed the setup steps above? (y/n): ')
  
  if (ready.toLowerCase() !== 'y') {
    console.log('\n❌ Please complete the setup steps first.')
    console.log('📖 See GOOGLE_SHEETS_SETUP.md for detailed instructions.')
    rl.close()
    return
  }

  // Check if credentials file exists
  const credentialsPath = path.join(__dirname, '..', 'google-credentials.json')
  
  if (!fs.existsSync(credentialsPath)) {
    console.log('\n❌ google-credentials.json not found!')
    console.log('Please download the JSON file from Google Cloud Console and save it as "google-credentials.json" in the project root.')
    rl.close()
    return
  }

  // Validate JSON format
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    
    if (!credentials.client_email || !credentials.private_key) {
      console.log('\n❌ Invalid credentials file!')
      console.log('The JSON file should contain client_email and private_key fields.')
      rl.close()
      return
    }

    console.log('\n✅ Valid credentials file found!')
    console.log(`📧 Service account email: ${credentials.client_email}`)
    
  } catch (error) {
    console.log('\n❌ Invalid JSON file!')
    console.log('Please check that the credentials file is valid JSON.')
    rl.close()
    return
  }

  // Check environment variables
  console.log('\n🔧 Checking environment variables...')
  
  const requiredVars = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  let missingVars = []
  
  Object.entries(requiredVars).forEach(([varName, value]) => {
    if (value) {
      console.log(`✅ ${varName}: Set`)
    } else {
      console.log(`❌ ${varName}: Missing`)
      missingVars.push(varName)
    }
  })

  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing environment variables:')
    console.log('==================================')
    console.log('Please add these to your .env.local file:')
    console.log('')
    
    missingVars.forEach(varName => {
      console.log(`${varName}=your_value_here`)
    })
    
    console.log('\n📖 See SETUP.md for instructions on getting these values.')
    rl.close()
    return
  }

  console.log('\n✅ All environment variables are set!')

  // Test connection
  console.log('\n🧪 Testing connection...')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data, error } = await supabase
      .from('leads')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message)
      rl.close()
      return
    }
    
    console.log('✅ Supabase connection successful!')
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
    rl.close()
    return
  }

  // Success!
  console.log('\n🎉 Setup completed successfully!')
  console.log('================================')
  console.log('\n📋 NEXT STEPS:')
  console.log('==============')
  console.log('1. Run the export script:')
  console.log('   node scripts/export-to-google-sheets.js')
  console.log('')
  console.log('2. The script will:')
  console.log('   • Create a new Google Spreadsheet')
  console.log('   • Export all your leads data')
  console.log('   • Generate email campaign data')
  console.log('   • Create analytics dashboard')
  console.log('')
  console.log('3. After the first export:')
  console.log('   • Share the spreadsheet with your team')
  console.log('   • Set up automated exports if needed')
  console.log('   • Configure notifications')
  console.log('')
  console.log('📖 For detailed instructions, see: GOOGLE_SHEETS_SETUP.md')
  console.log('🔧 For troubleshooting, see the setup guide')

  const runNow = await question('\nDo you want to run the export now? (y/n): ')
  
  if (runNow.toLowerCase() === 'y') {
    console.log('\n🚀 Running export...')
    rl.close()
    
    // Run the export script
    const { spawn } = require('child_process')
    const exportProcess = spawn('node', ['scripts/export-to-google-sheets.js'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
    
    exportProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Export completed successfully!')
      } else {
        console.log('\n❌ Export failed with code:', code)
      }
    })
  } else {
    console.log('\n✅ Setup completed! Run the export when you\'re ready.')
    rl.close()
  }
}

// Run the setup
if (require.main === module) {
  setupGoogleSheets()
    .catch((error) => {
      console.error('\n💥 Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupGoogleSheets } 