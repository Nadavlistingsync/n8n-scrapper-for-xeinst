#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createInstantlyAPI } = require('../lib/instantly-api.js')
const fs = require('fs')
const path = require('path')

async function setupInstantly() {
  console.log('🚀 Setting up Instantly API integration...\n')

  // Check if API key is set
  const apiKey = process.env.INSTANTLY_API_KEY
  if (!apiKey || apiKey === 'your_instantly_api_key_here') {
    console.log('❌ INSTANTLY_API_KEY not found in environment variables')
    console.log('📝 Please add your Instantly API key to .env.local:')
    console.log('   INSTANTLY_API_KEY=your_actual_api_key_here')
    console.log('\n🔗 Get your API key from: https://app.instantly.ai/settings/api')
    return
  }

  try {
    // Test API connection
    console.log('🔍 Testing Instantly API connection...')
    const instantlyAPI = createInstantlyAPI()
    const testResult = await instantlyAPI.testConnection()
    
    if (!testResult.success) {
      console.log('❌ Instantly API connection failed:')
      console.log(testResult.error)
      return
    }

    console.log('✅ Instantly API connection successful!')
    console.log(`📊 Found ${testResult.campaigns?.length || 0} existing campaigns`)

    // Get existing campaigns
    const campaigns = await instantlyAPI.getCampaigns()
    
    if (campaigns && campaigns.length > 0) {
      console.log('\n📋 Existing campaigns:')
      campaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name} (ID: ${campaign.id})`)
      })
      
      console.log('\n💡 You can set INSTANTLY_CAMPAIGN_ID in .env.local to use an existing campaign')
    }

    // Create a new campaign for testing
    console.log('\n🆕 Creating a new test campaign...')
    const campaignData = {
      name: `n8n Gmail Leads - ${new Date().toISOString().split('T')[0]}`,
      description: 'Automatically scraped n8n repository leads with Gmail addresses'
    }
    
    const newCampaign = await instantlyAPI.createCampaign(campaignData)
    console.log(`✅ Created new campaign: ${newCampaign.name} (ID: ${newCampaign.id})`)
    
    // Update .env.local with the new campaign ID
    const envPath = path.join(process.cwd(), '.env.local')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }
    
    // Add or update INSTANTLY_CAMPAIGN_ID
    if (envContent.includes('INSTANTLY_CAMPAIGN_ID=')) {
      envContent = envContent.replace(
        /INSTANTLY_CAMPAIGN_ID=.*/,
        `INSTANTLY_CAMPAIGN_ID=${newCampaign.id}`
      )
    } else {
      envContent += `\n# Instantly API (for direct lead sending)\nINSTANTLY_API_KEY=${apiKey}\nINSTANTLY_CAMPAIGN_ID=${newCampaign.id}\n`
    }
    
    fs.writeFileSync(envPath, envContent)
    console.log('✅ Updated .env.local with campaign ID')
    
    console.log('\n🎉 Instantly API setup completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Run: node scripts/scrape-to-instantly.js')
    console.log('2. Check your Instantly dashboard for the new leads')
    console.log(`3. Campaign URL: https://app.instantly.ai/campaign/${newCampaign.id}`)
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Verify your API key is correct')
    console.log('2. Check your internet connection')
    console.log('3. Ensure you have an active Instantly account')
  }
}

// Run setup
if (require.main === module) {
  setupInstantly()
    .then(() => {
      console.log('\n✨ Setup script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Setup script failed:', error)
      process.exit(1)
    })
}

module.exports = { setupInstantly }
