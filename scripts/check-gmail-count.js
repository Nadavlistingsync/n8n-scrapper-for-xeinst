#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getAllLeads } = require('../lib/google-sheets-db')

async function checkGmailCount() {
  try {
    console.log('📊 Checking current Gmail leads count...')
    
    const allLeads = await getAllLeads()
    const gmailLeads = allLeads.filter(lead => {
      if (!lead.email) return false
      const emailLower = lead.email.toLowerCase().trim()
      return emailLower.endsWith('@gmail.com') || emailLower.endsWith('@googlemail.com')
    })
    
    console.log('📧 Current Gmail leads in database:', gmailLeads.length)
    console.log('📊 Total leads in database:', allLeads.length)
    console.log('📈 Gmail percentage:', Math.round((gmailLeads.length / allLeads.length) * 100) + '%')
    
    if (gmailLeads.length < 500) {
      console.log(`🎯 Still need ${500 - gmailLeads.length} more Gmail leads to reach 500`)
    } else {
      console.log('🎉 Target of 500 Gmail leads reached!')
    }
    
  } catch (error) {
    console.error('❌ Error checking Gmail count:', error)
  }
}

checkGmailCount()
