const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportSimpleEmailData() {
  console.log('📧 Exporting simple email data for easy pasting...')
  
  try {
    // Get all leads with emails
    const { data: leads, error } = await supabase
      .from('leads')
      .select('github_username, email, repo_name, repo_description')
      .not('email', 'is', null)
      .not('email', 'eq', '')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching leads:', error)
      return
    }
    
    console.log(`Found ${leads.length} leads with emails`)
    
    // Create simple formats for easy pasting
    const formats = {
      emailsOnly: leads.map(lead => lead.email).join(', '),
      emailsWithNames: leads.map(lead => `${lead.github_username} <${lead.email}>`).join(', '),
      csvSimple: 'Email,Username,Repo,Description\n' + 
        leads.map(lead => 
          `"${lead.email}","${lead.github_username || ''}","${lead.repo_name || ''}","${(lead.repo_description || '').replace(/"/g, '""')}"`
        ).join('\n'),
      jsonSimple: JSON.stringify(leads, null, 2)
    }
    
    // Save to files
    const timestamp = new Date().toISOString().split('T')[0]
    
    fs.writeFileSync(`exports/emails-only-${timestamp}.txt`, formats.emailsOnly)
    fs.writeFileSync(`exports/emails-with-names-${timestamp}.txt`, formats.emailsWithNames)
    fs.writeFileSync(`exports/email-campaign-${timestamp}.csv`, formats.csvSimple)
    fs.writeFileSync(`exports/email-data-${timestamp}.json`, formats.jsonSimple)
    
    console.log('✅ Files exported successfully!')
    console.log('\n📁 Files created:')
    console.log(`📄 exports/emails-only-${timestamp}.txt - Just email addresses (comma-separated)`)
    console.log(`📄 exports/emails-with-names-${timestamp}.txt - Emails with usernames`)
    console.log(`📄 exports/email-campaign-${timestamp}.csv - CSV for email services`)
    console.log(`📄 exports/email-data-${timestamp}.json - Full data in JSON`)
    
    console.log('\n📋 Quick copy formats:')
    console.log('\n📧 Emails only (copy this for BCC):')
    console.log(formats.emailsOnly.substring(0, 100) + (formats.emailsOnly.length > 100 ? '...' : ''))
    
    console.log('\n📧 Emails with names (copy this for TO):')
    console.log(formats.emailsWithNames.substring(0, 100) + (formats.emailsWithNames.length > 100 ? '...' : ''))
    
    console.log('\n💡 Usage tips:')
    console.log('• Use emails-only for BCC field in your email client')
    console.log('• Use emails-with-names for TO field (if you want to personalize)')
    console.log('• Use CSV file with email marketing services like Mailchimp, ConvertKit, etc.')
    console.log('• Use JSON file for custom integrations')
    
  } catch (error) {
    console.error('Error exporting data:', error)
  }
}

// Run the script
exportSimpleEmailData() 