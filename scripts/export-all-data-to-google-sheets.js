#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

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

async function createMasterSpreadsheet(auth, title) {
  try {
    const sheets = google.sheets({ version: 'v4', auth })
    
    const resource = {
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'Notion Migration Data',
            gridProperties: {
              rowCount: 10000,
              columnCount: 15,
            },
          },
        },
        {
          properties: {
            title: 'Email Campaign Data',
            gridProperties: {
              rowCount: 10000,
              columnCount: 12,
            },
          },
        },
        {
          properties: {
            title: 'Xeinst Campaign Data',
            gridProperties: {
              rowCount: 10000,
              columnCount: 10,
            },
          },
        },
        {
          properties: {
            title: 'Email Lists',
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
        {
          properties: {
            title: 'Export Summary',
            gridProperties: {
              rowCount: 100,
              columnCount: 8,
            },
          },
        },
      ],
    }

    const response = await sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId,spreadsheetUrl',
    })

    console.log(`✅ Created master spreadsheet: ${response.data.spreadsheetUrl}`)
    return response.data.spreadsheetId
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error)
    throw error
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

async function exportCSVToSheet(auth, spreadsheetId, sheetName, csvFilePath) {
  try {
    console.log(`📊 Exporting ${csvFilePath} to ${sheetName}...`)
    
    const sheets = google.sheets({ version: 'v4', auth })
    const data = await parseCSVFile(csvFilePath)
    
    if (data.length === 0) {
      console.log(`⚠️  No data found in ${csvFilePath}`)
      return
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

async function createExportSummary(auth, spreadsheetId, summaryData) {
  try {
    console.log('📊 Creating export summary...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    const headers = ['File Name', 'Sheet Name', 'Rows Exported', 'File Size', 'Export Time']
    const values = [headers, ...summaryData]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Export Summary!A1',
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log('✅ Export summary created')
  } catch (error) {
    console.error('❌ Error creating export summary:', error)
  }
}

async function exportAllDataToGoogleSheets() {
  const startTime = new Date()
  console.log('🚀 Starting comprehensive data export to Google Sheets...')
  
  try {
    // Setup Google Auth
    const auth = await getGoogleAuthClient()
    
    // Create master spreadsheet
    const spreadsheetTitle = `Xeinst Data Export - ${new Date().toISOString().split('T')[0]}`
    const spreadsheetId = await createMasterSpreadsheet(auth, spreadsheetTitle)
    
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
            sheetName = 'Notion Migration Data'
          } else if (file.includes('email-campaign')) {
            sheetName = 'Email Campaign Data'
          } else if (file.includes('xeinst-campaign')) {
            sheetName = 'Xeinst Campaign Data'
          } else {
            sheetName = file.replace('.csv', '').replace(/[^a-zA-Z0-9]/g, ' ').trim()
          }
          
          rowCount = await exportCSVToSheet(auth, spreadsheetId, sheetName, filePath)
        } else if (file.endsWith('.json')) {
          // Handle JSON files
          sheetName = file.replace('.json', '').replace(/[^a-zA-Z0-9]/g, ' ').trim()
          rowCount = await exportTextFileToSheet(auth, spreadsheetId, sheetName, filePath)
        } else if (file.endsWith('.txt')) {
          // Handle text files (email lists)
          if (file.includes('emails-only')) {
            sheetName = 'Email Lists'
          } else if (file.includes('emails-with-names')) {
            sheetName = 'Email Lists'
          } else {
            sheetName = file.replace('.txt', '').replace(/[^a-zA-Z0-9]/g, ' ').trim()
          }
          
          rowCount = await exportTextFileToSheet(auth, spreadsheetId, sheetName, filePath)
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
    
    // Create export summary
    await createExportSummary(auth, spreadsheetId, summaryData)
    
    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n🎉 Export completed successfully!')
    console.log(`📊 Total files processed: ${summaryData.length}`)
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📈 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)
    
    // Save spreadsheet ID to file for future reference
    const configPath = path.join(__dirname, '..', 'google-sheets-config.json')
    const config = {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      exportDate: new Date().toISOString(),
      filesExported: summaryData.length
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(`💾 Configuration saved to: ${configPath}`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

// Run the export
if (require.main === module) {
  exportAllDataToGoogleSheets()
}

module.exports = { exportAllDataToGoogleSheets } 