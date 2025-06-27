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

// Batch upload settings
const BATCH_SIZE = 500 // Upload 500 rows at a time
const DELAY_BETWEEN_BATCHES = 1000 // 1 second delay between batches
const MAX_ROWS_PER_SHEET = 1000 // Max rows per sheet (including header)

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function createSheet(sheets, spreadsheetId, sheetName, rowCount) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetName,
              gridProperties: {
                rowCount: rowCount,
                columnCount: NOTION_HEADERS.length,
              },
            },
          },
        }],
      },
    })
    console.log(`✅ Created sheet: ${sheetName}`)
    return true
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log(`✅ Sheet ${sheetName} already exists`)
      return true
    } else {
      console.error(`❌ Error creating sheet ${sheetName}:`, e)
      return false
    }
  }
}

async function uploadDataToSheets(sheets, spreadsheetId, data, headers) {
  console.log(`📤 Starting upload to multiple sheets...`)
  
  let currentDataIndex = 0
  let currentSheetNumber = 1
  let totalUploaded = 0
  
  while (currentDataIndex < data.length) {
    const sheetName = `Sheet${currentSheetNumber}`
    const dataRemaining = data.length - currentDataIndex
    const maxDataForThisSheet = MAX_ROWS_PER_SHEET - 1 // -1 for header
    const dataForThisSheet = Math.min(dataRemaining, maxDataForThisSheet)
    
    console.log(`\n📊 Processing ${sheetName}: ${dataForThisSheet} rows (${currentDataIndex + 1}-${currentDataIndex + dataForThisSheet})`)
    
    // Create sheet if needed
    await createSheet(sheets, spreadsheetId, sheetName, dataForThisSheet + 1)
    
    // Clear existing content
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: sheetName,
      })
    } catch (e) {
      // Ignore if sheet doesn't exist
    }
    
    // Upload headers first
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    })
    console.log(`✅ Headers uploaded to ${sheetName}`)
    
    // Upload data in batches
    let currentRow = 2 // Start after headers
    let batchNumber = 1
    
    for (let i = 0; i < dataForThisSheet; i += BATCH_SIZE) {
      const batch = data.slice(currentDataIndex + i, currentDataIndex + i + BATCH_SIZE)
      const values = batch.map(row => headers.map(header => row[header] || ''))
      
      const range = `${sheetName}!A${currentRow}`
      
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: { values },
        })
        
        console.log(`✅ ${sheetName} - Batch ${batchNumber}: Uploaded ${batch.length} rows (rows ${currentRow}-${currentRow + batch.length - 1})`)
        
        currentRow += batch.length
        batchNumber++
        
        // Add delay between batches to avoid rate limits
        if (i + BATCH_SIZE < dataForThisSheet) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await sleep(DELAY_BETWEEN_BATCHES)
        }
        
      } catch (error) {
        console.error(`❌ Error uploading batch ${batchNumber} to ${sheetName}:`, error)
        throw error
      }
    }
    
    totalUploaded += dataForThisSheet
    currentDataIndex += dataForThisSheet
    currentSheetNumber++
    
    console.log(`✅ Completed ${sheetName}: ${dataForThisSheet} rows uploaded`)
  }
  
  console.log(`🎉 All data uploaded to ${currentSheetNumber - 1} sheets!`)
  return currentSheetNumber - 1
}

async function combineAllDataToSingleSheet() {
  const startTime = new Date()
  console.log('🚀 Combining all data into multiple Google Sheets (Sheet1, Sheet2, etc.)...')
  console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`)
  console.log(`📦 Batch size: ${BATCH_SIZE} rows`)
  console.log(`📋 Max rows per sheet: ${MAX_ROWS_PER_SHEET} (including header)`)
  console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
  
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

    // Upload data to multiple sheets
    const sheetsCreated = await uploadDataToSheets(sheets, SPREADSHEET_ID, dedupedData, NOTION_HEADERS)

    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`\n🎉 All data uploaded to multiple sheets!`)
    console.log(`📊 Total records: ${dedupedData.length}`)
    console.log(`📋 Total columns: ${NOTION_HEADERS.length}`)
    console.log(`🗂️  Sheets created: ${sheetsCreated}`)
    console.log(`📦 Max rows per sheet: ${MAX_ROWS_PER_SHEET - 1} (excluding header)`)
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📈 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`)
    
    // Save summary
    const summary = {
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      exportDate: new Date().toISOString(),
      totalRecords: dedupedData.length,
      totalColumns: NOTION_HEADERS.length,
      sheetsCreated: sheetsCreated,
      maxRowsPerSheet: MAX_ROWS_PER_SHEET - 1,
      batchSize: BATCH_SIZE,
      delayBetweenBatches: DELAY_BETWEEN_BATCHES,
      headers: NOTION_HEADERS,
      format: 'Notion Migration Format',
      sheetNames: Array.from({length: sheetsCreated}, (_, i) => `Sheet${i + 1}`)
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