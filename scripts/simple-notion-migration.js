#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Client } = require('@notionhq/client')
const fs = require('fs')
const path = require('path')

// Notion setup
const notion = new Client({ auth: process.env.NOTION_API_KEY })
const databaseId = process.env.NOTION_DATABASE_ID || '21e2be81198f80ed8a84ffd120c04fab'

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

async function exportToCSV(notionData) {
  console.log('📊 Exporting Notion data to CSV...')
  
  try {
    // Parse Notion data
    const parsedData = notionData.map(parseNotionProperties)
    
    console.log(`📈 Processed ${parsedData.length} records from Notion`)

    // Prepare headers
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

    // Create CSV content
    const csvContent = [headers, ...dataRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'exports')
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true })
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `notion-migration-${timestamp}.csv`
    const filepath = path.join(exportsDir, filename)

    // Write CSV file
    fs.writeFileSync(filepath, csvContent, 'utf8')

    console.log(`✅ Exported ${parsedData.length} records to CSV`)
    console.log(`📁 File saved: ${filepath}`)

    // Create email campaign CSV
    const emailRecords = parsedData.filter(record => record.email && record.email.trim())
    
    let emailFilepath = null
    
    if (emailRecords.length > 0) {
      const emailHeaders = [
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

      const emailData = emailRecords.map(record => {
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

      const emailCsvContent = [emailHeaders, ...emailData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const emailFilename = `notion-email-campaign-${timestamp}.csv`
      emailFilepath = path.join(exportsDir, emailFilename)

      fs.writeFileSync(emailFilepath, emailCsvContent, 'utf8')

      console.log(`✅ Exported ${emailRecords.length} email campaign entries`)
      console.log(`📁 Email campaign saved: ${emailFilepath}`)
    }

    // Create analytics summary
    const analytics = {
      totalRecords: parsedData.length,
      recordsWithEmails: parsedData.filter(r => r.email).length,
      successRate: Math.round((parsedData.filter(r => r.email).length / parsedData.length) * 100),
      emailSentCount: parsedData.filter(r => r.email_sent).length,
      emailApprovedCount: parsedData.filter(r => r.email_approved).length,
      emailPendingCount: parsedData.filter(r => r.email_pending_approval).length,
      migrationDate: new Date().toISOString()
    }

    const analyticsFilename = `notion-analytics-${timestamp}.json`
    const analyticsFilepath = path.join(exportsDir, analyticsFilename)

    fs.writeFileSync(analyticsFilepath, JSON.stringify(analytics, null, 2), 'utf8')

    console.log(`✅ Analytics saved: ${analyticsFilepath}`)

    return {
      parsedData,
      emailRecords,
      analytics,
      csvFile: filepath,
      emailCsvFile: emailFilepath,
      analyticsFile: analyticsFilepath
    }

  } catch (error) {
    console.error('❌ Error exporting data:', error)
    throw error
  }
}

async function simpleNotionMigration() {
  const startTime = new Date()
  
  console.log('🚀 Starting Simple Notion Migration')
  console.log('====================================\n')

  try {
    // Check Notion API key
    if (!process.env.NOTION_API_KEY) {
      console.error('❌ NOTION_API_KEY environment variable not set')
      console.log('Please add NOTION_API_KEY to your .env.local file')
      process.exit(1)
    }

    // Fetch all data from Notion
    const notionData = await fetchAllNotionData()
    
    if (notionData.length === 0) {
      console.log('❌ No data found in Notion database')
      process.exit(1)
    }

    // Export to CSV files
    const result = await exportToCSV(notionData)

    const endTime = new Date()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log('\n🎉 Migration completed successfully!')
    console.log('=====================================')
    console.log(`📈 Total records migrated: ${result.parsedData.length}`)
    console.log(`📧 Email campaign entries: ${result.emailRecords.length}`)
    console.log(`⏱️  Migration duration: ${duration} seconds`)
    
    console.log('\n📋 EXPORTED FILES:')
    console.log('==================')
    console.log(`📊 Complete Data: ${result.csvFile}`)
    console.log(`📧 Email Campaign: ${result.emailCsvFile}`)
    console.log(`📈 Analytics: ${result.analyticsFile}`)
    
    console.log('\n📊 MIGRATION SUMMARY:')
    console.log('=====================')
    console.log(`Total Records: ${result.analytics.totalRecords}`)
    console.log(`Records with Emails: ${result.analytics.recordsWithEmails}`)
    console.log(`Success Rate: ${result.analytics.successRate}%`)
    console.log(`Email Sent: ${result.analytics.emailSentCount}`)
    console.log(`Email Approved: ${result.analytics.emailApprovedCount}`)
    console.log(`Email Pending: ${result.analytics.emailPendingCount}`)
    
    console.log('\n💡 NEXT STEPS:')
    console.log('==============')
    console.log('1. Import the CSV files into Google Sheets manually')
    console.log('2. Use the email campaign CSV for your email marketing')
    console.log('3. Review the analytics for insights')
    console.log('4. Set up automated workflows in Google Sheets')
    console.log('5. Consider archiving the Notion database')

    // Save migration config
    const configPath = path.join(__dirname, '..', 'simple-migration-config.json')
    fs.writeFileSync(configPath, JSON.stringify({
      migrationDate: new Date().toISOString(),
      totalRecords: result.parsedData.length,
      emailRecords: result.emailRecords.length,
      duration: duration,
      source: 'Notion',
      destination: 'CSV Files',
      files: {
        completeData: result.csvFile,
        emailCampaign: result.emailCsvFile,
        analytics: result.analyticsFile
      }
    }, null, 2))

    console.log(`\n💾 Migration config saved to: ${configPath}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  simpleNotionMigration()
    .then(() => {
      console.log('\n✨ Simple Notion migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { simpleNotionMigration } 