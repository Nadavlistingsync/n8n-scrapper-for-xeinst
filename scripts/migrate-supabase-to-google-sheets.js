#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure the following are set in .env.local:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Google Sheets CSV setup
const DATA_DIR = path.join(__dirname, '..', 'data')
const LEADS_FILE = path.join(DATA_DIR, 'leads.csv')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function leadToCSVRow(lead) {
  return [
    lead.id,
    lead.github_username,
    lead.repo_name,
    lead.repo_url,
    lead.repo_description || '',
    lead.email || '',
    lead.last_activity,
    lead.created_at,
    lead.email_sent ? 'true' : 'false',
    lead.email_sent_at || '',
    lead.status,
    lead.email_approved ? 'true' : 'false',
    lead.email_pending_approval ? 'true' : 'false',
    lead.ai_score?.toString() || '',
    lead.ai_recommendation || '',
    lead.ai_analysis || ''
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
}

async function fetchAllSupabaseLeads() {
  console.log('📊 Fetching all leads from Supabase...')
  
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching leads from Supabase:', error)
      return []
    }
    
    console.log(`✅ Found ${data.length} leads in Supabase`)
    return data || []
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error)
    return []
  }
}

async function saveLeadsToCSV(leads) {
  ensureDataDirectory()
  
  const headers = [
    'id', 'github_username', 'repo_name', 'repo_url', 'repo_description',
    'email', 'last_activity', 'created_at', 'email_sent', 'email_sent_at',
    'status', 'email_approved', 'email_pending_approval', 'ai_score',
    'ai_recommendation', 'ai_analysis'
  ]
  
  const csvContent = [
    headers.join(','),
    ...leads.map(lead => leadToCSVRow(lead))
  ].join('\n')
  
  // Save to main file
  fs.writeFileSync(LEADS_FILE, csvContent)
  
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(BACKUP_DIR, `supabase-migration-${timestamp}.csv`)
  fs.writeFileSync(backupFile, csvContent)
  
  // Create export file for Google Sheets
  const exportHeaders = [
    'ID', 'GitHub Username', 'Repository Name', 'Repository URL', 'Description',
    'Email', 'Last Activity', 'Created At', 'Email Sent', 'Email Sent At',
    'Status', 'Email Approved', 'Email Pending', 'AI Score', 'AI Recommendation', 'AI Analysis'
  ]
  
  const exportContent = [
    exportHeaders.join(','),
    ...leads.map(lead => leadToCSVRow(lead))
  ].join('\n')
  
  const exportTimestamp = new Date().toISOString().split('T')[0]
  const exportFile = path.join(DATA_DIR, `leads-export-${exportTimestamp}.csv`)
  fs.writeFileSync(exportFile, exportContent)
  
  return { mainFile: LEADS_FILE, backupFile, exportFile }
}

async function createAnalyticsReport(leads) {
  const analytics = {
    total: leads.length,
    byStatus: {
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      responded: leads.filter(l => l.status === 'responded').length,
      converted: leads.filter(l => l.status === 'converted').length
    },
    withEmail: leads.filter(l => l.email).length,
    emailSent: leads.filter(l => l.email_sent).length,
    emailApproved: leads.filter(l => l.email_approved).length,
    aiAnalyzed: leads.filter(l => l.ai_score).length,
    aiRecommendations: {
      approve: leads.filter(l => l.ai_recommendation === 'approve').length,
      reject: leads.filter(l => l.ai_recommendation === 'reject').length,
      review: leads.filter(l => l.ai_recommendation === 'review').length
    }
  }
  
  const analyticsFile = path.join(DATA_DIR, `analytics-${new Date().toISOString().split('T')[0]}.json`)
  fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2))
  
  return analytics
}

async function migrateSupabaseToGoogleSheets() {
  console.log('🚀 Starting Supabase to Google Sheets Migration')
  console.log('================================================\n')
  
  try {
    // Fetch all leads from Supabase
    const leads = await fetchAllSupabaseLeads()
    
    if (leads.length === 0) {
      console.log('❌ No leads found in Supabase')
      console.log('This could mean:')
      console.log('1. Your Supabase credentials are incorrect')
      console.log('2. The leads table doesn\'t exist')
      console.log('3. There are no leads in the database')
      process.exit(1)
    }
    
    // Save leads to CSV files
    console.log('\n💾 Saving leads to CSV files...')
    const files = await saveLeadsToCSV(leads)
    
    // Create analytics report
    console.log('\n📊 Creating analytics report...')
    const analytics = await createAnalyticsReport(leads)
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('=====================================')
    console.log(`📊 Total leads migrated: ${leads.length}`)
    console.log(`💾 Main data file: ${files.mainFile}`)
    console.log(`📁 Backup file: ${files.backupFile}`)
    console.log(`📤 Google Sheets export: ${files.exportFile}`)
    console.log(`📈 Analytics report: ${path.join(DATA_DIR, `analytics-${new Date().toISOString().split('T')[0]}.json`)}`)
    
    console.log('\n📋 Next Steps:')
    console.log('==============')
    console.log('1. Upload the CSV file to Google Sheets:')
    console.log(`   - Open Google Sheets: https://sheets.google.com`)
    console.log(`   - Create a new spreadsheet`)
    console.log(`   - Go to File > Import > Upload > Select: ${files.exportFile}`)
    console.log('2. Update your application to use the new Google Sheets system')
    console.log('3. Test the new system with: node scripts/test-google-sheets-db.js')
    
    console.log('\n📊 Migration Summary:')
    console.log('====================')
    console.log(`Total leads: ${analytics.total}`)
    console.log(`With emails: ${analytics.withEmail}`)
    console.log(`Email sent: ${analytics.emailSent}`)
    console.log(`Email approved: ${analytics.emailApproved}`)
    console.log(`AI analyzed: ${analytics.aiAnalyzed}`)
    console.log(`Status breakdown:`)
    Object.entries(analytics.byStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateSupabaseToGoogleSheets()
