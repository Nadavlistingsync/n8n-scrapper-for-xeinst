import fs from 'fs'
import path from 'path'
import { Lead } from './types'

// Google Sheets Database Layer
// This replaces Supabase with Google Sheets using CSV files

const DATA_DIR = path.join(process.cwd(), 'data')
const LEADS_FILE = path.join(DATA_DIR, 'leads.csv')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')

// Ensure data directory exists
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

// CSV helpers
function leadToCSVRow(lead: Lead): string {
  return [
    lead.id,
    lead.github_username,
    lead.repo_name,
    lead.repo_url,
    lead.repo_description || '',
    lead.email || '',
    lead.last_activity,
    lead.created_at,
    lead.email_sent ? 'true' : 'false',
    lead.email_sent_at || '',
    lead.status,
    lead.email_approved ? 'true' : 'false',
    lead.email_pending_approval ? 'true' : 'false',
    lead.ai_score?.toString() || '',
    lead.ai_recommendation || '',
    lead.ai_analysis || ''
  ].map(field => `"${field.replace(/"/g, '""')}"`).join(',')
}

function csvRowToLead(row: string): Lead {
  const fields = row.split(',').map(field => {
    const trimmed = field.trim()
    return trimmed.startsWith('"') && trimmed.endsWith('"') 
      ? trimmed.slice(1, -1).replace(/""/g, '"') 
      : trimmed
  })
  
  return {
    id: fields[0],
    github_username: fields[1],
    repo_name: fields[2],
    repo_url: fields[3],
    repo_description: fields[4],
    email: fields[5] || undefined,
    last_activity: fields[6],
    created_at: fields[7],
    email_sent: fields[8] === 'true',
    email_sent_at: fields[9] || undefined,
    status: fields[10] as Lead['status'],
    email_approved: fields[11] === 'true',
    email_pending_approval: fields[12] === 'true',
    ai_score: fields[13] ? parseFloat(fields[13]) : undefined,
    ai_recommendation: fields[14] as Lead['ai_recommendation'] || undefined,
    ai_analysis: fields[15] || undefined
  }
}

// Database operations
export async function getAllLeads(): Promise<Lead[]> {
  ensureDataDirectory()
  
  if (!fs.existsSync(LEADS_FILE)) {
    return []
  }
  
  const content = fs.readFileSync(LEADS_FILE, 'utf8')
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length <= 1) return [] // Only header or empty
  
  const leads = lines.slice(1).map(line => csvRowToLead(line))
  return leads
}

export async function insertLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead | null> {
  ensureDataDirectory()
  
  const newLead: Lead = {
    ...lead,
    id: generateId(),
    created_at: new Date().toISOString()
  }
  
  const leads = await getAllLeads()
  
  // Check for duplicates
  const exists = leads.some(l => 
    l.github_username === newLead.github_username && 
    l.repo_name === newLead.repo_name
  )
  
  if (exists) {
    return null
  }
  
  leads.push(newLead)
  await saveLeads(leads)
  
  return newLead
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const leads = await getAllLeads()
  const index = leads.findIndex(lead => lead.id === id)
  
  if (index === -1) return null
  
  leads[index] = { ...leads[index], ...updates }
  await saveLeads(leads)
  
  return leads[index]
}

export async function getLeadsForAIAnalysis(): Promise<Lead[]> {
  const leads = await getAllLeads()
  return leads.filter(lead => 
    !lead.ai_score && 
    !lead.ai_recommendation && 
    lead.status === 'new'
  )
}

export async function getLeadsByStatus(status: Lead['status']): Promise<Lead[]> {
  const leads = await getAllLeads()
  return leads.filter(lead => lead.status === status)
}

export async function getLeadsForEmailCampaign(): Promise<Lead[]> {
  const leads = await getAllLeads()
  return leads.filter(lead => 
    lead.email && 
    !lead.email_sent && 
    lead.email_approved === true &&
    lead.status === 'new'
  )
}

export async function checkLeadExists(githubUsername: string, repoName: string): Promise<boolean> {
  const leads = await getAllLeads()
  return leads.some(lead => 
    lead.github_username === githubUsername && 
    lead.repo_name === repoName
  )
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

async function saveLeads(leads: Lead[]): Promise<void> {
  ensureDataDirectory()
  
  const headers = [
    'id', 'github_username', 'repo_name', 'repo_url', 'repo_description',
    'email', 'last_activity', 'created_at', 'email_sent', 'email_sent_at',
    'status', 'email_approved', 'email_pending_approval', 'ai_score',
    'ai_recommendation', 'ai_analysis'
  ]
  
  const csvContent = [
    headers.join(','),
    ...leads.map(lead => leadToCSVRow(lead))
  ].join('\n')
  
  fs.writeFileSync(LEADS_FILE, csvContent)
  
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(BACKUP_DIR, `leads-backup-${timestamp}.csv`)
  fs.writeFileSync(backupFile, csvContent)
}

// Export functions for Google Sheets
export async function exportToCSV(): Promise<string> {
  const leads = await getAllLeads()
  const headers = [
    'ID', 'GitHub Username', 'Repository Name', 'Repository URL', 'Description',
    'Email', 'Last Activity', 'Created At', 'Email Sent', 'Email Sent At',
    'Status', 'Email Approved', 'Email Pending', 'AI Score', 'AI Recommendation', 'AI Analysis'
  ]
  
  const csvContent = [
    headers.join(','),
    ...leads.map(lead => leadToCSVRow(lead))
  ].join('\n')
  
  const timestamp = new Date().toISOString().split('T')[0]
  const exportFile = path.join(DATA_DIR, `leads-export-${timestamp}.csv`)
  fs.writeFileSync(exportFile, csvContent)
  
  return exportFile
}

export async function importFromCSV(filePath: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length <= 1) {
      return { success: false, imported: 0, errors: ['No data found in CSV'] }
    }
    
    const existingLeads = await getAllLeads()
    const newLeads: Lead[] = []
    const errors: string[] = []
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const lead = csvRowToLead(lines[i])
        
        // Check if lead already exists
        const exists = existingLeads.some(l => 
          l.github_username === lead.github_username && 
          l.repo_name === lead.repo_name
        )
        
        if (!exists) {
          newLeads.push(lead)
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`)
      }
    }
    
    if (newLeads.length > 0) {
      const allLeads = [...existingLeads, ...newLeads]
      await saveLeads(allLeads)
    }
    
    return { success: true, imported: newLeads.length, errors }
  } catch (error) {
    return { success: false, imported: 0, errors: [error.toString()] }
  }
}

// Analytics functions
export async function getAnalytics() {
  const leads = await getAllLeads()
  
  return {
    total: leads.length,
    byStatus: {
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      responded: leads.filter(l => l.status === 'responded').length,
      converted: leads.filter(l => l.status === 'converted').length
    },
    withEmail: leads.filter(l => l.email).length,
    emailSent: leads.filter(l => l.email_sent).length,
    emailApproved: leads.filter(l => l.email_approved).length,
    aiAnalyzed: leads.filter(l => l.ai_score).length,
    aiRecommendations: {
      approve: leads.filter(l => l.ai_recommendation === 'approve').length,
      reject: leads.filter(l => l.ai_recommendation === 'reject').length,
      review: leads.filter(l => l.ai_recommendation === 'review').length
    }
  }
}
