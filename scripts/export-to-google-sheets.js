#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function createNewSpreadsheet(auth, title) {
  try {
    const sheets = google.sheets({ version: 'v4', auth })
    
    const resource = {
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'Leads Data',
            gridProperties: {
              rowCount: 10000,
              columnCount: 20,
            },
          },
        },
        {
          properties: {
            title: 'Email Campaign',
            gridProperties: {
              rowCount: 10000,
              columnCount: 15,
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

    console.log(`✅ Created new spreadsheet: ${response.data.spreadsheetUrl}`)
    return response.data.spreadsheetId
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error)
    throw error
  }
}

async function exportLeadsData(auth, spreadsheetId) {
  try {
    console.log('📊 Fetching leads data from Supabase...')
    
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching leads:', error)
      return
    }

    console.log(`📈 Found ${leads.length} leads to export`)

    const sheets = google.sheets({ version: 'v4', auth })

    // Prepare headers
    const headers = [
      'ID',
      'GitHub Username',
      'Email',
      'Repository Name',
      'Repository URL',
      'Repository Description',
      'Last Activity',
      'Email Template',
      'Email Subject',
      'Campaign Status',
      'AI Score',
      'Validation Status',
      'Created At',
      'Updated At'
    ]

    // Prepare data rows
    const dataRows = leads.map(lead => [
      lead.id,
      lead.github_username || '',
      lead.email || '',
      lead.repo_name || '',
      lead.repo_url || '',
      lead.repo_description || '',
      lead.last_activity || '',
      lead.email_template || '',
      lead.email_subject || '',
      lead.campaign_status || '',
      lead.ai_score || '',
      lead.validation_status || '',
      lead.created_at || '',
      lead.updated_at || ''
    ])

    // Write to Leads Data sheet
    const range = 'Leads Data!A1:N' + (dataRows.length + 1)
    const values = [headers, ...dataRows]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    })

    console.log(`✅ Exported ${leads.length} leads to "Leads Data" sheet`)

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

    return leads
  } catch (error) {
    console.error('❌ Error exporting leads data:', error)
    throw error
  }
}

