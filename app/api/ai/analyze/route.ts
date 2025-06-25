import { NextRequest, NextResponse } from 'next/server'
import { getLeadsForAIAnalysis, updateLeadAIAnalysis, getLeads } from '@/lib/supabase'
import { batchAnalyzeLeads, autoApproveLeads } from '@/lib/ai-agent'
import { AIAgentConfig } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const autoApprove = searchParams.get('autoApprove') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get leads that haven't been analyzed yet
    const unanalyzedLeads = await getLeadsForAIAnalysis()
    const leadsToAnalyze = unanalyzedLeads.slice(0, limit)

    if (leadsToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leads found for AI analysis',
        analyzedCount: 0,
        autoApprovedCount: 0,
      })
    }

    console.log(`🤖 Starting AI analysis of ${leadsToAnalyze.length} leads`)

    let analyzedLeads: any[] = []
    let autoApprovedCount = 0

    if (autoApprove) {
      // Auto-approve high-quality leads
      const config: AIAgentConfig = {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1000,
        autoApproveThreshold: 0.8,
        autoRejectThreshold: 0.3,
      }

      const approvedLeads = await autoApproveLeads(leadsToAnalyze, config)
      autoApprovedCount = approvedLeads.length

      // Update database with approved leads
      for (const lead of approvedLeads) {
        await updateLeadAIAnalysis(lead.id, {
          ai_score: lead.ai_score,
          ai_recommendation: lead.ai_recommendation,
          ai_analysis: lead.ai_analysis,
        })
      }

      analyzedLeads = approvedLeads
    } else {
      // Just analyze without auto-approval
      analyzedLeads = await batchAnalyzeLeads(leadsToAnalyze)

      // Update database with analysis results
      for (const lead of analyzedLeads) {
        await updateLeadAIAnalysis(lead.id, {
          ai_score: lead.ai_score,
          ai_recommendation: lead.ai_recommendation,
          ai_analysis: lead.ai_analysis,
        })
      }
    }

    const result = {
      success: true,
      message: `AI analysis completed. Analyzed ${analyzedLeads.length} leads${autoApprove ? `, auto-approved ${autoApprovedCount}` : ''}`,
      analyzedCount: analyzedLeads.length,
      autoApprovedCount,
      leads: analyzedLeads.map(lead => ({
        id: lead.id,
        github_username: lead.github_username,
        repo_name: lead.repo_name,
        ai_score: lead.ai_score,
        ai_recommendation: lead.ai_recommendation,
        ai_analysis: lead.ai_analysis,
      })),
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { success: false, error: `AI analysis failed: ${error}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadIds, action, config } = body

    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead IDs' },
        { status: 400 }
      )
    }

    const allLeads = await getLeads()
    const leadsToProcess = allLeads.filter(lead => leadIds.includes(lead.id))

    if (leadsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No leads found' },
        { status: 404 }
      )
    }

    let result: any = {}

    if (action === 'analyze') {
      const analyzedLeads = await batchAnalyzeLeads(leadsToProcess)
      
      // Update database
      for (const lead of analyzedLeads) {
        await updateLeadAIAnalysis(lead.id, {
          ai_score: lead.ai_score,
          ai_recommendation: lead.ai_recommendation,
          ai_analysis: lead.ai_analysis,
        })
      }

      result = {
        success: true,
        message: `Analyzed ${analyzedLeads.length} leads`,
        analyzedCount: analyzedLeads.length,
        leads: analyzedLeads,
      }
    } else if (action === 'auto-approve') {
      const aiConfig = config || {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1000,
        autoApproveThreshold: 0.8,
        autoRejectThreshold: 0.3,
      }

      const approvedLeads = await autoApproveLeads(leadsToProcess, aiConfig)
      
      // Update database
      for (const lead of approvedLeads) {
        await updateLeadAIAnalysis(lead.id, {
          ai_score: lead.ai_score,
          ai_recommendation: lead.ai_recommendation,
          ai_analysis: lead.ai_analysis,
        })
      }

      result = {
        success: true,
        message: `Auto-approved ${approvedLeads.length} leads`,
        approvedCount: approvedLeads.length,
        leads: approvedLeads,
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('AI action error:', error)
    return NextResponse.json(
      { success: false, error: `AI action failed: ${error}` },
      { status: 500 }
    )
  }
} 