require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeads() {
  try {
    console.log('🔍 Checking total leads in database...');
    
    const { data, error } = await supabase
      .from('leads')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching leads:', error);
      return;
    }
    
    console.log(`📊 Total leads in database: ${data.length}`);
    
    // Count leads with emails
    const leadsWithEmails = data.filter(lead => lead.email);
    console.log(`📧 Leads with emails: ${leadsWithEmails.length}`);
    
    // Count leads without emails
    const leadsWithoutEmails = data.filter(lead => !lead.email);
    console.log(`❌ Leads without emails: ${leadsWithoutEmails.length}`);
    
    // Show some recent leads
    console.log('\n📋 Recent leads with emails:');
    const recentLeadsWithEmails = leadsWithEmails
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    
    recentLeadsWithEmails.forEach(lead => {
      console.log(`  • ${lead.github_username}/${lead.repo_name} - ${lead.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLeads(); 