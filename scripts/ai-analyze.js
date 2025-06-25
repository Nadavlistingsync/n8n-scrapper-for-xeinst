#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getLeadsForAIAnalysis, updateLeadAIAnalysis } = require('../lib/supabase')
const { batchAnalyzeLeads, autoApproveLeads } = require('../lib/ai-agent')

async function analyzeLeadsWithAI() {
  console.log('🤖 Starting AI analysis of leads...')
  
  const startTime = Date.now()
  let totalAnalyzed = 0
  let totalAutoApproved = 0
  const errors = []

  try {
    // Get leads that haven't been analyzed yet
    const unanalyzedLeads = await getLeadsForAIAnalysis()
    
    if (unanalyzedLeads.length === 0) {
      console.log('✅ No leads found for AI analysis')
      return
    }

    console.log(`📊 Found ${unanalyzedLeads.length} leads to analyze`)

    // Analyze leads in batches
    const batchSize = 5
    for (let i = 0; i < unanalyzedLeads.length; i += batchSize) {
      const batch = unanalyzedLeads.slice(i, i + batchSize)
      console.log(`\n🔍 Analyzing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(unanalyzedLeads.length/batchSize)}`)
      
      try {
        const analyzedLeads = await batchAnalyzeLeads(batch)
        
        // Update database with analysis results
        for (const lead of analyzedLeads) {
          try {
            await updateLeadAIAnalysis(lead.id, {
              ai_score: lead.ai_score,
              ai_recommendation: lead.ai_recommendation,
              ai_analysis: lead.ai_analysis,
            })
            totalAnalyzed++
            
            console.log(`✅ Analyzed: ${lead.github_username}/${lead.repo_name} (score: ${lead.ai_score?.toFixed(2)}, recommendation: ${lead.ai_recommendation})`)
          } catch (error) {
            const errorMsg = `❌ Failed to update analysis for ${lead.github_username}: ${error}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        }

        // Rate limiting between batches
        if (i + batchSize < unanalyzedLeads.length) {
          console.log('⏳ Waiting 2 seconds before next batch...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        const errorMsg = `❌ Error analyzing batch: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n🎉 AI analysis completed!')
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📊 Total leads analyzed: ${totalAnalyzed}`)
    console.log(`🤖 Auto-approved: ${totalAutoApproved}`)
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`)
      errors.forEach(error => console.error(`   ${error}`))
    }

    // Summary statistics
    const successRate = Math.round((totalAnalyzed / unanalyzedLeads.length) * 100)
    console.log(`\n📈 Summary: ${totalAnalyzed}/${unanalyzedLeads.length} leads analyzed (${successRate}% success rate)`)

  } catch (error) {
    console.error('💥 Fatal error during AI analysis:', error)
    process.exit(1)
  }
}

async function autoApproveHighQualityLeads() {
  console.log('🤖 Starting AI auto-approval of high-quality leads...')
  
  const startTime = Date.now()
  let totalAnalyzed = 0
  let totalApproved = 0
  const errors = []

  try {
    // Get leads that haven't been analyzed yet
    const unanalyzedLeads = await getLeadsForAIAnalysis()
    
    if (unanalyzedLeads.length === 0) {
      console.log('✅ No leads found for AI analysis')
      return
    }

    console.log(`📊 Found ${unanalyzedLeads.length} leads to analyze and auto-approve`)

    // Auto-approve high-quality leads
    const approvedLeads = await autoApproveLeads(unanalyzedLeads)
    totalApproved = approvedLeads.length
    totalAnalyzed = unanalyzedLeads.length

    // Update database with approved leads
    for (const lead of approvedLeads) {
      try {
        await updateLeadAIAnalysis(lead.id, {
          ai_score: lead.ai_score,
          ai_recommendation: lead.ai_recommendation,
          ai_analysis: lead.ai_analysis,
        })
        
        console.log(`✅ Auto-approved: ${lead.github_username}/${lead.repo_name} (score: ${lead.ai_score?.toFixed(2)})`)
      } catch (error) {
        const errorMsg = `❌ Failed to update auto-approval for ${lead.github_username}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n🎉 AI auto-approval completed!')
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📊 Total leads analyzed: ${totalAnalyzed}`)
    console.log(`🤖 Auto-approved: ${totalApproved}`)
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`)
      errors.forEach(error => console.error(`   ${error}`))
    }

    // Summary statistics
    const approvalRate = Math.round((totalApproved / totalAnalyzed) * 100)
    console.log(`\n📈 Summary: ${totalApproved}/${totalAnalyzed} leads auto-approved (${approvalRate}% approval rate)`)

  } catch (error) {
    console.error('💥 Fatal error during AI auto-approval:', error)
    process.exit(1)
  }
}

// Run the AI analysis
if (require.main === module) {
  const args = process.argv.slice(2)
  const mode = args[0] || 'analyze'

  if (mode === 'auto-approve') {
    autoApproveHighQualityLeads()
      .then(() => {
        console.log('\n✨ AI auto-approval completed successfully')
        process.exit(0)
      })
      .catch((error) => {
        console.error('\n💥 AI auto-approval failed:', error)
        process.exit(1)
      })
  } else {
    analyzeLeadsWithAI()
      .then(() => {
        console.log('\n✨ AI analysis completed successfully')
        process.exit(0)
      })
      .catch((error) => {
        console.error('\n💥 AI analysis failed:', error)
        process.exit(1)
      })
  }
}

module.exports = { analyzeLeadsWithAI, autoApproveHighQualityLeads } 