import OpenAI from 'openai'
import { Lead, AIAnalysis, AIAgentConfig } from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const defaultConfig: AIAgentConfig = {
  model: 'gpt-4',
  temperature: 0.3,
  maxTokens: 1000,
  autoApproveThreshold: 0.8,
  autoRejectThreshold: 0.3,
}

export async function analyzeLead(lead: Lead, config: AIAgentConfig = defaultConfig): Promise<AIAnalysis> {
  try {
    const prompt = `
You are an AI agent specialized in analyzing n8n workflow repositories for potential business opportunities.

Analyze this repository and provide a recommendation:

Repository: ${lead.repo_name}
Owner: ${lead.github_username}
Description: ${lead.repo_description}
URL: ${lead.repo_url}
Last Activity: ${lead.last_activity}

Please analyze this repository based on the following criteria:
1. Relevance to n8n workflows (0-10)
2. Quality and completeness of the project (0-10)
3. Activity level and maintenance (0-10)
4. Potential for business collaboration (0-10)
5. Developer engagement and community presence (0-10)

Provide your analysis in the following JSON format:
{
  "score": <overall_score_0_to_1>,
  "recommendation": "<approve|reject|review>",
  "reasoning": "<detailed_explanation>",
  "confidence": <confidence_0_to_1>,
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}

Focus on repositories that:
- Are actively maintained n8n workflows
- Show good code quality and documentation
- Have potential for monetization or collaboration
- Are created by engaged developers

Reject repositories that:
- Are inactive or abandoned
- Are not actually n8n-related
- Have poor quality or incomplete implementations
- Are spam or low-effort projects
`

    const response = await openai.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: 'system',
          content: 'You are a business development AI agent analyzing GitHub repositories for potential partnerships.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    })

    const analysisText = response.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    const analysis = JSON.parse(analysisText) as AIAnalysis
    
    return analysis

  } catch (error) {
    console.error('Error analyzing lead with AI:', error)
    
    // Fallback analysis
    return {
      score: 0.5,
      recommendation: 'review',
      reasoning: 'Unable to analyze due to technical error',
      confidence: 0.0,
      keyFactors: ['Analysis failed']
    }
  }
}

export async function generatePersonalizedEmail(lead: Lead, analysis: AIAnalysis): Promise<string> {
  try {
    const prompt = `
Generate a personalized outreach email for this n8n workflow creator.

Repository: ${lead.repo_name}
Owner: ${lead.github_username}
Description: ${lead.repo_description}
AI Analysis Score: ${analysis.score}
Key Factors: ${analysis.keyFactors.join(', ')}

The email should:
1. Be personalized based on their specific repository
2. Mention specific aspects of their work that impressed you
3. Explain the value proposition of Xeinst
4. Include a clear call-to-action
5. Be professional but friendly
6. Keep it under 200 words

Generate only the email content (no subject line or formatting):
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You are a business development specialist writing personalized outreach emails.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    })

    return response.choices[0]?.message?.content || 'Unable to generate personalized email'

  } catch (error) {
    console.error('Error generating personalized email:', error)
    return 'Unable to generate personalized email'
  }
}

export async function autoApproveLeads(leads: Lead[], config: AIAgentConfig = defaultConfig): Promise<Lead[]> {
  const approvedLeads: Lead[] = []
  
  for (const lead of leads) {
    try {
      const analysis = await analyzeLead(lead, config)
      
      // Update lead with AI analysis
      lead.ai_score = analysis.score
      lead.ai_recommendation = analysis.recommendation
      lead.ai_analysis = analysis.reasoning
      
      // Auto-approve if score is above threshold
      if (analysis.score >= config.autoApproveThreshold && analysis.recommendation === 'approve') {
        lead.email_approved = true
        lead.email_pending_approval = false
        approvedLeads.push(lead)
        console.log(`🤖 AI auto-approved: ${lead.github_username}/${lead.repo_name} (score: ${analysis.score})`)
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`Error auto-approving lead ${lead.github_username}:`, error)
    }
  }
  
  return approvedLeads
}

export async function batchAnalyzeLeads(leads: Lead[]): Promise<Lead[]> {
  const analyzedLeads: Lead[] = []
  
  for (const lead of leads) {
    try {
      const analysis = await analyzeLead(lead)
      
      lead.ai_score = analysis.score
      lead.ai_recommendation = analysis.recommendation
      lead.ai_analysis = analysis.reasoning
      
      analyzedLeads.push(lead)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`Error analyzing lead ${lead.github_username}:`, error)
      analyzedLeads.push(lead)
    }
  }
  
  return analyzedLeads
} 