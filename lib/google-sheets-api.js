const { google } = require('googleapis')
const path = require('path')

// Google Sheets API Configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

class GoogleSheetsAPI {
  constructor(config) {
    this.config = config
  }

  async initialize() {
    try {
      // Load credentials from file - resolve path from project root
      const credentialsPath = path.resolve(process.cwd(), this.config.credentialsPath)
      const credentials = require(credentialsPath)
      
      // Create auth client
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      })

      // Create sheets client
      this.sheets = google.sheets({ version: 'v4', auth: this.auth })

      // Test connection
      await this.testConnection()
      
      console.log('✅ Google Sheets API initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets API:', error)
      return false
    }
  }

  async testConnection() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
        ranges: ['A1:A1'],
      })
      
      console.log(`✅ Connected to spreadsheet: ${response.data.properties?.title}`)
      return true
    } catch (error) {
      throw new Error(`Failed to connect to spreadsheet: ${error}`)
    }
  }

  // Create or get sheet by name
  async ensureSheet(sheetName) {
    try {
      // Check if sheet exists
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      })

      const sheetExists = response.data.sheets?.some(
        (sheet) => sheet.properties?.title === sheetName
      )

      if (!sheetExists) {
        // Create new sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.config.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                    gridProperties: {
                      rowCount: 10000,
                      columnCount: 20,
                    },
                  },
                },
              },
            ],
          },
        })

        console.log(`✅ Created sheet: ${sheetName}`)
      }

      return true
    } catch (error) {
      console.error(`❌ Failed to ensure sheet ${sheetName}:`, error)
      return false
    }
  }

  // Sync leads to Google Sheets (simplified - Gmail emails + github_username only)
  async syncLeads(leads) {
    try {
      await this.ensureSheet('Leads')

      // Filter to only Gmail emails
      const gmailLeads = leads.filter(lead => {
        if (!lead.email) return false
        const emailLower = lead.email.toLowerCase().trim()
        return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
      })

      // Prepare simplified headers (email + github_username only)
      const headers = ['Email', 'GitHub Username']

      // Prepare simplified data (Gmail emails + github_username only)
      const data = gmailLeads.map(lead => [
        lead.email || '',
        lead.github_username || ''
      ])

      // Clear existing data and write new data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Leads!A:Z',
      })

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Leads!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...data]
        }
      })

      // Auto-resize columns
      await this.autoResizeColumns('Leads', headers.length)

      console.log(`✅ Synced ${leads.length} leads to Google Sheets`)
      return true
    } catch (error) {
      console.error('❌ Failed to sync leads:', error)
      return false
    }
  }

  // Sync email campaign data
  async syncEmailCampaign(leads) {
    try {
      await this.ensureSheet('Email Campaigns')

      // Filter leads ready for email campaign
      const emailLeads = leads.filter(lead => 
        lead.email && 
        !lead.email_sent && 
        lead.email_approved === true &&
        lead.status === 'new'
      )

      const headers = [
        'Email', 'GitHub Username', 'Repository Name', 'Repository URL', 'Description',
        'Last Activity', 'AI Score', 'AI Recommendation', 'Status'
      ]

      const data = emailLeads.map(lead => [
        lead.email,
        lead.github_username,
        lead.repo_name,
        lead.repo_url,
        lead.repo_description || '',
        lead.last_activity,
        lead.ai_score?.toString() || '',
        lead.ai_recommendation || '',
        lead.status
      ])

      // Clear and write data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Email Campaigns!A:Z',
      })

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Email Campaigns!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...data]
        }
      })

      await this.autoResizeColumns('Email Campaigns', headers.length)

      console.log(`✅ Synced ${emailLeads.length} email campaign leads`)
      return true
    } catch (error) {
      console.error('❌ Failed to sync email campaign:', error)
      return false
    }
  }

  // Sync analytics
  async syncAnalytics(analytics) {
    try {
      await this.ensureSheet('Analytics')

      const headers = ['Metric', 'Value']
      const data = [
        ['Total Leads', analytics.total],
        ['With Emails', analytics.withEmail],
        ['Email Sent', analytics.emailSent],
        ['Email Approved', analytics.emailApproved],
        ['AI Analyzed', analytics.aiAnalyzed],
        ['', ''], // Empty row
        ['Status Breakdown', ''],
        ['New', analytics.byStatus.new],
        ['Contacted', analytics.byStatus.contacted],
        ['Responded', analytics.byStatus.responded],
        ['Converted', analytics.byStatus.converted],
        ['', ''], // Empty row
        ['AI Recommendations', ''],
        ['Approve', analytics.aiRecommendations.approve],
        ['Reject', analytics.aiRecommendations.reject],
        ['Review', analytics.aiRecommendations.review],
        ['', ''], // Empty row
        ['Last Updated', new Date().toISOString()]
      ]

      // Clear and write data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Analytics!A:Z',
      })

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Analytics!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...data]
        }
      })

      await this.autoResizeColumns('Analytics', headers.length)

      console.log('✅ Synced analytics to Google Sheets')
      return true
    } catch (error) {
      console.error('❌ Failed to sync analytics:', error)
      return false
    }
  }

  // Create backup sheet
  async createBackup(leads) {
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const sheetName = `Backup-${timestamp}`
      
      await this.ensureSheet(sheetName)

      const headers = [
        'ID', 'GitHub Username', 'Repository Name', 'Repository URL', 'Description',
        'Email', 'Last Activity', 'Created At', 'Email Sent', 'Email Sent At',
        'Status', 'Email Approved', 'Email Pending', 'AI Score', 'AI Recommendation', 'AI Analysis'
      ]

      const data = leads.map(lead => [
        lead.id,
        lead.github_username,
        lead.repo_name,
        lead.repo_url,
        lead.repo_description || '',
        lead.email || '',
        lead.last_activity,
        lead.created_at,
        lead.email_sent ? 'Yes' : 'No',
        lead.email_sent_at || '',
        lead.status,
        lead.email_approved ? 'Yes' : 'No',
        lead.email_pending_approval ? 'Yes' : 'No',
        lead.ai_score?.toString() || '',
        lead.ai_recommendation || '',
        lead.ai_analysis || ''
      ])

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...data]
        }
      })

      await this.autoResizeColumns(sheetName, headers.length)

      console.log(`✅ Created backup: ${sheetName}`)
      return true
    } catch (error) {
      console.error('❌ Failed to create backup:', error)
      return false
    }
  }

  // Auto-resize columns for better readability
  async autoResizeColumns(sheetName, columnCount) {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        requestBody: {
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: await this.getSheetId(sheetName),
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: columnCount,
                },
              },
            },
          ],
        },
      })
    } catch (error) {
      console.warn('⚠️ Failed to auto-resize columns:', error)
    }
  }

  // Get sheet ID by name
  async getSheetId(sheetName) {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.config.spreadsheetId,
    })

    const sheet = response.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    )

    return sheet?.properties?.sheetId || 0
  }

  // Get spreadsheet URL
  getSpreadsheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}`
  }
}

// Export singleton instance
let googleSheetsAPI = null

async function initializeGoogleSheetsAPI() {
  if (googleSheetsAPI) {
    return googleSheetsAPI
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH

  if (!spreadsheetId || !credentialsPath) {
    console.warn('⚠️ Google Sheets API not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_CREDENTIALS_PATH')
    return null
  }

  googleSheetsAPI = new GoogleSheetsAPI({
    spreadsheetId,
    credentialsPath,
  })

  const initialized = await googleSheetsAPI.initialize()
  return initialized ? googleSheetsAPI : null
}

async function syncToGoogleSheets(leads, analytics) {
  const api = await initializeGoogleSheetsAPI()
  if (!api) {
    console.warn('⚠️ Google Sheets API not available')
    return false
  }

  try {
    // Sync all data
    await api.syncLeads(leads)
    await api.syncEmailCampaign(leads)
    
    if (analytics) {
      await api.syncAnalytics(analytics)
    }

    // Create backup every 100 leads
    if (leads.length % 100 === 0) {
      await api.createBackup(leads)
    }

    console.log(`✅ Successfully synced ${leads.length} leads to Google Sheets`)
    console.log(`📊 View at: ${api.getSpreadsheetUrl()}`)
    
    return true
  } catch (error) {
    console.error('❌ Failed to sync to Google Sheets:', error)
    return false
  }
}

module.exports = {
  GoogleSheetsAPI,
  initializeGoogleSheetsAPI,
  syncToGoogleSheets
}
