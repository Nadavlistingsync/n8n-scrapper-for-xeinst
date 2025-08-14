#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteFirst15Leads() {
  try {
    console.log('🗑️  Deleting first 15 leads from database...');
    
    // Get the first 15 leads ordered by creation date
    const { data: leadsToDelete, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(15);
    
    if (fetchError) {
      console.error('❌ Failed to fetch leads for deletion:', fetchError);
      return false;
    }
    
    if (!leadsToDelete || leadsToDelete.length === 0) {
      console.log('⚠️  No leads found to delete');
      return true;
    }
    
    console.log(`📋 Found ${leadsToDelete.length} leads to delete:`);
    leadsToDelete.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.github_username}/${lead.repo_name} - ${lead.email}`);
    });
    
    // Delete each lead by ID
    let deletedCount = 0;
    for (const lead of leadsToDelete) {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);
      
      if (deleteError) {
        console.error(`❌ Failed to delete lead ${lead.github_username}/${lead.repo_name}:`, deleteError);
      } else {
        console.log(`✅ Deleted: ${lead.github_username}/${lead.repo_name}`);
        deletedCount++;
      }
    }
    
    console.log(`\n🗑️  Successfully deleted ${deletedCount} leads`);
    return true;
    
  } catch (error) {
    console.error('❌ Error during deletion process:', error);
    return false;
  }
}

// Run the deletion
if (require.main === module) {
  deleteFirst15Leads()
    .then((success) => {
      if (success) {
        console.log('\n✨ Deletion completed successfully');
        process.exit(0);
      } else {
        console.log('\n💥 Deletion failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteFirst15Leads }; 