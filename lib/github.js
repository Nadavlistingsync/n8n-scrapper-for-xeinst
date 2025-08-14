const { Octokit } = require('octokit')
const { differenceInDays } = require('date-fns')

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

async function searchN8nRepositories(page = 1, customQuery = null) {
  try {
    // Search for repositories with n8n in name or description
    const query = customQuery || 'n8n language:javascript language:typescript language:json'
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
      bio: response.data.bio || '',
      company: response.data.company || '',
      location: response.data.location || '',
      blog: response.data.blog || '',
      twitter_username: response.data.twitter_username || '',
    }
  } catch (error) {
    console.error(`Error fetching user info for ${username}:`, error)
    return null
  }
}

// Enhanced email discovery function
async function discoverUserEmail(username) {
  try {
    // Method 1: Check user profile for public email
    const userInfo = await getUserInfo(username)
    if (userInfo?.email) {
      return { email: userInfo.email, source: 'profile' }
    }

    // Method 2: Check user's bio for email patterns
    if (userInfo?.bio) {
      const emailMatch = userInfo.bio.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
      if (emailMatch) {
        return { email: emailMatch[0], source: 'bio' }
      }
    }

    // Method 3: Check user's blog/website for contact info
    if (userInfo?.blog) {
      try {
        // This would require additional HTTP requests to check websites
        // For now, we'll skip this to avoid rate limiting
        console.log(`ℹ️  User ${username} has blog: ${userInfo.blog} (manual check needed)`)
      } catch (error) {
        // Ignore website checking errors
      }
    }

    // Method 4: Check recent commits for email
    try {
      const commitsResponse = await octokit.rest.repos.listCommits({
        owner: username,
        repo: await getMostActiveRepo(username),
        per_page: 10
      })
      
      for (const commit of commitsResponse.data) {
        if (commit.commit?.author?.email && !commit.commit.author.email.includes('noreply@github.com')) {
          return { email: commit.commit.author.email, source: 'commit' }
        }
      }
    } catch (error) {
      // Ignore commit checking errors
    }

    // Method 5: Check README files for contact info
    try {
      const readmeResponse = await octokit.rest.repos.getReadme({
        owner: username,
        repo: await getMostActiveRepo(username)
      })
      
      const readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString()
      const emailMatch = readmeContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
      if (emailMatch) {
        return { email: emailMatch[0], source: 'readme' }
      }
    } catch (error) {
      // Ignore README checking errors
    }

    return null
  } catch (error) {
    console.error(`Error discovering email for ${username}:`, error)
    return null
  }
}

// Get user's most active repository
async function getMostActiveRepo(username) {
  try {
    const reposResponse = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 1
    })
    
    if (reposResponse.data.length > 0) {
      return reposResponse.data[0].name
    }
    return null
  } catch (error) {
    return null
  }
}

// Enhanced user filtering for better success rate
function isHighValueUser(userInfo) {
  if (!userInfo) return false
  
  // Users with more followers are more likely to be business users
  if (userInfo.followers > 10) return true
  
  // Users with company info are likely business users
  if (userInfo.company && userInfo.company.trim()) return true
  
  // Users with blog/website are likely business users
  if (userInfo.blog && userInfo.blog.trim()) return true
  
  // Users with location info are more likely to be real users
  if (userInfo.location && userInfo.location.trim()) return true
  
  // Users with bio are more likely to be active
  if (userInfo.bio && userInfo.bio.trim()) return true
  
  return false
}

// Enhanced repository filtering
function isHighValueRepository(repo) {
  if (!repo) return false
  
  // Repositories with descriptions are more likely to be serious projects
  if (!repo.description || repo.description.trim().length < 10) return false
  
  // Repositories with recent activity
  const lastActivity = new Date(repo.pushed_at)
  const daysSinceActivity = differenceInDays(new Date(), lastActivity)
  if (daysSinceActivity > 365) return false // Skip very old repos
  
  // Repositories with topics are more likely to be well-maintained
  if (repo.topics && repo.topics.length > 0) return true
  
  return true
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
  discoverUserEmail,
  isHighValueUser,
  isHighValueRepository,
  isActiveRepository,
  isValidN8nRepo
} 