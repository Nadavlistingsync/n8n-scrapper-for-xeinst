import { createClient } from '@supabase/supabase-js'
import { Lead } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function createLeadsTable() {
  try {
    // First check if table exists
    const { error: checkError } = await supabase
      .from('leads')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, create it
      console.log('Creating leads table...')
      
      // Create the table using SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.leads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          github_username TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          owner_name TEXT,
          owner_email TEXT,
          owner_bio TEXT,
          owner_location TEXT,
          owner_company TEXT,
          owner_blog TEXT,
          owner_twitter_username TEXT,
          repo_description TEXT,
          repo_stars INTEGER DEFAULT 0,
          repo_forks INTEGER DEFAULT 0,
          repo_language TEXT,
          repo_created_at TIMESTAMP WITH TIME ZONE,
          repo_updated_at TIMESTAMP WITH TIME ZONE,
          repo_last_commit_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'new',
          email_sent BOOLEAN DEFAULT FALSE,
          email_sent_at TIMESTAMP WITH TIME ZONE,
          email_pending_approval BOOLEAN DEFAULT FALSE,
          email_approved BOOLEAN DEFAULT FALSE,
          ai_score DECIMAL(3,2),
          ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
          ai_analysis TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_github_repo 
        ON public.leads(github_username, repo_name);
      `
      
      // Note: This would require the service role key to execute
      // For now, we'll provide instructions
      console.log('Table creation requires service role key. Please run this SQL in Supabase:')
      console.log(createTableSQL)
      
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking/creating table:', error)
    return false
  }
}

export async function insertLead(lead: Omit<Lead, 'id' | 'created_at'>) {
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

export async function getLeads() {
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

export async function updateLeadStatus(id: string, status: Lead['status'], emailSent?: boolean) {
  const updateData: any = { status }
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

export async function updateLeadAIAnalysis(id: string, aiData: {
  ai_score?: number
  ai_recommendation?: 'approve' | 'reject' | 'review'
  ai_analysis?: string
}) {
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

export async function markEmailPendingApproval(leadId: string) {
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

export async function approveEmail(leadId: string) {
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

export async function rejectEmail(leadId: string) {
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

export async function getLeadsForAIAnalysis() {
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

export async function getLeadsByAIRecommendation(recommendation: 'approve' | 'reject' | 'review') {
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

export async function checkLeadExists(githubUsername: string, repoName: string) {
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