const { getLeads, deleteAllLeads } = require('../lib/supabase');
const { insertLeadToNotion } = require('../lib/notion');

(async () => {
  console.log('Fetching all leads from Supabase...');
  const leads = await getLeads();
  if (!leads.length) {
    console.log('No leads found in Supabase.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const lead of leads) {
    const result = await insertLeadToNotion(lead);
    if (result) {
      console.log(`✅ Inserted lead: ${lead.github_username} / ${lead.repo_name}`);
      successCount++;
    } else {
      console.log(`❌ Failed to insert lead: ${lead.github_username} / ${lead.repo_name}`);
      failCount++;
    }
  }

  if (successCount > 0) {
    console.log('Deleting all leads from Supabase...');
    const deleted = await deleteAllLeads();
    if (deleted) {
      console.log('✅ All leads deleted from Supabase.');
    } else {
      console.log('❌ Failed to delete leads from Supabase.');
    }
  }

  console.log(`Migration complete. Success: ${successCount}, Failed: ${failCount}`);
})(); 