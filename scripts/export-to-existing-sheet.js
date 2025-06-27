#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

// You can set this environment variable or pass it as an argument
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1yZyDWrBKY1cniXxEz5MBtUO65H8R7TdEDtqARtsLJM0'

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

function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

function parseTextFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(content)
    return { type: 'json', data: jsonData }
  } catch {
    // Parse as email list
    const emails = lines.map(line => line.trim()).filter(email => email.includes('@'))
    return { type: 'email_list', data: emails }
  }
}

async function createSheetIfNotExists(auth, spreadsheetId, sheetName) {
  try {
    const sheets = google.sheets({ version: 'v4', auth })
    
    // First, try to get the spreadsheet to see if it exists
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [sheetName],
      })
      console.log(`✅ Sheet "${sheetName}" already exists`)
      return true
    } catch (error) {
      if (error.code === 400) {
        // Sheet doesn't exist, create it
        console.log(`📝 Creating new sheet: "${sheetName}"`)
        
        const request = {
          addSheet: {
            properties: {
              title: sheetName,
              gridProperties: {
                rowCount: 10000,
                columnCount: 20,
              },
            },
          },
        }

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [request],
          },
        })
        
        console.log(`✅ Created sheet: "${sheetName}"`)
        return true
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error(`❌ Error creating sheet "${sheetName}":`, error)
    return false
  }
}

async function exportCSVToSheet(auth, spreadsheetId, sheetName, csvFilePath) {
  try {
    console.log(`📊 Exporting ${csvFilePath} to ${sheetName}...`)
    
    const sheets = google.sheets({ version: 'v4', auth })
    const data = await parseCSVFile(csvFilePath)
    
    if (data.length === 0) {
      console.log(`⚠️  No data found in ${csvFilePath}`)
      return 0
    }

    // Get headers from first row
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(header => row[header] || ''))

    // Prepare the data
    const values = [headers, ...rows]

    // Clear existing content and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: sheetName,
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log(`✅ Exported ${data.length} rows to ${sheetName}`)
    return data.length
  } catch (error) {
    console.error(`❌ Error exporting ${csvFilePath}:`, error)
    return 0
  }
}

async function exportTextFileToSheet(auth, spreadsheetId, sheetName, filePath) {
  try {
    console.log(`📊 Exporting ${filePath} to ${sheetName}...`)
    
    const sheets = google.sheets({ version: 'v4', auth })
    const parsedData = parseTextFile(filePath)
    
    let values = []
    let rowCount = 0

    if (parsedData.type === 'json') {
      // Export JSON data
      const jsonData = parsedData.data
      if (Array.isArray(jsonData)) {
        if (jsonData.length > 0 && typeof jsonData[0] === 'object') {
          const headers = Object.keys(jsonData[0])
          values = [headers, ...jsonData.map(item => headers.map(header => item[header] || ''))]
        } else {
          values = [['Data'], ...jsonData.map(item => [item])]
        }
      } else {
        values = [['Key', 'Value'], ...Object.entries(jsonData).map(([key, value]) => [key, JSON.stringify(value)])]
      }
      rowCount = values.length - 1
    } else if (parsedData.type === 'email_list') {
      // Export email list
      const emails = parsedData.data
      values = [['Email'], ...emails.map(email => [email])]
      rowCount = emails.length
    }

    if (values.length === 0) {
      console.log(`⚠️  No data found in ${filePath}`)
      return 0
    }

    // Clear existing content and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: sheetName,
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log(`✅ Exported ${rowCount} items to ${sheetName}`)
    return rowCount
  } catch (error) {
    console.error(`❌ Error exporting ${filePath}:`, error)
    return 0
  }
}

async function exportAllDataToExistingSheet() {
  const startTime = new Date()
  console.log('🚀 Starting data export to existing Google Sheet...')
  console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`)
  
  try {
    // Setup Google Auth
    const auth = await getGoogleAuthClient()
    
    const exportsDir = path.join(__dirname, '..', 'exports')
    const files = fs.readdirSync(exportsDir)
    
    const summaryData = []
    
    // Export each file
    for (const file of files) {
      const filePath = path.join(exportsDir, file)
      const stats = fs.statSync(filePath)
      const fileSize = `${(stats.size / 1024).toFixed(2)} KB`
      
      try {
        let rowCount = 0
        let sheetName = ''
        
        if (file.endsWith('.csv')) {
          // Handle CSV files
          if (file.includes('notion-migration')) {
            sheetName = 'NotionMigrationData'
          } else if (file.includes('email-campaign')) {
            sheetName = 'EmailCampaignData'
          } else if (file.includes('xeinst-campaign')) {
            sheetName = 'XeinstCampaignData'
          } else {
            sheetName = file.replace('.csv', '').replace(/[^a-zA-Z0-9]/g, '').trim()
          }
          
          // Create sheet if it doesn't exist
          const sheetCreated = await createSheetIfNotExists(auth, SPREADSHEET_ID, sheetName)
          if (sheetCreated) {
            rowCount = await exportCSVToSheet(auth, SPREADSHEET_ID, sheetName, filePath)
          }
        } else if (file.endsWith('.json')) {
          // Handle JSON files
          sheetName = file.replace('.json', '').replace(/[^a-zA-Z0-9]/g, '').trim()
          
          const sheetCreated = await createSheetIfNotExists(auth, SPREADSHEET_ID, sheetName)
          if (sheetCreated) {
            rowCount = await exportTextFileToSheet(auth, SPREADSHEET_ID, sheetName, filePath)
          }
        } else if (file.endsWith('.txt')) {
          // Handle text files (email lists)
          if (file.includes('emails-only')) {
            sheetName = 'EmailLists'
          } else if (file.includes('emails-with-names')) {
            sheetName = 'EmailListsWithNames'
          } else {
            sheetName = file.replace('.txt', '').replace(/[^a-zA-Z0-9]/g, '').trim()
          }
          
          const sheetCreated = await createSheetIfNotExists(auth, SPREADSHEET_ID, sheetName)
          if (sheetCreated) {
            rowCount = await exportTextFileToSheet(auth, SPREADSHEET_ID, sheetName, filePath)
          }
        } else if (file.endsWith('.html')) {
          // Skip HTML files for now
          console.log(`⏭️  Skipping HTML file: ${file}`)
          continue
        }
        
        if (rowCount > 0) {
          summaryData.push([
            file,
            sheetName,
            rowCount,
            fileSize,
            new Date().toISOString()
          ])
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error)
        summaryData.push([
          file,
          'ERROR',
          0,
          fileSize,
          new Date().toISOString()
        ])
      }
    }
    
    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n🎉 Export completed successfully!')
    console.log(`📊 Total files processed: ${summaryData.length}`)
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📈 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
    
    // Save summary to file
    const summaryPath = path.join(__dirname, '..', 'export-summary.json')
    const summary = {
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      exportDate: new Date().toISOString(),
      filesExported: summaryData.length,
      summary: summaryData
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    console.log(`💾 Summary saved to: ${summaryPath}`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

// Run the export
if (require.main === module) {
  exportAllDataToExistingSheet()
}

module.exports = { exportAllDataToExistingSheet }