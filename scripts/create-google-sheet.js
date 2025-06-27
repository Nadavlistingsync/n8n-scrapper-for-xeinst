#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

async function getGoogleAuthClient() {
  try {
    // Use environment variables for Google Service Account
    const credentials = {
      type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
      auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI,
      token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
      universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
    }

    // Validate required credentials
    if (!credentials.private_key || !credentials.client_email) {
      console.error('❌ Missing required Google Service Account credentials!')
      console.log('📋 Please add the following to your .env file:')
      console.log('GOOGLE_SERVICE_ACCOUNT_TYPE=service_account')
      console.log('GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your_project_id')
      console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_private_key_id')
      console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
      console.log('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com')
      console.log('GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=your_client_id')
      console.log('GOOGLE_SERVICE_ACCOUNT_AUTH_URI=https://accounts.google.com/o/oauth2/auth')
      console.log('GOOGLE_SERVICE_ACCOUNT_TOKEN_URI=https://oauth2.googleapis.com/token')
      console.log('GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs')
      console.log('GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_service_account_email%40project.iam.gserviceaccount.com')
      console.log('GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN=googleapis.com')
      process.exit(1)
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    })

    return auth
  } catch (error) {
    console.error('❌ Error setting up Google Auth:', error)
    process.exit(1)
  }
}

async function createGoogleSheet() {
  try {
    console.log('🚀 Creating new Google Sheet...')
    
    // Setup Google Auth
    const auth = await getGoogleAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })
    
    const title = `Xeinst Data Export - ${new Date().toISOString().split('T')[0]}`
    
    const resource = {
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'NotionMigrationData',
            gridProperties: {
              rowCount: 10000,
              columnCount: 15,
            },
          },
        },
        {
          properties: {
            title: 'EmailCampaignData',
            gridProperties: {
              rowCount: 10000,
              columnCount: 12,
            },
          },
        },
        {
          properties: {
            title: 'XeinstCampaignData',
            gridProperties: {
              rowCount: 10000,
              columnCount: 10,
            },
          },
        },
        {
          properties: {
            title: 'EmailLists',
            gridProperties: {
              rowCount: 10000,
              columnCount: 5,
            },
          },
        },
        {
          properties: {
            title: 'Analytics',
            gridProperties: {
              rowCount: 100,
              columnCount: 10,
            },
          },
        },
      ],
    }

    const response = await sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId,spreadsheetUrl',
    })

    const spreadsheetId = response.data.spreadsheetId
    const spreadsheetUrl = response.data.spreadsheetUrl

    console.log('✅ Google Sheet created successfully!')
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`)
    console.log(`🔗 Spreadsheet URL: ${spreadsheetUrl}`)
    
    // Save the spreadsheet ID to a file
    const fs = require('fs')
    const config = {
      spreadsheetId,
      spreadsheetUrl,
      createdDate: new Date().toISOString(),
      title
    }
    
    fs.writeFileSync('google-sheet-config.json', JSON.stringify(config, null, 2))
    console.log('💾 Configuration saved to google-sheet-config.json')
    
    // Also save to .env format for easy copying
    console.log('\n📋 Add this to your .env file:')
    console.log(`GOOGLE_SPREADSHEET_ID=${spreadsheetId}`)
    
    return spreadsheetId
    
  } catch (error) {
    console.error('❌ Error creating Google Sheet:', error)
    
    if (error.code === 403) {
      console.log('\n🔧 Troubleshooting steps:')
      console.log('1. Make sure Google Sheets API is enabled in your Google Cloud Console')
      console.log('2. Verify your service account has the necessary permissions')
      console.log('3. Check that your service account credentials are correct')
      console.log('4. Try creating a sheet manually and sharing it with your service account email')
    }
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createGoogleSheet()
}

module.exports = { createGoogleSheet } 