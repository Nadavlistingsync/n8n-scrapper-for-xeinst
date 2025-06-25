export interface Lead {
  id: string
  github_username: string
  repo_name: string
  repo_url: string
  repo_description: string
  email?: string
  last_activity: string
  created_at: string
  email_sent?: boolean
  email_sent_at?: string
  status: 'new' | 'contacted' | 'responded' | 'converted'
  email_approved?: boolean
  email_pending_approval?: boolean
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  owner: {
    login: string
    type: string
  }
  updated_at: string
  pushed_at: string
  topics: string[]
}

export interface GitHubUser {
  login: string
  email?: string
  public_repos: number
  followers: number
  created_at: string
}

export interface ScrapeResult {
  success: boolean
  message: string
  leadsFound: number
  leadsAdded: number
  errors?: string[]
}

export interface EmailResult {
  success: boolean
  message: string
  emailsSent: number
  errors?: string[]
}

export interface PendingEmail {
  leadId: string
  github_username: string
  email: string
  repo_name: string
  repo_description: string
  emailContent: string
  dmScript?: string
} 