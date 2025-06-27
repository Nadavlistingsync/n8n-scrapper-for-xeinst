#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

async function simpleGooglePush() {
  console.log('🚀 Simple Google Sheets Push')
  console.log('============================\n')

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEET_ID environment variable not set')
      process.exit(1)
    }

    console.log(`📊 Target Google Sheet: ${spreadsheetId}`)

    // Read the exported CSV files
    const exportsDir = path.join(__dirname, '..', 'exports')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    
    const csvFile = path.join(exportsDir, `notion-migration-${timestamp}.csv`)
    const emailCsvFile = path.join(exportsDir, `notion-email-campaign-${timestamp}.csv`)
    const analyticsFile = path.join(exportsDir, `notion-analytics-${timestamp}.json`)

    if (!fs.existsSync(csvFile)) {
      console.error(`❌ CSV file not found: ${csvFile}`)
      console.log('Please run the migration script first: node scripts/simple-notion-migration.js')
      process.exit(1)
    }

    // Read CSV data
    const csvContent = fs.readFileSync(csvFile, 'utf8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''))
    const data = lines.slice(1).map(line => {
      return line.split(',').map(cell => cell.replace(/"/g, ''))
    })

    console.log(`📊 Found ${data.length} records to push`)
    console.log(`📋 Headers: ${headers.slice(0, 5).join(', ')}...`)

    // Create a simple HTML file with instructions
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Google Sheets Import Instructions</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .step { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .code { background: #e8e8e8; padding: 10px; border-radius: 3px; font-family: monospace; }
        .highlight { background: yellow; padding: 2px; }
        .file-info { background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📊 Google Sheets Import Instructions</h1>
    
    <div class="file-info">
        <h3>📁 Generated Files:</h3>
        <ul>
            <li><strong>Main Data:</strong> ${csvFile}</li>
            <li><strong>Email Campaign:</strong> ${emailCsvFile}</li>
            <li><strong>Analytics:</strong> ${analyticsFile}</li>
        </ul>
    </div>

    <h2>🚀 How to Import to Google Sheets:</h2>

    <div class="step">
        <h3>Step 1: Open Your Google Sheet</h3>
        <p>Go to: <a href="https://docs.google.com/spreadsheets/d/${spreadsheetId}" target="_blank">https://docs.google.com/spreadsheets/d/${spreadsheetId}</a></p>
    </div>

    <div class="step">
        <h3>Step 2: Import Main Data</h3>
        <ol>
            <li>Open the CSV file: <span class="code">${csvFile}</span></li>
            <li>Copy all content (Ctrl+A, Ctrl+C)</li>
            <li>Go to your Google Sheet</li>
            <li>Select cell A1</li>
            <li>Paste the data (Ctrl+V)</li>
        </ol>
    </div>

    <div class="step">
        <h3>Step 3: Create Email Campaign Sheet</h3>
        <ol>
            <li>Click the "+" button at the bottom to add a new sheet</li>
            <li>Name it "Email Campaign"</li>
            <li>Open the email CSV file: <span class="code">${emailCsvFile}</span></li>
            <li>Copy all content and paste into the new sheet</li>
        </ol>
    </div>

    <div class="step">
        <h3>Step 4: Create Analytics Sheet</h3>
        <ol>
            <li>Add another sheet named "Analytics"</li>
            <li>Open the analytics file: <span class="code">${analyticsFile}</span></li>
            <li>Copy the JSON data and format it as a table</li>
        </ol>
    </div>

    <div class="step">
        <h3>📊 Data Summary:</h3>
        <ul>
            <li><strong>Total Records:</strong> ${data.length}</li>
            <li><strong>Records with Emails:</strong> ${data.filter(row => row[4] && row[4].trim()).length}</li>
            <li><strong>Success Rate:</strong> ${Math.round((data.filter(row => row[4] && row[4].trim()).length / data.length) * 100)}%</li>
        </ul>
    </div>

    <div class="step">
        <h3>💡 Pro Tips:</h3>
        <ul>
            <li>Use "Data → Text to Columns" to properly format the data</li>
            <li>Freeze the first row for better navigation</li>
            <li>Use filters to sort and filter your data</li>
            <li>Set up conditional formatting for better visualization</li>
        </ul>
    </div>

    <div class="step">
        <h3>🔗 Quick Links:</h3>
        <ul>
            <li><a href="https://docs.google.com/spreadsheets/d/${spreadsheetId}" target="_blank">Your Google Sheet</a></li>
            <li><a href="file://${csvFile}" target="_blank">Main Data CSV</a></li>
            <li><a href="file://${emailCsvFile}" target="_blank">Email Campaign CSV</a></li>
        </ul>
    </div>

    <script>
        // Auto-open the Google Sheet
        window.open('https://docs.google.com/spreadsheets/d/${spreadsheetId}', '_blank');
    </script>
</body>
</html>
    `

    // Save the HTML file
    const htmlFile = path.join(exportsDir, 'google-sheets-import-instructions.html')
    fs.writeFileSync(htmlFile, htmlContent, 'utf8')

    console.log('\n✅ Manual Import Instructions Created!')
    console.log('=====================================')
    console.log(`📄 Instructions: ${htmlFile}`)
    console.log(`📊 Main Data: ${csvFile}`)
    console.log(`📧 Email Campaign: ${emailCsvFile}`)
    console.log(`📈 Analytics: ${analyticsFile}`)
    console.log(`🔗 Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)
    
    console.log('\n💡 NEXT STEPS:')
    console.log('==============')
    console.log('1. Open the HTML file for detailed instructions')
    console.log('2. Copy data from CSV files to Google Sheets manually')
    console.log('3. Set up any automations you need in Google Sheets')
    console.log('4. Your Notion data is safely backed up in CSV format')

    // Try to open the HTML file
    try {
        const { exec } = require('child_process')
        exec(`open "${htmlFile}"`)
        console.log('\n🌐 Opening instructions in your browser...')
    } catch (error) {
        console.log('\n📄 Please open the HTML file manually for instructions')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  simpleGooglePush()
    .then(() => {
      console.log('\n✨ Simple Google push completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Simple Google push failed:', error)
      process.exit(1)
    })
}

module.exports = { simpleGooglePush } 