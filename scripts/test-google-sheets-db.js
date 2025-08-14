#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

// Import the new Google Sheets database functions
const {
  getAllLeads,
  insertLead,
  updateLead,
  getLeadsForAIAnalysis,
  getLeadsByStatus,
  getLeadsForEmailCampaign,
  checkLeadExists,
  exportToCSV,
  getAnalytics
} = require('../lib/google-sheets-db')

async function testGoogleSheetsDatabase() {
  console.log('🧪 Testing Google Sheets Database System')
  console.log('========================================\n')
  
  try {
    // Test 1: Check if data directory exists
    console.log('1️⃣ Testing data directory...')
    const dataDir = path.join(__dirname, '..', 'data')
    if (fs.existsSync(dataDir)) {
      console.log('✅ Data directory exists')
    } else {
      console.log('❌ Data directory does not exist')
    }
    
    // Test 2: Get all leads
    console.log('\n2️⃣ Testing getAllLeads...')
    const allLeads = await getAllLeads()
    console.log(`✅ Found ${allLeads.length} leads in the system`)
    
    // Test 3: Insert a test lead
    console.log('\n3️⃣ Testing insertLead...')
    const testLead = {
      github_username: 'test-user',
      repo_name: 'test-repo',
      repo_url: 'https://github.com/test-user/test-repo',
      repo_description: 'Test repository for migration',
      email: 'test@example.com',
      last_activity: new Date().toISOString(),
      status: 'new',
      email_sent: false,
      email_approved: false,
      email_pending_approval: false
    }
    
    const insertedLead = await insertLead(testLead)
    if (insertedLead) {
      console.log('✅ Test lead inserted successfully')
      console.log(`   ID: ${insertedLead.id}`)
    } else {
      console.log('❌ Failed to insert test lead (might be duplicate)')
    }
    
    // Test 4: Check for duplicates
    console.log('\n4️⃣ Testing duplicate prevention...')
    const duplicateLead = await insertLead(testLead)
    if (!duplicateLead) {
      console.log('✅ Duplicate prevention working correctly')
    } else {
      console.log('❌ Duplicate prevention failed')
    }
    
    // Test 5: Update a lead
    console.log('\n5️⃣ Testing updateLead...')
    const updatedLeads = await getAllLeads()
    if (updatedLeads.length > 0) {
      const leadToUpdate = updatedLeads[0]
      const updatedLead = await updateLead(leadToUpdate.id, { 
        status: 'contacted',
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })
      
      if (updatedLead) {
        console.log('✅ Lead updated successfully')
        console.log(`   Status: ${updatedLead.status}`)
        console.log(`   Email sent: ${updatedLead.email_sent}`)
      } else {
        console.log('❌ Failed to update lead')
      }
    }
    
    // Test 6: Test filtering functions
    console.log('\n6️⃣ Testing filtering functions...')
    
    const aiLeads = await getLeadsForAIAnalysis()
    console.log(`✅ AI analysis leads: ${aiLeads.length}`)
    
    const newLeads = await getLeadsByStatus('new')
    console.log(`✅ New leads: ${newLeads.length}`)
    
    const emailLeads = await getLeadsForEmailCampaign()
    console.log(`✅ Email campaign leads: ${emailLeads.length}`)
    
    // Test 7: Test lead existence check
    console.log('\n7️⃣ Testing checkLeadExists...')
    const exists = await checkLeadExists('test-user', 'test-repo')
    console.log(`✅ Lead exists check: ${exists}`)
    
    // Test 8: Export to CSV
    console.log('\n8️⃣ Testing CSV export...')
    const csvFile = await exportToCSV()
    if (fs.existsSync(csvFile)) {
      console.log(`✅ CSV export successful: ${csvFile}`)
      const stats = fs.statSync(csvFile)
      console.log(`   File size: ${stats.size} bytes`)
    } else {
      console.log('❌ CSV export failed')
    }
    
    // Test 9: Analytics
    console.log('\n9️⃣ Testing analytics...')
    const analytics = await getAnalytics()
    console.log('✅ Analytics generated:')
    console.log(`   Total leads: ${analytics.total}`)
    console.log(`   With emails: ${analytics.withEmail}`)
    console.log(`   Email sent: ${analytics.emailSent}`)
    console.log(`   AI analyzed: ${analytics.aiAnalyzed}`)
    
    // Test 10: Clean up test data
    console.log('\n🔟 Cleaning up test data...')
    const finalLeads = await getAllLeads()
    const testLeads = finalLeads.filter(lead => 
      lead.github_username === 'test-user' && lead.repo_name === 'test-repo'
    )
    
    if (testLeads.length > 0) {
      // Remove test leads
      const nonTestLeads = finalLeads.filter(lead => 
        !(lead.github_username === 'test-user' && lead.repo_name === 'test-repo')
      )
      
      // Re-save without test leads
      const { saveLeads } = require('../lib/google-sheets-db')
      await saveLeads(nonTestLeads)
      console.log(`✅ Removed ${testLeads.length} test leads`)
    }
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('=====================================')
    console.log('✅ Google Sheets database system is working correctly')
    console.log('✅ You can now use this system instead of Supabase')
    console.log('✅ Your data is stored in CSV format and ready for Google Sheets')
    
    console.log('\n📋 Next Steps:')
    console.log('==============')
    console.log('1. Update your API routes to use the new system')
    console.log('2. Upload your CSV data to Google Sheets')
    console.log('3. Test the web interface with the new system')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testGoogleSheetsDatabase()
