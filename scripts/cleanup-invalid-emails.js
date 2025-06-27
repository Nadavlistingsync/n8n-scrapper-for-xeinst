#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { supabase } = require('../lib/supabase.js')

async function cleanupInvalidEmails() {
  console.log('🧹 Starting cleanup of invalid emails...\n')
  
  try {
    // Get all leads
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching leads:', fetchError)
      return
    }
    
    if (!leads || leads.length === 0) {
      console.log('✅ No leads found')
      return
    }
    
    // Clean and validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const cleanedLeads = leads.map(lead => {
      if (!lead.email) return lead;
      // Remove quotes, parentheses, and whitespace
      const cleanedEmail = lead.email.replace(/["'()\s]/g, '');
      return { ...lead, cleanedEmail };
    });

    // Find leads with invalid emails (after cleaning)
    const invalidLeads = cleanedLeads.filter(lead => {
      return !emailRegex.test(lead.cleanedEmail || '');
    });
    const fixableLeads = cleanedLeads.filter(lead =>
      lead.email !== lead.cleanedEmail && emailRegex.test(lead.cleanedEmail || '')
    );

    // Update fixable leads in Supabase
    for (const lead of fixableLeads) {
      await supabase
        .from('leads')
        .update({ email: lead.cleanedEmail })
        .eq('github_username', lead.github_username)
        .eq('repo_name', lead.repo_name);
      console.log(`🔧 Fixed email for ${lead.github_username}: ${lead.email} -> ${lead.cleanedEmail}`);
    }
    
    if (invalidLeads.length === 0) {
      console.log('✅ No invalid emails found')
      return
    }
    
    console.log(`📧 Found ${invalidLeads.length} leads with invalid emails`)
    
    // Show examples
    console.log('\n📋 Examples of invalid emails found:')
    invalidLeads.forEach(lead => {
      console.log(`   - ${lead.github_username}: ${lead.email}`)
    })
    
    // Delete invalid leads
    const invalidUsernames = invalidLeads.map(lead => lead.github_username)
    const invalidRepoNames = invalidLeads.map(lead => lead.repo_name)
    
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('github_username', invalidUsernames)
      .in('repo_name', invalidRepoNames)
    
    if (deleteError) {
      console.error('❌ Error deleting invalid leads:', deleteError)
      return
    }
    
    console.log(`\n✅ Successfully removed ${invalidLeads.length} leads with invalid emails`)
    
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
  cleanupInvalidEmails()
    .then(() => {
      console.log('\n✨ Invalid email cleanup completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Invalid email cleanup failed:', error)
      process.exit(1)
    })
}

module.exports = { cleanupInvalidEmails } 