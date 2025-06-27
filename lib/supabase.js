require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertLead(lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      ...lead,
      created_at: new Date().toISOString(),
    }])
    .select()

  if (error) {
    console.error('Error inserting lead:', error)
    return null
  }

  return data[0]
}

async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }

  return data || []
}

async function updateLeadStatus(id, status, emailSent) {
  const updateData = { status }
  if (emailSent) {
    updateData.email_sent = true
    updateData.email_sent_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating lead:', error)
    return null
  }

  return data[0]
}

async function updateLeadAIAnalysis(id, aiData) {
  const { data, error } = await supabase
    .from('leads')
    .update(aiData)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating AI analysis:', error)
    return null
  }

  return data[0]
}

async function markEmailPendingApproval(leadId) {
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      email_pending_approval: true,
      email_approved: false
    })
    .eq('id', leadId)
    .select()

  if (error) {
    console.error('Error marking email pending approval:', error)
    return null
  }

  return data[0]
}

async function approveEmail(leadId) {
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      email_approved: true,
      email_pending_approval: false
    })
    .eq('id', leadId)
    .select()

  if (error) {
    console.error('Error approving email:', error)
    return null
  }

  return data[0]
}

async function rejectEmail(leadId) {
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      email_approved: false,
      email_pending_approval: false
    })
    .eq('id', leadId)
    .select()

  if (error) {
    console.error('Error rejecting email:', error)
    return null
  }

  return data[0]
}

async function getLeadsForAIAnalysis() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .is('ai_score', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads for AI analysis:', error)
    return []
  }

  return data || []
}

async function getLeadsByAIRecommendation(recommendation) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('ai_recommendation', recommendation)
    .order('ai_score', { ascending: false })

  if (error) {
    console.error('Error fetching leads by AI recommendation:', error)
    return []
  }

  return data || []
}

async function checkLeadExists(githubUsername, repoName) {
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('github_username', githubUsername)
    .eq('repo_name', repoName)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking lead existence:', error)
  }

  return !!data
}

module.exports = {
  supabase,
  insertLead,
  getLeads,
  updateLeadStatus,
  updateLeadAIAnalysis,
  markEmailPendingApproval,
  approveEmail,
  rejectEmail,
  getLeadsForAIAnalysis,
  getLeadsByAIRecommendation,
  checkLeadExists
} 