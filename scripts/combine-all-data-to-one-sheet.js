#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1yZyDWrBKY1cniXxEz5MBtUO65H8R7TdEDtqARtsLJM0'

// Simplified headers - only essential fields
const SIMPLIFIED_HEADERS = [
  "GitHub Username", 
  "Repository URL",
  "Email"
]

// Batch upload settings
const BATCH_SIZE = 500 // Upload 500 rows at a time
const DELAY_BETWEEN_BATCHES = 1000 // 1 second delay between batches
const MAX_ROWS_PER_SHEET = 10000 // Max rows per sheet (including header) - increased since we only have 3 columns

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

function normalizeDataToSimplifiedFormat(data, sourceFile) {
  // Convert data to simplified format with only essential fields
  return data.map(row => {
    const simplifiedRow = {}
    
    // Extract only the essential fields
    simplifiedRow['GitHub Username'] = row['GitHub Username'] || row['Username'] || row['username'] || row['GitHub'] || ''
    simplifiedRow['Repository URL'] = row['Repository URL'] || row['Repo URL'] || row['repo_url'] || row['URL'] || row['url'] || ''
    simplifiedRow['Email'] = row['Email'] || row['email'] || ''
    
    return simplifiedRow
  }).filter(row => {
    // Only keep rows that have at least an email or GitHub username
    return row['Email'] || row['GitHub Username']
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
                columnCount: SIMPLIFIED_HEADERS.length,
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
  console.log('🚀 Combining all data into simplified format (GitHub Username, Repository URL, Email)...')
  console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`)
  console.log(`📦 Batch size: ${BATCH_SIZE} rows`)
  console.log(`📋 Max rows per sheet: ${MAX_ROWS_PER_SHEET} (including header)`)
  console.log(`📋 Columns: ${SIMPLIFIED_HEADERS.join(', ')}`)
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
            const normalizedData = normalizeDataToSimplifiedFormat(data, file)
            allData.push(...normalizedData)
            console.log(`✅ Added ${normalizedData.length} rows from ${file}`)
          }
          
        } else if (file.endsWith('.json')) {
          console.log(`📊 Processing JSON: ${file}`)
          const parsedData = parseTextFile(filePath)
          
          if (parsedData.type === 'json') {
            const jsonData = parsedData.data
            if (Array.isArray(jsonData)) {
              const normalizedData = normalizeDataToSimplifiedFormat(jsonData, file)
              allData.push(...normalizedData)
              console.log(`✅ Added ${normalizedData.length} items from ${file}`)
            } else {
              // Single JSON object
              const normalizedData = normalizeDataToSimplifiedFormat([jsonData], file)
              allData.push(...normalizedData)
              console.log(`✅ Added ${normalizedData.length} item from ${file}`)
            }
          }
          
        } else if (file.endsWith('.txt')) {
          console.log(`📊 Processing TXT: ${file}`)
          const parsedData = parseTextFile(filePath)
          
          if (parsedData.type === 'email_list') {
            const emails = parsedData.data
            const emailData = emails.map(email => ({
              'GitHub Username': '',
              'Repository URL': '',
              'Email': email
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
    
    // Remove duplicates based on Email + Repository URL combination
    const seen = new Set()
    const dedupedData = allData.filter(row => {
      const key = `${row['Email'] || ''}-${row['Repository URL'] || ''}-${row['GitHub Username'] || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    console.log(`\n🧹 Deduplicated records: ${dedupedData.length}`)

    // Upload data to multiple sheets
    const sheetsCreated = await uploadDataToSheets(sheets, SPREADSHEET_ID, dedupedData, SIMPLIFIED_HEADERS)

    const endTime = new Date()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`\n🎉 All data uploaded to multiple sheets!`)
    console.log(`📊 Total records: ${dedupedData.length}`)
    console.log(`📋 Total columns: ${SIMPLIFIED_HEADERS.length}`)
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
      totalColumns: SIMPLIFIED_HEADERS.length,
      sheetsCreated: sheetsCreated,
      maxRowsPerSheet: MAX_ROWS_PER_SHEET - 1,
      batchSize: BATCH_SIZE,
      delayBetweenBatches: DELAY_BETWEEN_BATCHES,
      headers: SIMPLIFIED_HEADERS,
      format: 'Simplified Format (GitHub Username, Repository URL, Email)',
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