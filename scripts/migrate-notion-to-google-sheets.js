#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Client } = require('@notionhq/client')
const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

// Notion setup
const notion = new Client({ auth: process.env.NOTION_API_KEY })
const databaseId = process.env.NOTION_DATABASE_ID || '21e2be81198f80ed8a84ffd120c04fab'

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const CREDENTIALS_PATH = path.join(__dirname, '..', 'google-credentials.json')

async function getGoogleAuthClient() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error('❌ Google credentials file not found!')
      console.log('📋 Please follow these steps:')
      console.log('1. Go to https://console.cloud.google.com/')
      console.log('2. Create a new project or select existing one')
      console.log('3. Enable Google Sheets API')
      console.log('4. Create a Service Account')
      console.log('5. Download the JSON credentials file')
      console.log('6. Save it as "google-credentials.json" in the project root')
      process.exit(1)
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
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

async function fetchAllNotionData() {
  console.log('📊 Fetching all data from Notion...')
  
  try {
    const allData = []
    let hasMore = true
    let startCursor = undefined

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
        sorts: [
          {
            property: 'github_username',
            direction: 'ascending',
          },
        ],
      })

      allData.push(...response.results)
      hasMore = response.has_more
      startCursor = response.next_cursor

      console.log(`📄 Fetched ${response.results.length} records...`)
      
      // Add delay to respect rate limits
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Total records fetched from Notion: ${allData.length}`)
    return allData
  } catch (error) {
    console.error('❌ Error fetching data from Notion:', error)
    throw error
  }
}

function parseNotionProperties(page) {
  const properties = page.properties
  
  return {
    notion_id: page.id,
    github_username: properties.github_username?.title?.[0]?.text?.content || '',
    repo_name: properties.repo_name?.rich_text?.[0]?.text?.content || '',
    repo_url: properties.repo_url?.url || '',
    repo_description: properties.repo_description?.rich_text?.[0]?.text?.content || '',
    email: properties.email?.email || '',
    last_activity: properties.last_activity?.date?.start || '',
    status: properties.status?.select?.name || '',
    email_sent: properties.email_sent?.checkbox || false,
    email_approved: properties.email_approved?.checkbox || false,
    email_pending_approval: properties.email_pending_approval?.checkbox || false,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    url: page.url
  }
}

async function createMigrationSpreadsheet(auth, title) {
  try {
    const sheets = google.sheets({ version: 'v4', auth })
    
    const resource = {
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'Notion Data',
            gridProperties: {
              rowCount: 10000,
              columnCount: 15,
            },
          },
        },
        {
          properties: {
            title: 'Email Campaign',
            gridProperties: {
              rowCount: 10000,
              columnCount: 12,
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
            title: 'Migration Log',
            gridProperties: {
              rowCount: 1000,
              columnCount: 5,
            },
          },
        },
      ],
    }

    const response = await sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId,spreadsheetUrl',
    })

    console.log(`✅ Created migration spreadsheet: ${response.data.spreadsheetUrl}`)
    return response.data.spreadsheetId
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error)
    throw error
  }
}

async function exportNotionDataToSheets(auth, spreadsheetId, notionData) {
  try {
    console.log('📊 Exporting Notion data to Google Sheets...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    // Parse Notion data
    const parsedData = notionData.map(parseNotionProperties)
    
    console.log(`📈 Processed ${parsedData.length} records from Notion`)

    // Prepare headers for Notion Data sheet
    const headers = [
      'Notion ID',
      'GitHub Username',
      'Repository Name',
      'Repository URL',
      'Repository Description',
      'Email',
      'Last Activity',
      'Status',
      'Email Sent',
      'Email Approved',
      'Email Pending Approval',
      'Created Time',
      'Last Edited Time',
      'Notion URL'
    ]

    // Prepare data rows
    const dataRows = parsedData.map(record => [
      record.notion_id,
      record.github_username,
      record.repo_name,
      record.repo_url,
      record.repo_description,
      record.email,
      record.last_activity,
      record.status,
      record.email_sent ? 'Yes' : 'No',
      record.email_approved ? 'Yes' : 'No',
      record.email_pending_approval ? 'Yes' : 'No',
      record.created_time,
      record.last_edited_time,
      record.url
    ])

    // Write to Notion Data sheet
    const range = 'Notion Data!A1:N' + (dataRows.length + 1)
    const values = [headers, ...dataRows]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log(`✅ Exported ${parsedData.length} records to "Notion Data" sheet`)

    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    })

    return parsedData
  } catch (error) {
    console.error('❌ Error exporting Notion data:', error)
    throw error
  }
}

async function exportEmailCampaign(auth, spreadsheetId, notionData) {
  try {
    console.log('📧 Preparing email campaign data...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    // Filter records with emails
    const emailRecords = notionData.filter(record => record.email && record.email.trim())

    // Prepare email campaign headers
    const campaignHeaders = [
      'Notion ID',
      'GitHub Username',
      'Email',
      'Repository Name',
      'Repository Description',
      'Email Subject',
      'Email Content',
      'Demo Link',
      'Unsubscribe Link',
      'Status',
      'Email Sent',
      'Created Time'
    ]

    // Prepare email campaign data
    const campaignData = emailRecords.map(record => {
      const demoLink = `https://xeinst.com/demo?ref=${record.github_username}`
      const unsubscribeLink = `https://xeinst.com/unsubscribe?email=${encodeURIComponent(record.email)}&id=${record.notion_id}`
      
      return [
        record.notion_id,
        record.github_username || '',
        record.email,
        record.repo_name || '',
        record.repo_description || '',
        `Automate your ${record.repo_name || 'workflows'} with XEINST`,
        `Hi ${record.github_username || 'there'}! I noticed your ${record.repo_name || 'automation project'} and thought you might be interested in XEINST for workflow automation.`,
        demoLink,
        unsubscribeLink,
        record.status || 'pending',
        record.email_sent ? 'Yes' : 'No',
        record.created_time || ''
      ]
    })

    // Write to Email Campaign sheet
    const range = 'Email Campaign!A1:L' + (campaignData.length + 1)
    const values = [campaignHeaders, ...campaignData]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log(`✅ Exported ${campaignData.length} email campaign entries`)

    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: campaignHeaders.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.4, blue: 0.2 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    })

    return emailRecords
  } catch (error) {
    console.error('❌ Error exporting email campaign:', error)
    throw error
  }
}

