#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getLeads } = require('../lib/supabase.js')

async function checkSuccessRate() {
  console.log('📊 Checking current success rate and statistics...\n')
  
  try {
    const leads = await getLeads()
    
    if (!leads || leads.length === 0) {
      console.log('❌ No leads found in database')
      return
    }
    
    const totalLeads = leads.length
    const leadsWithEmails = leads.filter(lead => lead.email && lead.email.trim())
    const leadsWithoutEmails = totalLeads - leadsWithEmails.length
    
    const successRate = Math.round((leadsWithEmails.length / totalLeads) * 100)
    
    console.log('📈 SUCCESS RATE ANALYSIS')
    console.log('=======================')
    console.log(`📊 Total leads: ${totalLeads}`)
    console.log(`✅ Leads with emails: ${leadsWithEmails.length}`)
    console.log(`❌ Leads without emails: ${leadsWithoutEmails}`)
    console.log(`📈 Success rate: ${successRate}%`)
    
    // Email domain analysis
    const emailDomains = {}
    leadsWithEmails.forEach(lead => {
      if (lead.email) {
        const domain = lead.email.split('@')[1]
        emailDomains[domain] = (emailDomains[domain] || 0) + 1
      }
    })
    
    console.log('\n📧 EMAIL DOMAIN ANALYSIS')
    console.log('=======================')
    const sortedDomains = Object.entries(emailDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
    
    sortedDomains.forEach(([domain, count]) => {
      const percentage = Math.round((count / leadsWithEmails.length) * 100)
      console.log(`${domain}: ${count} (${percentage}%)`)
    })
    
    // Recent activity analysis
    const recentLeads = leads.filter(lead => {
      const lastActivity = new Date(lead.last_activity)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceActivity <= 30
    })
    
    console.log('\n🕒 RECENT ACTIVITY ANALYSIS')
    console.log('==========================')
    console.log(`📅 Leads with activity in last 30 days: ${recentLeads.length}`)
    console.log(`📊 Recent activity rate: ${Math.round((recentLeads.length / totalLeads) * 100)}%`)
    
    // Status analysis
    const statusCounts = {}
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
    })
    
    console.log('\n📋 STATUS ANALYSIS')
    console.log('==================')
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = Math.round((count / totalLeads) * 100)
      console.log(`${status}: ${count} (${percentage}%)`)
    })
    
    // Email approval analysis
    const approvedEmails = leads.filter(lead => lead.email_approved).length
    const pendingEmails = leads.filter(lead => lead.email_pending_approval).length
    const sentEmails = leads.filter(lead => lead.email_sent).length
    
    console.log('\n📧 EMAIL APPROVAL ANALYSIS')
    console.log('=========================')
    console.log(`✅ Approved emails: ${approvedEmails}`)
    console.log(`⏳ Pending approval: ${pendingEmails}`)
    console.log(`📤 Sent emails: ${sentEmails}`)
    console.log(`📊 Approval rate: ${Math.round((approvedEmails / leadsWithEmails.length) * 100)}%`)
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS')
    console.log('==================')
    if (successRate < 50) {
      console.log('🎯 Target: Improve success rate to 50%')
      console.log('   - Use enhanced email discovery methods')
      console.log('   - Focus on high-value users and repositories')
      console.log('   - Target business/enterprise users')
    } else {
      console.log('🎉 Success rate target achieved!')
    }
    
    if (recentLeads.length < totalLeads * 0.3) {
      console.log('🕒 Focus on more recent repositories for better engagement')
    }
    
    if (approvedEmails < leadsWithEmails.length * 0.1) {
      console.log('📧 Review and approve more emails for outreach')
    }
    
    console.log('\n✨ Analysis completed successfully')
    
  } catch (error) {
    console.error('❌ Error checking success rate:', error)
  }
}

// Run the analysis
if (require.main === module) {
  checkSuccessRate()
    .then(() => {
      console.log('\n✨ Success rate analysis completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Success rate analysis failed:', error)
      process.exit(1)
    })
}

module.exports = { checkSuccessRate } 