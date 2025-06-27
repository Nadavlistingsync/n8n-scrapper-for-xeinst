const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Use the environment variables from .env.local
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please check your .env.local file has SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportEmailsSimple() {
  console.log('📧 Exporting emails for easy pasting...')
  
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
    
    if (leads.length === 0) {
      console.log('No leads with emails found!')
      return
    }
    
    // Create simple formats for easy pasting
    const emailsOnly = leads.map(lead => lead.email).join(', ')
    const emailsWithNames = leads.map(lead => `${lead.github_username} <${lead.email}>`).join(', ')
    
    // Create CSV format
    const csvData = 'Email,Username,Repo,Description\n' + 
      leads.map(lead => 
        `"${lead.email}","${lead.github_username || ''}","${lead.repo_name || ''}","${(lead.repo_description || '').replace(/"/g, '""')}"`
      ).join('\n')
    
    // Save to files
    const timestamp = new Date().toISOString().split('T')[0]
    
    fs.writeFileSync(`exports/emails-only-${timestamp}.txt`, emailsOnly)
    fs.writeFileSync(`exports/emails-with-names-${timestamp}.txt`, emailsWithNames)
    fs.writeFileSync(`exports/email-campaign-${timestamp}.csv`, csvData)
    
    console.log('✅ Files exported successfully!')
    console.log('\n📁 Files created:')
    console.log(`📄 exports/emails-only-${timestamp}.txt - Just email addresses (comma-separated)`)
    console.log(`📄 exports/emails-with-names-${timestamp}.txt - Emails with usernames`)
    console.log(`📄 exports/email-campaign-${timestamp}.csv - CSV for email services`)
    
    console.log('\n📋 Quick copy formats:')
    console.log('\n📧 Emails only (copy this for BCC):')
    console.log(emailsOnly.substring(0, 200) + (emailsOnly.length > 200 ? '...' : ''))
    
    console.log('\n📧 First 5 emails with names:')
    const firstFive = leads.slice(0, 5).map(lead => `${lead.github_username} <${lead.email}>`).join(', ')
    console.log(firstFive)
    
    console.log('\n💡 Usage tips:')
    console.log('• Copy emails-only for BCC field in your email client')
    console.log('• Use CSV file with email marketing services like Mailchimp, ConvertKit, etc.')
    console.log('• Check the exports/ folder for all files')
    
  } catch (error) {
    console.error('Error exporting data:', error)
  }
}

// Run the script
exportEmailsSimple() 