async function exportAnalytics(auth, spreadsheetId, notionData, emailRecords) {
  try {
    console.log('📊 Preparing analytics data...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    // Calculate analytics
    const totalRecords = notionData.length
    const recordsWithEmails = emailRecords.length
    const successRate = totalRecords > 0 ? Math.round((recordsWithEmails / totalRecords) * 100) : 0
    
    // Email domain analysis
    const emailDomains = {}
    emailRecords.forEach(record => {
      if (record.email) {
        const domain = record.email.split('@')[1]
        emailDomains[domain] = (emailDomains[domain] || 0) + 1
      }
    })
    
    const topDomains = Object.entries(emailDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    // Status analysis
    const statusCounts = {}
    notionData.forEach(record => {
      const status = record.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    // Email status analysis
    const emailSentCount = notionData.filter(r => r.email_sent).length
    const emailApprovedCount = notionData.filter(r => r.email_approved).length
    const emailPendingCount = notionData.filter(r => r.email_pending_approval).length

    // Prepare analytics data
    const analyticsData = [
      ['Metric', 'Value'],
      ['Total Records', totalRecords],
      ['Records with Emails', recordsWithEmails],
      ['Success Rate (%)', successRate],
      ['', ''],
      ['Email Status', 'Count'],
      ['Email Sent', emailSentCount],
      ['Email Approved', emailApprovedCount],
      ['Email Pending Approval', emailPendingCount],
      ['', ''],
      ['Top Email Domains', 'Count'],
      ...topDomains.map(([domain, count]) => [domain, count]),
      ['', ''],
      ['Status Breakdown', 'Count'],
      ...Object.entries(statusCounts).map(([status, count]) => [status, count]),
      ['', ''],
      ['Migration Date', new Date().toISOString()],
      ['Source', 'Notion Database'],
      ['Total Migration Time', 'Completed']
    ]

    // Write to Analytics sheet
    const range = 'Analytics!A1:B' + analyticsData.length
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: analyticsData },
    })

    console.log('✅ Exported analytics data')

    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 2,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 2,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.8, blue: 0.2 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    })

  } catch (error) {
    console.error('❌ Error exporting analytics:', error)
    throw error
  }
}

