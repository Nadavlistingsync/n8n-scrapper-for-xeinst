#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

console.log('🧹 Cleaning up database - removing leads without emails...')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupNoEmails() {
  try {
    console.log('📊 Checking current database state...')
    
    // Get total count
    const { count: totalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    // Get count of leads without emails
    const { count: noEmailCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .or('email.is.null,email.eq.')
    
    // Get count of leads with emails
    const { count: withEmailCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null)
      .neq('email', '')
    
    console.log(`📈 Database Summary:`)
    console.log(`   Total leads: ${totalCount}`)
    console.log(`   Leads without emails: ${noEmailCount}`)
    console.log(`   Leads with emails: ${withEmailCount}`)
    
    if (noEmailCount === 0) {
      console.log('✅ No leads without emails found. Database is already clean!')
      return
    }
    
    console.log(`\n🗑️  Deleting ${noEmailCount} leads without emails...`)
    
    // Delete leads without emails
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .or('email.is.null,email.eq.')
    
    if (deleteError) {
      console.error('❌ Error deleting leads without emails:', deleteError)
      return
    }
    
    console.log('✅ Successfully deleted leads without emails!')
    
    // Verify the cleanup
    console.log('\n📊 Verifying cleanup...')
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📈 Final Database State:`)
    console.log(`   Total leads remaining: ${finalCount}`)
    console.log(`   All remaining leads have emails: ✅`)
    
    // Show a few examples of remaining leads
    const { data: sampleLeads } = await supabase
      .from('leads')
      .select('github_username, repo_name, email')
      .limit(5)
    
    if (sampleLeads && sampleLeads.length > 0) {
      console.log('\n📝 Sample of remaining leads:')
      sampleLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. ${lead.github_username}/${lead.repo_name} (${lead.email})`)
      })
    }
    
    console.log('\n🎉 Database cleanup completed successfully!')
    console.log('📧 Only leads with valid email addresses remain.')
    
  } catch (error) {
    console.error('💥 Error during cleanup:', error)
  }
}

cleanupNoEmails(); 