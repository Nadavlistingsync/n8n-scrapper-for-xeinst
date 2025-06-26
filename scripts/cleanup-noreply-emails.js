#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { supabase } = require('../lib/supabase.js')

async function cleanupNoreplyEmails() {
  console.log('🧹 Starting cleanup of noreply emails...\n')
  
  try {
    // Get all leads with noreply emails
    const { data: noreplyLeads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .or('email.ilike.%noreply%,email.ilike.%no-reply%,email.ilike.%no_reply%')
    
    if (fetchError) {
      console.error('❌ Error fetching noreply leads:', fetchError)
      return
    }
    
    if (!noreplyLeads || noreplyLeads.length === 0) {
      console.log('✅ No noreply emails found to clean up')
      return
    }
    
    console.log(`📧 Found ${noreplyLeads.length} leads with noreply emails`)
    
    // Show some examples
    console.log('\n📋 Examples of noreply emails found:')
    noreplyLeads.slice(0, 10).forEach(lead => {
      console.log(`   - ${lead.github_username}: ${lead.email}`)
    })
    
    if (noreplyLeads.length > 10) {
      console.log(`   ... and ${noreplyLeads.length - 10} more`)
    }
    
    // Delete all noreply leads
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .or('email.ilike.%noreply%,email.ilike.%no-reply%,email.ilike.%no_reply%')
    
    if (deleteError) {
      console.error('❌ Error deleting noreply leads:', deleteError)
      return
    }
    
    console.log(`\n✅ Successfully removed ${noreplyLeads.length} leads with noreply emails`)
    
    // Get updated count
    const { count: remainingCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error getting remaining count:', countError)
    } else {
      console.log(`📊 Remaining leads in database: ${remainingCount}`)
    }
    
    console.log('\n✨ Cleanup completed successfully')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupNoreplyEmails()
    .then(() => {
      console.log('\n✨ Noreply email cleanup completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Noreply email cleanup failed:', error)
      process.exit(1)
    })
}

module.exports = { cleanupNoreplyEmails } 