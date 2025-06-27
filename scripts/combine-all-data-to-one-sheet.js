#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1yZyDWrBKY1cniXxEz5MBtUO65H8R7TdEDtqARtsLJM0'

// Notion migration format headers
const NOTION_HEADERS = [
  "Notion ID",
  "GitHub Username", 
  "Repository Name",
  "Repository URL",
  "Repository Description",
  "Email",
  "Last Activity",
  "Status",
  "Email Sent",
  "Email Approved",
  "Email Pending Approval",
  "Created Time",
  "Last Edited Time",
  "Notion URL"
]

async function getGoogleAuthClient() {
  try {
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

    if (!credentials.private_key || !credentials.client_email) {
      console.error('❌ Missing required Google Service Account credentials!')
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
  
  try {
    const jsonData = JSON.parse(content)
    return { type: 'json', data: jsonData }
  } catch {
    const emails = lines.map(line => line.trim()).filter(email => email.includes('@'))
    return { type: 'email_list', data: emails }
  }
}

function normalizeDataToNotionFormat(data, sourceFile) {
  // If data already has Notion format headers, use it as is
  if (data.length > 0 && data[0]['Notion ID']) {
    return data.map(row => ({
      ...row,
      'Source File': sourceFile
    }))
  }

  // Convert other formats to Notion format
  return data.map(row => {
    const normalizedRow = {}
    
    // Map existing fields to Notion format
    normalizedRow['Notion ID'] = row['Notion ID'] || row['ID'] || row['id'] || `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    normalizedRow['GitHub Username'] = row['GitHub Username'] || row['Username'] || row['username'] || row['GitHub'] || ''
    normalizedRow['Repository Name'] = row['Repository Name'] || row['Repo Name'] || row['repo_name'] || row['Name'] || ''
    normalizedRow['Repository URL'] = row['Repository URL'] || row['Repo URL'] || row['repo_url'] || row['URL'] || row['url'] || ''
    normalizedRow['Repository Description'] = row['Repository Description'] || row['Description'] || row['description'] || row['Repo Description'] || ''
    normalizedRow['Email'] = row['Email'] || row['email'] || ''
    normalizedRow['Last Activity'] = row['Last Activity'] || row['last_activity'] || row['LastActivity'] || ''
    normalizedRow['Status'] = row['Status'] || row['status'] || 'new'
    normalizedRow['Email Sent'] = row['Email Sent'] || row['email_sent'] || 'No'
    normalizedRow['Email Approved'] = row['Email Approved'] || row['email_approved'] || 'No'
    normalizedRow['Email Pending Approval'] = row['Email Pending Approval'] || row['email_pending'] || 'No'
    normalizedRow['Created Time'] = row['Created Time'] || row['created_time'] || row['CreatedTime'] || new Date().toISOString()
    normalizedRow['Last Edited Time'] = row['Last Edited Time'] || row['last_edited_time'] || row['LastEditedTime'] || new Date().toISOString()
    normalizedRow['Notion URL'] = row['Notion URL'] || row['notion_url'] || row['NotionURL'] || ''
    
    // Add source file info
    normalizedRow['Source File'] = sourceFile
    
    return normalizedRow
  })
}

async function combineAllDataToSingleSheet() {
  const startTime = new Date()
  console.log('🚀 Combining all data into Notion format Google Sheets...')
  console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`)
  
  try {
    const auth = await getGoogleAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })
    
    const exportsDir = path.join(__dirname, '..', 'exports')
    const files = fs.readdirSync(exportsDir)
    
    let allData = []
    
    // Process each file and combine data
    for (const file of files) {
      const filePath = path.join(exportsDir, file)
      
      try {
        if (file.endsWith('.csv')) {
          console.log(`📊 Processing CSV: ${file}`)
          const data = await parseCSVFile(filePath)
          
          if (data.length > 0) {
            const normalizedData = normalizeDataToNotionFormat(data, file)
            allData.push(...normalizedData)
            console.log(`✅ Added ${data.length} rows from ${file}`)
          }
          
        } else if (file.endsWith('.json')) {
          console.log(`📊 Processing JSON: ${file}`)
          const parsedData = parseTextFile(filePath)
          
          if (parsedData.type === 'json') {
            const jsonData = parsedData.data
            if (Array.isArray(jsonData)) {
              const normalizedData = normalizeDataToNotionFormat(jsonData, file)
              allData.push(...normalizedData)
              console.log(`✅ Added ${jsonData.length} items from ${file}`)
            } else {
              // Single JSON object
              const normalizedData = normalizeDataToNotionFormat([jsonData], file)
              allData.push(...normalizedData)
              console.log(`✅ Added 1 item from ${file}`)
            }
          }
          
        } else if (file.endsWith('.txt')) {
          console.log(`📊 Processing TXT: ${file}`)
          const parsedData = parseTextFile(filePath)
          
          if (parsedData.type === 'email_list') {
            const emails = parsedData.data
            const emailData = emails.map(email => ({
              'Notion ID': `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              'GitHub Username': '',
              'Repository Name': '',
              'Repository URL': '',
              'Repository Description': '',
              'Email': email,
              'Last Activity': '',
              'Status': 'new',
              'Email Sent': 'No',
              'Email Approved': 'No',
              'Email Pending Approval': 'No',
              'Created Time': new Date().toISOString(),
              'Last Edited Time': new Date().toISOString(),
              'Notion URL': '',
              'Source File': file
            }))
            allData.push(...emailData)
            console.log(`✅ Added ${emails.length} emails from ${file}`)
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error)
      }
    }
    
    if (allData.length === 0) {
      console.log('❌ No data found to combine')
      return
    }
    
    console.log(`\n📊 Total combined records: ${allData.length}`)
    
    // Remove duplicates based on key fields (Email + Repository URL combination)
    const seen = new Set()
    const dedupedData = allData.filter(row => {
      const key = `${row['Email'] || ''}-${row['Repository URL'] || ''}-${row['GitHub Username'] || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    console.log(`\n🧹 Deduplicated records: ${dedupedData.length}`)

    // Google Sheets per-sheet cell limit (10 million cells)
    const MAX_CELLS_PER_SHEET = 10000000
    const maxRowsPerSheet = Math.floor(MAX_CELLS_PER_SHEET / NOTION_HEADERS.length)
    console.log(`🧮 Max rows per sheet: ${maxRowsPerSheet}`)

    // Split data into chunks
    const chunks = []
    for (let i = 0; i < dedupedData.length; i += maxRowsPerSheet) {
      chunks.push(dedupedData.slice(i, i + maxRowsPerSheet))
    }

    // Upload each chunk to its own sheet
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const sheetName = `Combined${i + 1}`
      const values = [NOTION_HEADERS, ...chunk.map(row => NOTION_HEADERS.map(header => row[header] || ''))]
      console.log(`\n📤 Uploading ${chunk.length} rows to sheet: ${sheetName}`)
      
      // Clear existing content
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: sheetName,
        })
      } catch (e) {
        // Ignore if sheet doesn't exist
      }
      
      // Create sheet if it doesn't exist
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: chunk.length + 1,
                    columnCount: NOTION_HEADERS.length,
                  },
                },
              },
            }],
          },
        })
        console.log(`✅ Created sheet: ${sheetName}`)
      } catch (e) {
        if (e.message && e.message.includes('already exists')) {
          // Sheet already exists
        } else {
          throw e
        }
      }
      
      // Upload data
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: { values },
      })
      console.log(`✅ Uploaded to ${sheetName}`)
    }

    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`\n🎉 All deduplicated data uploaded in Notion format!`)
    console.log(`📊 Total records: ${dedupedData.length}`)
    console.log(`📋 Total columns: ${NOTION_HEADERS.length}`)
    console.log(`🗂️  Sheets created: ${chunks.length}`)
    chunks.forEach((chunk, i) => {
      console.log(`   - Combined${i + 1}: ${chunk.length} rows`)
    })
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📈 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
    
    // Save summary
    const summary = {
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      exportDate: new Date().toISOString(),
      totalRecords: dedupedData.length,
      totalColumns: NOTION_HEADERS.length,
      sheetsCreated: chunks.length,
      rowsPerSheet: chunks.map(chunk => chunk.length),
      headers: NOTION_HEADERS,
      format: 'Notion Migration Format'
    }
    fs.writeFileSync('combined-data-summary.json', JSON.stringify(summary, null, 2))
    console.log(`💾 Summary saved to: combined-data-summary.json`)
    
  } catch (error) {
    console.error('❌ Error combining data:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  combineAllDataToSingleSheet()
}

module.exports = { combineAllDataToSingleSheet } 