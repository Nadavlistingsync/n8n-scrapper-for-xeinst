import { createClient } from '@supabase/supabase-js'
import { Lead } from './types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function createLeadsTable() {
  const { error } = await supabase.rpc('create_leads_table', {})
  if (error) {
    console.error('Error creating leads table:', error)
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