import { Octokit } from 'octokit'
import { GitHubRepo, GitHubUser } from './types'
import { differenceInDays } from 'date-fns'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export async function searchN8nRepositories(page: number = 1): Promise<GitHubRepo[]> {
  try {
    const query = 'topic:n8n OR topic:n8n-workflows'
    const response = await octokit.rest.search.repos({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 100,
      page,
    })

    return response.data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      html_url: repo.html_url,
      owner: {
        login: repo.owner.login,
        type: repo.owner.type,
      },
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      topics: repo.topics || [],
    }))
  } catch (error) {
    console.error('Error searching repositories:', error)
    return []
  }
}

export async function getUserInfo(username: string): Promise<GitHubUser | null> {
  try {
    const response = await octokit.rest.users.getByUsername({
      username,
    })

    return {
      login: response.data.login,
      email: response.data.email || undefined,
      public_repos: response.data.public_repos,
      followers: response.data.followers,
      created_at: response.data.created_at,
    }
  } catch (error) {
    console.error(`Error fetching user info for ${username}:`, error)
    return null
  }
}

export function isActiveRepository(repo: GitHubRepo): boolean {
  const lastActivity = new Date(repo.pushed_at)
  const daysSinceActivity = differenceInDays(new Date(), lastActivity)
  return daysSinceActivity <= 90
}

export function isValidN8nRepo(repo: GitHubRepo): boolean {
  const hasN8nTopic = repo.topics.some(topic => 
    topic.toLowerCase().includes('n8n') || 
    topic.toLowerCase().includes('n8n-workflow')
  )
  
  const hasN8nInName = repo.name.toLowerCase().includes('n8n')
  const hasN8nInDescription = repo.description.toLowerCase().includes('n8n')
  
  return hasN8nTopic || hasN8nInName || hasN8nInDescription
} 