async function createMigrationLog(auth, spreadsheetId, notionData, startTime) {
  try {
    console.log('📝 Creating migration log...')
    
    const sheets = google.sheets({ version: 'v4', auth })
    const endTime = new Date()
    const duration = Math.round((endTime - startTime) / 1000)

    const logData = [
      ['Migration Log'],
      [''],
      ['Migration Details', 'Value'],
      ['Start Time', startTime.toISOString()],
      ['End Time', endTime.toISOString()],
      ['Duration (seconds)', duration],
      ['Total Records Migrated', notionData.length],
      ['Source', 'Notion Database'],
      ['Destination', 'Google Sheets'],
      ['Status', 'Completed Successfully'],
      [''],
      ['Migration Steps'],
      ['1. Connected to Notion API', '✅'],
      ['2. Fetched all database records', '✅'],
      ['3. Created Google Sheets spreadsheet', '✅'],
      ['4. Exported data to sheets', '✅'],
      ['5. Generated analytics', '✅'],
      ['6. Created migration log', '✅'],
      [''],
      ['Data Quality Check'],
      ['Records with emails', notionData.filter(r => r.email).length],
      ['Records with repo names', notionData.filter(r => r.repo_name).length],
      ['Records with descriptions', notionData.filter(r => r.repo_description).length],
      [''],
      ['Next Steps'],
      ['1. Review the migrated data'],
      ['2. Verify data integrity'],
      ['3. Set up new workflows in Google Sheets'],
      ['4. Consider archiving Notion database'],
      ['5. Update team processes']
    ]

    // Write to Migration Log sheet
    const range = 'Migration Log!A1:B' + logData.length
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: logData },
    })

    console.log('✅ Created migration log')

    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 3,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 2,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.8, green: 0.2, blue: 0.8 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    })

  } catch (error) {
    console.error('❌ Error creating migration log:', error)
    throw error
  }
}

async function migrateNotionToGoogleSheets() {
  const startTime = new Date()
  
  console.log('🚀 Starting Notion to Google Sheets Migration')
  console.log('==============================================\n')

  try {
    // Check Notion API key
    if (!process.env.NOTION_API_KEY) {
      console.error('❌ NOTION_API_KEY environment variable not set')
      console.log('Please add NOTION_API_KEY to your .env.local file')
      process.exit(1)
    }

    // Get Google Auth client
    const auth = await getGoogleAuthClient()
    console.log('✅ Google Auth configured')

    // Fetch all data from Notion
    const notionData = await fetchAllNotionData()
    
    if (notionData.length === 0) {
      console.log('❌ No data found in Notion database')
      process.exit(1)
    }

    // Create new spreadsheet
    const timestamp = new Date().toISOString().split('T')[0]
    const spreadsheetTitle = `Notion Migration - ${timestamp}`
    const spreadsheetId = await createMigrationSpreadsheet(auth, spreadsheetTitle)

    // Export Notion data
    const parsedData = await exportNotionDataToSheets(auth, spreadsheetId, notionData)

    // Export email campaign data
    const emailRecords = await exportEmailCampaign(auth, spreadsheetId, parsedData)

    // Export analytics
    await exportAnalytics(auth, spreadsheetId, parsedData, emailRecords)

    // Create migration log
    await createMigrationLog(auth, spreadsheetId, parsedData, startTime)

    // Auto-resize columns
    const sheets = google.sheets({ version: 'v4', auth })
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 14,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 1,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 12,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 2,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 2,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 3,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 2,
              },
            },
          },
        ],
      },
    })

    const endTime = new Date()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log('\n🎉 Migration completed successfully!')
    console.log('=====================================')
    console.log(`📊 Spreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)
    console.log(`📈 Total records migrated: ${parsedData.length}`)
    console.log(`📧 Email campaign entries: ${emailRecords.length}`)
    console.log(`⏱️  Migration duration: ${duration} seconds`)
    
    console.log('\n📋 SHEET CONTENTS:')
    console.log('==================')
    console.log('📊 Notion Data: Complete data from Notion')
    console.log('📧 Email Campaign: Ready-to-use email campaign data')
    console.log('📈 Analytics: Key metrics and insights')
    console.log('📝 Migration Log: Migration details and next steps')
    
    console.log('\n💡 NEXT STEPS:')
    console.log('==============')
    console.log('1. Review the migrated data in Google Sheets')
    console.log('2. Verify data integrity and completeness')
    console.log('3. Set up new workflows using Google Sheets')
    console.log('4. Share the spreadsheet with your team')
    console.log('5. Consider archiving the Notion database')
    console.log('6. Update your team processes to use Google Sheets')

    // Save migration config
    const configPath = path.join(__dirname, '..', 'notion-migration-config.json')
    fs.writeFileSync(configPath, JSON.stringify({
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      migrationDate: new Date().toISOString(),
      totalRecords: parsedData.length,
      emailRecords: emailRecords.length,
      duration: duration,
      source: 'Notion',
      destination: 'Google Sheets'
    }, null, 2))

    console.log(`\n💾 Migration config saved to: ${configPath}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  migrateNotionToGoogleSheets()
    .then(() => {
      console.log('\n✨ Notion to Google Sheets migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateNotionToGoogleSheets } 