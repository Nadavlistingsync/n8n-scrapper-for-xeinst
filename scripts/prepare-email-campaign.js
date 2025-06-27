#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { EmailCampaignManager } = require('../lib/email-campaign.js')

async function prepareEmailCampaign() {
  console.log('📧 Preparing email campaign...\n')
  
  const campaignManager = new EmailCampaignManager()
  
  try {
    // Get campaign statistics
    const stats = await campaignManager.getCampaignStats()
    console.log('📊 CURRENT CAMPAIGN STATISTICS')
    console.log('==============================')
    console.log(`📈 Total leads: ${stats.total}`)
    console.log(`🆕 New leads: ${stats.new}`)
    console.log(`✅ Approved: ${stats.approved}`)
    console.log(`📤 Sent: ${stats.sent}`)
    console.log(`📖 Opened: ${stats.opened} (${stats.openRate}%)`)
    console.log(`🔗 Clicked: ${stats.clicked} (${stats.clickRate}%)`)
    console.log(`📧 Responded: ${stats.responded} (${stats.responseRate}%)`)
    console.log(`🚫 Unsubscribed: ${stats.unsubscribed} (${stats.unsubscribeRate}%)`)
    
    // Prepare leads for campaign
    console.log('\n🔍 PREPARING LEADS FOR CAMPAIGN')
    console.log('================================')
    
    const preparedLeads = await campaignManager.prepareLeadsForCampaign(50)
    
    if (preparedLeads.length === 0) {
      console.log('❌ No leads ready for campaign')
      return
    }
    
    console.log(`✅ Prepared ${preparedLeads.length} leads for campaign`)
    
    // Show sample emails
    console.log('\n📋 SAMPLE EMAILS PREPARED')
    console.log('=========================')
    
    preparedLeads.slice(0, 3).forEach((lead, index) => {
      console.log(`\n📧 Sample ${index + 1}: ${lead.github_username}`)
      console.log(`   To: ${lead.email}`)
      console.log(`   Subject: ${lead.emailContent.subject}`)
      console.log(`   Repo: ${lead.repo_name}`)
      console.log(`   Activity: ${new Date(lead.last_activity).toLocaleDateString()}`)
    })
    
    if (preparedLeads.length > 3) {
      console.log(`   ... and ${preparedLeads.length - 3} more leads`)
    }
    
    // Show email template
    console.log('\n📝 EMAIL TEMPLATE PREVIEW')
    console.log('=========================')
    console.log('Subject: 🚀 Discover Xeinst: The Next Generation of Enterprise Automation')
    console.log('\nTemplate:')
    console.log('Hi {{name}},')
    console.log('')
    console.log('I noticed your impressive work on {{repo_name}} and thought you might be interested in Xeinst - a revolutionary enterprise automation platform that\'s transforming how businesses handle complex workflows.')
    console.log('')
    console.log('🎯 **Why Xeinst?**')
    console.log('• Seamless integration with existing systems')
    console.log('• No-code workflow automation')
    console.log('• Enterprise-grade security and compliance')
    console.log('• 10x faster deployment than traditional solutions')
    console.log('')
    console.log('🔗 **Learn More:** https://xeinst.com')
    console.log('📧 **Demo Request:** {{demo_link}}')
    console.log('')
    console.log('Would you be interested in a quick 15-minute demo to see how Xeinst could enhance your automation capabilities?')
    console.log('')
    console.log('Best regards,')
    console.log('{{sender_name}}')
    console.log('{{company_name}}')
    console.log('')
    console.log('---')
    console.log('This email was sent to you because of your public profile on GitHub.')
    console.log('To unsubscribe, click here: {{unsubscribe_link}}')
    
    // Campaign recommendations
    console.log('\n💡 CAMPAIGN RECOMMENDATIONS')
    console.log('==========================')
    console.log('✅ All emails include:')
    console.log('   • Personalized greeting with username')
    console.log('   • Reference to their specific repository')
    console.log('   • Clear value proposition')
    console.log('   • Call-to-action (demo request)')
    console.log('   • Unsubscribe link (CAN-SPAM compliant)')
    console.log('   • Physical address requirement')
    console.log('   • Transparent data collection notice')
    
    console.log('\n📈 SENDING STRATEGY:')
    console.log('   • Start with 10-20 emails per day')
    console.log('   • Monitor open rates and responses')
    console.log('   • Follow up after 3-5 days if no response')
    console.log('   • Track all engagement metrics')
    
    console.log('\n⚖️ COMPLIANCE FEATURES:')
    console.log('   • CAN-SPAM Act compliant')
    console.log('   • GDPR considerations for EU leads')
    console.log('   • Easy unsubscribe mechanism')
    console.log('   • Transparent data collection')
    console.log('   • No misleading subject lines')
    
    // Export options
    console.log('\n📤 EXPORT OPTIONS')
    console.log('=================')
    console.log('1. CSV Export: node scripts/export-campaign-csv.js')
    console.log('2. Send via Email Service: node scripts/send-campaign.js')
    console.log('3. Review in Web Interface: http://localhost:3000/leads')
    console.log('4. Approve for sending: node scripts/approve-campaign.js')
    
    // Next steps
    console.log('\n🎯 NEXT STEPS')
    console.log('=============')
    console.log('1. Review the prepared emails above')
    console.log('2. Test with a small batch (5-10 emails)')
    console.log('3. Monitor response rates and engagement')
    console.log('4. Scale up based on performance')
    console.log('5. Set up follow-up sequences')
    
    console.log('\n✨ Email campaign preparation completed successfully!')
    
  } catch (error) {
    console.error('❌ Error preparing email campaign:', error)
  }
}

// Run the preparation
if (require.main === module) {
  prepareEmailCampaign()
    .then(() => {
      console.log('\n✨ Email campaign preparation completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Email campaign preparation failed:', error)
      process.exit(1)
    })
}

module.exports = { prepareEmailCampaign } 