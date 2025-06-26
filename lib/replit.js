const axios = require('axios')
const cheerio = require('cheerio')

// Replit API and scraping utilities
class ReplitScraper {
  constructor() {
    this.baseUrl = 'https://replit.com'
    this.apiUrl = 'https://replit.com/graphql'
    this.session = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
  }

  // Search for Replit projects by keywords
  async searchProjects(query, page = 1) {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`
      const response = await this.session.get(searchUrl)
      
      if (response.status !== 200) {
        console.error(`Failed to search Replit: ${response.status}`)
        return []
      }

      const $ = cheerio.load(response.data)
      const projects = []

      // Extract project information from search results
      $('.repl-card, .project-card, [data-testid="repl-card"]').each((index, element) => {
        const $el = $(element)
        
        const title = $el.find('.repl-title, .project-title, h3, h4').first().text().trim()
        const description = $el.find('.repl-description, .project-description, p').first().text().trim()
        const author = $el.find('.repl-author, .project-author, .username').first().text().trim()
        const url = $el.find('a').first().attr('href')
        const language = $el.find('.language-tag, .lang-tag').first().text().trim()
        
        if (title && author) {
          projects.push({
            title,
            description,
            author,
            url: url ? `${this.baseUrl}${url}` : null,
            language,
            platform: 'replit'
          })
        }
      })

      return projects
    } catch (error) {
      console.error('Error searching Replit projects:', error.message)
      return []
    }
  }

  // Get user profile information
  async getUserProfile(username) {
    try {
      const profileUrl = `${this.baseUrl}/@${username}`
      const response = await this.session.get(profileUrl)
      
      if (response.status !== 200) {
        console.error(`Failed to get profile for ${username}: ${response.status}`)
        return null
      }

      const $ = cheerio.load(response.data)
      
      const profile = {
        username,
        displayName: $('.profile-name, .user-name, h1').first().text().trim(),
        bio: $('.profile-bio, .user-bio, .bio').first().text().trim(),
        location: $('.profile-location, .user-location').first().text().trim(),
        website: $('.profile-website, .user-website a').first().attr('href'),
        email: null,
        followers: 0,
        following: 0,
        projects: []
      }

      // Extract email from bio or other profile sections
      if (profile.bio) {
        const emailMatch = profile.bio.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
        if (emailMatch) {
          profile.email = emailMatch[0]
        }
      }

      // Extract follower counts
      const followersText = $('.followers-count, .follower-count').first().text().trim()
      const followingText = $('.following-count').first().text().trim()
      
      if (followersText) {
        profile.followers = parseInt(followersText.replace(/[^\d]/g, '')) || 0
      }
      if (followingText) {
        profile.following = parseInt(followingText.replace(/[^\d]/g, '')) || 0
      }

      // Get user's projects
      profile.projects = await this.getUserProjects(username)

      return profile
    } catch (error) {
      console.error(`Error getting profile for ${username}:`, error.message)
      return null
    }
  }

  // Get user's projects
  async getUserProjects(username) {
    try {
      const projectsUrl = `${this.baseUrl}/@${username}?tab=repls`
      const response = await this.session.get(projectsUrl)
      
      if (response.status !== 200) {
        return []
      }

      const $ = cheerio.load(response.data)
      const projects = []

      $('.repl-card, .project-card, [data-testid="repl-card"]').each((index, element) => {
        const $el = $(element)
        
        const title = $el.find('.repl-title, .project-title, h3, h4').first().text().trim()
        const description = $el.find('.repl-description, .project-description, p').first().text().trim()
        const url = $el.find('a').first().attr('href')
        const language = $el.find('.language-tag, .lang-tag').first().text().trim()
        
        if (title) {
          projects.push({
            title,
            description,
            url: url ? `${this.baseUrl}${url}` : null,
            language,
            author: username
          })
        }
      })

      return projects
    } catch (error) {
      console.error(`Error getting projects for ${username}:`, error.message)
      return []
    }
  }

  // Get project details and extract emails
  async getProjectDetails(projectUrl) {
    try {
      const response = await this.session.get(projectUrl)
      
      if (response.status !== 200) {
        return null
      }

      const $ = cheerio.load(response.data)
      
      const project = {
        title: $('.project-title, .repl-title, h1').first().text().trim(),
        description: $('.project-description, .repl-description, .description').first().text().trim(),
        author: $('.project-author, .repl-author, .username').first().text().trim(),
        language: $('.language-tag, .lang-tag').first().text().trim(),
        url: projectUrl,
        email: null,
        readme: '',
        files: []
      }

      // Extract email from project description
      if (project.description) {
        const emailMatch = project.description.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
        if (emailMatch) {
          project.email = emailMatch[0]
        }
      }

      // Try to get README content
      try {
        const readmeUrl = `${projectUrl}/files/README.md`
        const readmeResponse = await this.session.get(readmeUrl)
        if (readmeResponse.status === 200) {
          project.readme = readmeResponse.data
          
          // Extract email from README
          const readmeEmailMatch = project.readme.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
          if (readmeEmailMatch && !project.email) {
            project.email = readmeEmailMatch[0]
          }
        }
      } catch (error) {
        // README not found or other error
      }

      return project
    } catch (error) {
      console.error(`Error getting project details for ${projectUrl}:`, error.message)
      return null
    }
  }

  // Search for specific automation-related projects
  async searchAutomationProjects() {
    const automationQueries = [
      'n8n automation',
      'workflow automation',
      'process automation',
      'task automation',
      'business automation',
      'api automation',
      'webhook automation',
      'data automation',
      'email automation',
      'marketing automation',
      'sales automation',
      'crm automation',
      'zapier alternative',
      'make.com automation',
      'integromat automation',
      'automation tool',
      'workflow tool',
      'integration platform',
      'no-code automation',
      'low-code automation'
    ]

    const allProjects = []
    
    for (const query of automationQueries) {
      console.log(`🔍 Searching Replit for: ${query}`)
      
      for (let page = 1; page <= 3; page++) {
        const projects = await this.searchProjects(query, page)
        allProjects.push(...projects)
        
        if (projects.length === 0) {
          break
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return allProjects
  }

  // Extract emails from multiple sources
  async discoverEmails(username) {
    const emails = []
    
    try {
      // Method 1: Check user profile
      const profile = await this.getUserProfile(username)
      if (profile?.email) {
        emails.push({ email: profile.email, source: 'profile', username })
      }

      // Method 2: Check user's projects
      if (profile?.projects) {
        for (const project of profile.projects.slice(0, 5)) { // Check first 5 projects
          if (project.url) {
            const projectDetails = await this.getProjectDetails(project.url)
            if (projectDetails?.email) {
              emails.push({ 
                email: projectDetails.email, 
                source: 'project', 
                username,
                project: projectDetails.title 
              })
            }
          }
        }
      }

      // Method 3: Check bio for email patterns
      if (profile?.bio) {
        const emailMatches = profile.bio.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
        if (emailMatches) {
          emailMatches.forEach(email => {
            emails.push({ email, source: 'bio', username })
          })
        }
      }

    } catch (error) {
      console.error(`Error discovering emails for ${username}:`, error.message)
    }

    return emails
  }

  // Check if user is high-value (likely to have business email)
  isHighValueUser(profile) {
    if (!profile) return false
    
    // Users with more followers are more likely to be business users
    if (profile.followers > 5) return true
    
    // Users with website are likely business users
    if (profile.website && profile.website.trim()) return true
    
    // Users with location info are more likely to be real users
    if (profile.location && profile.location.trim()) return true
    
    // Users with bio are more likely to be active
    if (profile.bio && profile.bio.trim()) return true
    
    // Users with multiple projects are more likely to be serious developers
    if (profile.projects && profile.projects.length > 2) return true
    
    return false
  }
}

module.exports = { ReplitScraper } 