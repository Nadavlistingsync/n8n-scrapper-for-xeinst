#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

async function pushToGoogleSheets() {
  console.log('🚀 Pushing data to Google Sheets...')
  console.log('====================================\n')

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEET_ID environment variable not set')
      process.exit(1)
    }

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

    console.log(`📊 Found ${data.length} records to push to Google Sheets`)

    // Clear existing data and push new data
    const range = 'Sheet1!A1:Z10000' // Adjust range as needed
    
    try {
      // Clear existing data
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Sheet1!A:Z'
      })
      console.log('🧹 Cleared existing data from Google Sheet')
    } catch (error) {
      console.log('ℹ️  No existing data to clear (or sheet is empty)')
    }

    // Prepare data for Google Sheets
    const values = [headers, ...data]

    // Push data to Google Sheets
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    })

    console.log(`✅ Successfully pushed ${data.length} records to Google Sheets`)
    console.log(`📊 Updated ${response.data.updatedCells} cells`)

    // If email campaign file exists, create a second sheet
    if (fs.existsSync(emailCsvFile)) {
      const emailCsvContent = fs.readFileSync(emailCsvFile, 'utf8')
      const emailLines = emailCsvContent.split('\n').filter(line => line.trim())
      const emailHeaders = emailLines[0].split(',').map(h => h.replace(/"/g, ''))
      const emailData = emailLines.slice(1).map(line => {
        return line.split(',').map(cell => cell.replace(/"/g, ''))
      })

      // Create Email Campaign sheet
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Email Campaign'
                  }
                }
              }
            ]
          }
        })
        console.log('📧 Created Email Campaign sheet')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('📧 Email Campaign sheet already exists, clearing data...')
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Email Campaign!A:Z'
          })
        } else {
          console.log('ℹ️  Email Campaign sheet creation failed, continuing...')
        }
      }

      // Push email campaign data
      const emailValues = [emailHeaders, ...emailData]
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Email Campaign!A1',
        valueInputOption: 'RAW',
        resource: {
          values: emailValues
        }
      })

      console.log(`✅ Pushed ${emailData.length} email campaign records to Email Campaign sheet`)
    }

    // If analytics file exists, create Analytics sheet
    if (fs.existsSync(analyticsFile)) {
      const analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'))
      
      // Create Analytics sheet
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Analytics'
                  }
                }
              }
            ]
          }
        })
        console.log('📈 Created Analytics sheet')
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('📈 Analytics sheet already exists, clearing data...')
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Analytics!A:Z'
          })
        } else {
          console.log('ℹ️  Analytics sheet creation failed, continuing...')
        }
      }

      // Push analytics data
      const analyticsHeaders = ['Metric', 'Value']
      const analyticsData = [
        ['Total Records', analytics.totalRecords],
        ['Records with Emails', analytics.recordsWithEmails],
        ['Success Rate (%)', analytics.successRate],
        ['Email Sent Count', analytics.emailSentCount],
        ['Email Approved Count', analytics.emailApprovedCount],
        ['Email Pending Count', analytics.emailPendingCount],
        ['Migration Date', analytics.migrationDate]
      ]

      const analyticsValues = [analyticsHeaders, ...analyticsData]
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Analytics!A1',
        valueInputOption: 'RAW',
        resource: {
          values: analyticsValues
        }
      })

      console.log('✅ Pushed analytics data to Analytics sheet')
    }

    // Format the sheets
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // Main sheet
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            }
          ]
        }
      })
      console.log('🎨 Applied formatting to headers')
    } catch (error) {
      console.log('ℹ️  Formatting failed, but data was pushed successfully')
    }

    console.log('\n🎉 Google Sheets update completed successfully!')
    console.log('===============================================')
    console.log(`📊 Main data: ${data.length} records`)
    console.log(`📧 Email campaign: ${fs.existsSync(emailCsvFile) ? 'Pushed' : 'Not found'}`)
    console.log(`📈 Analytics: ${fs.existsSync(analyticsFile) ? 'Pushed' : 'Not found'}`)
    console.log(`🔗 Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)

  } catch (error) {
    console.error('❌ Error pushing to Google Sheets:', error.message)
    if (error.message.includes('credentials')) {
      console.log('\n💡 Please check your Google credentials:')
      console.log('1. Make sure google-credentials.json exists and is valid')
      console.log('2. Verify the service account has access to the Google Sheet')
      console.log('3. Check that GOOGLE_SHEET_ID is correct in your .env.local file')
    }
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  pushToGoogleSheets()
    .then(() => {
      console.log('\n✨ Google Sheets push completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Google Sheets push failed:', error)
      process.exit(1)
    })
}

module.exports = { pushToGoogleSheets } 