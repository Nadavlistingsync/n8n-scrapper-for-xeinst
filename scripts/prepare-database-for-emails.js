const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function prepareDatabaseForEmails() {
  console.log('🚀 Preparing database for email campaigns...')
  
  try {
    // First, let's add email template columns if they don't exist
    console.log('📝 Adding email template columns...')
    
    const { error: alterError } = await supabase.rpc('add_email_columns_if_not_exist')
    
    if (alterError) {
      console.log('Columns might already exist or need manual creation')
      console.log('Creating columns manually...')
      
      // Try to add columns one by one
      const columns = [
        'email_template TEXT',
        'email_subject TEXT',
        'campaign_status TEXT DEFAULT \'pending\'',
        'email_sent_at TIMESTAMP',
        'email_opened BOOLEAN DEFAULT FALSE',
        'email_clicked BOOLEAN DEFAULT FALSE',
        'unsubscribed BOOLEAN DEFAULT FALSE'
      ]
      
      for (const column of columns) {
        try {
          const { error } = await supabase.rpc('execute_sql', {
            sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${column}`
          })
          if (error) {
            console.log(`Column ${column} might already exist`)
          }
        } catch (e) {
          console.log(`Column ${column} already exists`)
        }
      }
    }
    
    // Get all leads with emails
    console.log('📊 Fetching leads with emails...')
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .not('email', 'is', null)
      .not('email', 'eq', '')
    
    if (fetchError) {
      console.error('Error fetching leads:', fetchError)
      return
    }
    
    console.log(`Found ${leads.length} leads with emails`)
    
    // Generate email templates for each lead
    console.log('✉️ Generating email templates...')
    
    const updates = []
    for (const lead of leads) {
      const emailTemplate = generateEmailTemplate(lead)
      const emailSubject = generateEmailSubject(lead)
      
      updates.push({
        id: lead.id,
        email_template: emailTemplate,
        email_subject: emailSubject,
        campaign_status: 'ready'
      })
    }
    
    // Update in batches
    const batchSize = 50
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      const { error: updateError } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'id' })
      
      if (updateError) {
        console.error('Error updating batch:', updateError)
      } else {
        console.log(`Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`)
      }
    }
    
    // Create a view for easy email export
    console.log('📋 Creating email export view...')
    
    const { error: viewError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE VIEW email_campaign_ready AS
        SELECT 
          id,
          github_username,
          email,
          repo_name,
          repo_description,
          email_template,
          email_subject,
          campaign_status,
          created_at
        FROM leads 
        WHERE email IS NOT NULL 
        AND email != ''
        AND campaign_status = 'ready'
        ORDER BY created_at DESC
      `
    })
    
    if (viewError) {
      console.log('View creation error (might already exist):', viewError.message)
    }
    
    console.log('✅ Database prepared for email campaigns!')
    console.log(`📧 ${leads.length} leads are ready for email campaigns`)
    console.log('\n📋 Next steps:')
    console.log('1. Run: node scripts/export-email-campaign.js')
    console.log('2. Use the CSV file with your email service')
    console.log('3. Or use the web interface at /leads to review and send emails')
    
  } catch (error) {
    console.error('Error preparing database:', error)
  }
}

function generateEmailTemplate(lead) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Xeinst - Earn from your n8n workflows</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🚀 Xeinst</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Monetize your n8n workflows</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hey there! 👋</h2>
    
    <p>I noticed your awesome n8n workflow <strong>"${lead.repo_name || 'your workflow'}"</strong> on GitHub and I'm genuinely impressed!</p>
    
    ${lead.repo_description ? `
    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
      <p style="margin: 0; font-style: italic;">
        "${lead.repo_description}"
      </p>
    </div>
    ` : ''}
    
    <p>We're building <strong>Xeinst</strong> - a new platform where developers like you can earn money by listing and selling their n8n workflows and automation agents.</p>
    
    <h3 style="color: #2c3e50;">Why Xeinst?</h3>
    <ul style="padding-left: 20px;">
      <li>💰 <strong>Monetize your workflows</strong> - Earn passive income</li>
      <li>🌍 <strong>Reach global audience</strong> - Connect with developers worldwide</li>
      <li>🚀 <strong>Easy listing process</strong> - Simple setup and management</li>
      <li>💡 <strong>Community-driven</strong> - Share and discover amazing automations</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://xeinst.com/waitlist" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Join the Waitlist
      </a>
    </div>
    
    <p>We're currently in beta and looking for early adopters like you. Would you be interested in joining our waitlist?</p>
    
    <p>Best regards,<br>
    The Xeinst Team</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #666; text-align: center;">
      You received this email because we found your n8n workflow on GitHub. 
      If you'd prefer not to receive these emails, just reply with "unsubscribe".
    </p>
  </div>
</body>
</html>`
}

function generateEmailSubject(lead) {
  return `Your awesome n8n workflow caught our attention! 🚀`
}

// Run the script
prepareDatabaseForEmails() 