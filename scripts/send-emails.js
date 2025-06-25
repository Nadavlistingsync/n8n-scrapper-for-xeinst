#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getLeads, updateLeadStatus } = require('../lib/supabase')
const { sendOutreachEmail, generateDMScript } = require('../lib/email')

async function sendEmailCampaign() {
  console.log('📧 Starting automated email campaign...')
  
  const startTime = Date.now()
  let emailsSent = 0
  let dmScriptsGenerated = 0
  const errors = []

  try {
    // Get all leads that haven't been contacted yet
    const allLeads = await getLeads()
    const leadsToContact = allLeads.filter(lead => 
      !lead.email_sent && 
      lead.status === 'new'
    )

    if (leadsToContact.length === 0) {
      console.log('✅ No leads to contact - all leads have been emailed or are not in "new" status')
      return
    }

    console.log(`📊 Found ${leadsToContact.length} leads to contact`)
    console.log(`📧 ${leadsToContact.filter(l => l.email).length} have emails`)
    console.log(`💬 ${leadsToContact.filter(l => !l.email).length} need DM scripts`)

    for (const lead of leadsToContact) {
      try {
        if (lead.email) {
          // Send email
          console.log(`📧 Sending email to ${lead.email} (${lead.github_username})...`)
          
          const emailSent = await sendOutreachEmail(lead)
          if (emailSent) {
            await updateLeadStatus(lead.id, 'contacted', true)
            emailsSent++
            console.log(`✅ Email sent to ${lead.email}`)
          } else {
            const errorMsg = `❌ Failed to send email to ${lead.email}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        } else {
          // Generate DM script
          console.log(`💬 Generating DM script for ${lead.github_username}...`)
          
          const dmScript = generateDMScript(lead)
          console.log(`\n📝 DM Script for ${lead.github_username}:`)
          console.log('─'.repeat(50))
          console.log(dmScript)
          console.log('─'.repeat(50))
          
          dmScriptsGenerated++
          
          // Mark as contacted even without email
          await updateLeadStatus(lead.id, 'contacted', false)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        const errorMsg = `❌ Error contacting ${lead.github_username}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n🎉 Email campaign completed!')
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📧 Emails sent: ${emailsSent}`)
    console.log(`💬 DM scripts generated: ${dmScriptsGenerated}`)
    console.log(`📊 Total leads processed: ${leadsToContact.length}`)
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`)
      errors.forEach(error => console.error(`   ${error}`))
    }

    // Log summary for monitoring
    const successRate = Math.round((emailsSent + dmScriptsGenerated) / leadsToContact.length * 100)
    console.log(`\n📈 Summary: ${emailsSent + dmScriptsGenerated}/${leadsToContact.length} leads contacted (${successRate}% success rate)`)

  } catch (error) {
    console.error('💥 Fatal error during email campaign:', error)
    process.exit(1)
  }
}

// Run the email campaign
if (require.main === module) {
  sendEmailCampaign()
    .then(() => {
      console.log('\n✨ Email campaign completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Email campaign failed:', error)
      process.exit(1)
    })
}

module.exports = { sendEmailCampaign } 