async function exportEmailCampaign(auth, spreadsheetId, leads) {
  try {
    console.log('📧 Preparing email campaign data...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    // Filter leads with emails
    const emailLeads = leads.filter(lead => lead.email && lead.email.trim())

    // Prepare email campaign headers
    const campaignHeaders = [
      'ID',
      'GitHub Username',
      'Email',
      'Repository Name',
      'Repository Description',
      'Email Subject',
      'Email Content',
      'Demo Link',
      'Unsubscribe Link',
      'Status',
      'Validation Status',
      'Created At'
    ]

    // Prepare email campaign data
    const campaignData = emailLeads.map(lead => {
      const demoLink = `https://xeinst.com/demo?ref=${lead.github_username}`
      const unsubscribeLink = `https://xeinst.com/unsubscribe?email=${encodeURIComponent(lead.email)}&id=${lead.id}`
      
      return [
        lead.id,
        lead.github_username || '',
        lead.email,
        lead.repo_name || '',
        lead.repo_description || '',
        lead.email_subject || `Automate your ${lead.repo_name || 'workflows'} with XEINST`,
        lead.email_template || `Hi ${lead.github_username || 'there'}! I noticed your ${lead.repo_name || 'automation project'} and thought you might be interested in XEINST for workflow automation.`,
        demoLink,
        unsubscribeLink,
        lead.campaign_status || 'pending',
        lead.validation_status || 'unknown',
        lead.created_at || ''
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

    return emailLeads
  } catch (error) {
    console.error('❌ Error exporting email campaign:', error)
    throw error
  }
}

async function exportAnalytics(auth, spreadsheetId, leads, emailLeads) {
  try {
    console.log('📊 Preparing analytics data...')
    
    const sheets = google.sheets({ version: 'v4', auth })

    // Calculate analytics
    const totalLeads = leads.length
    const leadsWithEmails = emailLeads.length
    const successRate = totalLeads > 0 ? Math.round((leadsWithEmails / totalLeads) * 100) : 0
    
    // Email domain analysis
    const emailDomains = {}
    emailLeads.forEach(lead => {
      if (lead.email) {
        const domain = lead.email.split('@')[1]
        emailDomains[domain] = (emailDomains[domain] || 0) + 1
      }
    })
    
    const topDomains = Object.entries(emailDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    // Activity analysis
    const recentLeads = leads.filter(lead => {
      if (!lead.last_activity) return false
      const lastActivity = new Date(lead.last_activity)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceActivity <= 30
    })

    // Prepare analytics data
    const analyticsData = [
      ['Metric', 'Value'],
      ['Total Leads', totalLeads],
      ['Leads with Emails', leadsWithEmails],
      ['Success Rate (%)', successRate],
      ['Recent Activity (30 days)', recentLeads.length],
      ['', ''],
      ['Top Email Domains', 'Count'],
      ...topDomains.map(([domain, count]) => [domain, count]),
      ['', ''],
      ['Campaign Status', 'Count'],
      ['Pending', leads.filter(l => l.campaign_status === 'pending').length],
      ['Ready', leads.filter(l => l.campaign_status === 'ready').length],
      ['Sent', leads.filter(l => l.campaign_status === 'sent').length],
      ['', ''],
      ['Last Updated', new Date().toISOString()]
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

async function exportToGoogleSheets() {
  console.log('🚀 Starting Google Sheets export...')
  console.log('=====================================\n')

  try {
    // Get Google Auth client
    const auth = await getGoogleAuthClient()
    console.log('✅ Google Auth configured')

    // Create new spreadsheet
    const timestamp = new Date().toISOString().split('T')[0]
    const spreadsheetTitle = `XEINST Leads Data - ${timestamp}`
    const spreadsheetId = await createNewSpreadsheet(auth, spreadsheetTitle)

    // Export leads data
    const leads = await exportLeadsData(auth, spreadsheetId)

    // Export email campaign data
    const emailLeads = await exportEmailCampaign(auth, spreadsheetId, leads)

    // Export analytics
    await exportAnalytics(auth, spreadsheetId, leads, emailLeads)

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
        ],
      },
    })

    console.log('\n🎉 Google Sheets export completed successfully!')
    console.log('===============================================')
    console.log(`📊 Spreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}`)
    console.log(`📈 Total leads exported: ${leads.length}`)
    console.log(`📧 Email campaign entries: ${emailLeads.length}`)
    console.log(`📊 Success rate: ${Math.round((emailLeads.length / leads.length) * 100)}%`)
    
    console.log('\n📋 SHEET CONTENTS:')
    console.log('==================')
    console.log('📊 Leads Data: Complete lead information')
    console.log('📧 Email Campaign: Ready-to-use email campaign data')
    console.log('📈 Analytics: Key metrics and insights')
    
    console.log('\n💡 NEXT STEPS:')
    console.log('==============')
    console.log('1. Review the data in Google Sheets')
    console.log('2. Use Email Campaign sheet for your email marketing')
    console.log('3. Monitor analytics for insights')
    console.log('4. Share the spreadsheet with your team')
    console.log('5. Set up automated exports if needed')

    // Save spreadsheet ID for future reference
    const configPath = path.join(__dirname, '..', 'google-sheets-config.json')
    fs.writeFileSync(configPath, JSON.stringify({
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      lastExport: new Date().toISOString(),
      totalLeads: leads.length,
      emailLeads: emailLeads.length
    }, null, 2))

    console.log(`\n💾 Configuration saved to: ${configPath}`)

  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

// Run the export
if (require.main === module) {
  exportToGoogleSheets()
    .then(() => {
      console.log('\n✨ Google Sheets export completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Google Sheets export failed:', error)
      process.exit(1)
    })
}

module.exports = { exportToGoogleSheets } 