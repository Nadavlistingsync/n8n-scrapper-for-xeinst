const { Octokit } = require('octokit')
const { differenceInDays } = require('date-fns')

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

async function searchN8nRepositories(page = 1) {
  try {
    // Search for repositories with n8n in name or description
    const query = 'n8n language:javascript language:typescript language:json'
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
        login: repo.owner?.login || 'unknown',
        type: repo.owner?.type || 'User',
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

async function getUserInfo(username) {
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

function isActiveRepository(repo) {
  const lastActivity = new Date(repo.pushed_at)
  const daysSinceActivity = differenceInDays(new Date(), lastActivity)
  return daysSinceActivity <= 90
}

function isValidN8nRepo(repo) {
  const hasN8nTopic = repo.topics.some(topic => 
    topic.toLowerCase().includes('n8n') || 
    topic.toLowerCase().includes('n8n-workflow')
  )
  
  const hasN8nInName = repo.name.toLowerCase().includes('n8n')
  const hasN8nInDescription = repo.description.toLowerCase().includes('n8n')
  
  return hasN8nTopic || hasN8nInName || hasN8nInDescription
}

module.exports = {
  searchN8nRepositories,
  getUserInfo,
  isActiveRepository,
  isValidN8nRepo
} 