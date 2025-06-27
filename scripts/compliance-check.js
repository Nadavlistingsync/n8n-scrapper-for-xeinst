#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getLeads } = require('../lib/supabase.js')

async function complianceCheck() {
  console.log('⚖️  Running legal compliance check...\n')
  
  try {
    const leads = await getLeads()
    
    if (!leads || leads.length === 0) {
      console.log('✅ No leads to check')
      return
    }
    
    console.log(`📊 Checking ${leads.length} leads for compliance...\n`)
    
    // Check 1: Email format validation
    const invalidEmails = leads.filter(lead => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return !emailRegex.test(lead.email)
    })
    
    console.log('📧 EMAIL FORMAT CHECK')
    console.log('====================')
    if (invalidEmails.length > 0) {
      console.log(`❌ Found ${invalidEmails.length} invalid email formats`)
      invalidEmails.slice(0, 5).forEach(lead => {
        console.log(`   - ${lead.github_username}: ${lead.email}`)
      })
    } else {
      console.log('✅ All emails have valid format')
    }
    
    // Check 2: Public email verification
    const publicEmails = leads.filter(lead => {
      return lead.email && !lead.email.includes('noreply') && !lead.email.includes('no-reply')
    })
    
    console.log('\n🌐 PUBLIC EMAIL CHECK')
    console.log('====================')
    console.log(`✅ ${publicEmails.length} leads have public emails`)
    console.log(`❌ ${leads.length - publicEmails.length} leads have non-public emails`)
    
    // Check 3: Geographic distribution (for GDPR considerations)
    const emailDomains = {}
    leads.forEach(lead => {
      if (lead.email) {
        const domain = lead.email.split('@')[1]
        emailDomains[domain] = (emailDomains[domain] || 0) + 1
      }
    })
    
    console.log('\n🌍 GEOGRAPHIC DISTRIBUTION')
    console.log('=========================')
    const euDomains = ['.de', '.fr', '.it', '.es', '.nl', '.be', '.at', '.se', '.dk', '.fi', '.pt', '.ie', '.pl', '.cz', '.hu', '.ro', '.bg', '.hr', '.si', '.sk', '.lt', '.lv', '.ee', '.mt', '.cy', '.lu']
    const euLeads = leads.filter(lead => {
      if (!lead.email) return false
      return euDomains.some(domain => lead.email.includes(domain))
    })
    
    console.log(`🇪🇺 EU leads: ${euLeads.length} (${Math.round(euLeads.length / leads.length * 100)}%)`)
    console.log(`🌎 Non-EU leads: ${leads.length - euLeads.length} (${Math.round((leads.length - euLeads.length) / leads.length * 100)}%)`)
    
    // Check 4: Business email vs personal email
    const businessDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com']
    const businessEmails = leads.filter(lead => {
      if (!lead.email) return false
      const domain = lead.email.split('@')[1]
      return businessDomains.includes(domain)
    })
    
    console.log('\n💼 BUSINESS EMAIL ANALYSIS')
    console.log('=========================')
    console.log(`📧 Business domain emails: ${businessEmails.length} (${Math.round(businessEmails.length / leads.length * 100)}%)`)
    console.log(`🏢 Corporate domain emails: ${leads.length - businessEmails.length} (${Math.round((leads.length - businessEmails.length) / leads.length * 100)}%)`)
    
    // Check 5: Recent activity (for engagement likelihood)
    const recentLeads = leads.filter(lead => {
      const lastActivity = new Date(lead.last_activity)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceActivity <= 30
    })
    
    console.log('\n🕒 RECENT ACTIVITY CHECK')
    console.log('======================')
    console.log(`📅 Leads with activity in last 30 days: ${recentLeads.length} (${Math.round(recentLeads.length / leads.length * 100)}%)`)
    console.log(`📅 Leads with activity in last 90 days: ${leads.filter(lead => {
      const lastActivity = new Date(lead.last_activity)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceActivity <= 90
    }).length} (${Math.round(leads.filter(lead => {
      const lastActivity = new Date(lead.last_activity)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceActivity <= 90
    }).length / leads.length * 100)}%)`)
    
    // Compliance recommendations
    console.log('\n⚖️  COMPLIANCE RECOMMENDATIONS')
    console.log('=============================')
    
    if (euLeads.length > 0) {
      console.log('🇪🇺 GDPR COMPLIANCE:')
      console.log('   - Ensure you have legitimate interest or consent for EU leads')
      console.log('   - Include clear opt-out mechanisms in emails')
      console.log('   - Honor data subject rights (access, deletion, etc.)')
      console.log('   - Consider implementing double opt-in for EU leads')
    }
    
    console.log('\n📧 EMAIL MARKETING COMPLIANCE:')
    console.log('   - Include unsubscribe link in every email')
    console.log('   - Honor unsubscribe requests within 10 business days')
    console.log('   - Include your physical address in emails')
    console.log('   - Be transparent about how you obtained their email')
    console.log('   - Don\'t use misleading subject lines')
    
    console.log('\n🌐 WEB SCRAPING COMPLIANCE:')
    console.log('   - Respect robots.txt files')
    console.log('   - Use reasonable rate limiting (already implemented)')
    console.log('   - Only scrape publicly available data (already doing)')
    console.log('   - Don\'t bypass authentication (already not doing)')
    
    console.log('\n📋 RECORD KEEPING:')
    console.log('   - Keep records of consent/legitimate interest')
    console.log('   - Track unsubscribe requests')
    console.log('   - Document your data collection methods')
    console.log('   - Maintain audit trail of email campaigns')
    
    // Risk assessment
    console.log('\n⚠️  RISK ASSESSMENT')
    console.log('==================')
    
    const riskFactors = []
    if (euLeads.length > leads.length * 0.1) {
      riskFactors.push('High EU presence - GDPR compliance required')
    }
    if (invalidEmails.length > 0) {
      riskFactors.push('Invalid emails present - may cause delivery issues')
    }
    if (leads.length - publicEmails.length > 0) {
      riskFactors.push('Non-public emails present - may have consent issues')
    }
    
    if (riskFactors.length === 0) {
      console.log('✅ Low risk - Good compliance posture')
    } else {
      console.log('⚠️  Risk factors identified:')
      riskFactors.forEach(factor => console.log(`   - ${factor}`))
    }
    
    console.log('\n✨ Compliance check completed')
    
  } catch (error) {
    console.error('❌ Error during compliance check:', error)
  }
}

// Run the compliance check
if (require.main === module) {
  complianceCheck()
    .then(() => {
      console.log('\n✨ Compliance check completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Compliance check failed:', error)
      process.exit(1)
    })
}

module.exports = { complianceCheck } 