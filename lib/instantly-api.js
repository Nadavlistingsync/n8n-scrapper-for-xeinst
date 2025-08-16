const axios = require('axios')

class InstantlyAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.instantly.ai/api/v1'
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  // Test API connection
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/campaigns`, {
        headers: this.headers
      })
      return {
        success: true,
        message: 'Instantly API connection successful',
        campaigns: response.data
      }
    } catch (error) {
      return {
        success: false,
        message: 'Instantly API connection failed',
        error: error.response?.data || error.message
      }
    }
  }

  // Get all campaigns
  async getCampaigns() {
    try {
      const response = await axios.get(`${this.baseURL}/campaigns`, {
        headers: this.headers
      })
      return response.data
    } catch (error) {
      console.error('Error fetching campaigns:', error.response?.data || error.message)
      throw error
    }
  }

  // Add leads to a campaign
  async addLeadsToCampaign(campaignId, leads) {
    try {
      const response = await axios.post(`${this.baseURL}/campaign/${campaignId}/leads`, {
        leads: leads
      }, {
        headers: this.headers
      })
      return response.data
    } catch (error) {
      console.error('Error adding leads to campaign:', error.response?.data || error.message)
      throw error
    }
  }

  // Add a single lead to a campaign
  async addLeadToCampaign(campaignId, lead) {
    try {
      const response = await axios.post(`${this.baseURL}/campaign/${campaignId}/leads`, {
        leads: [lead]
      }, {
        headers: this.headers
      })
      return response.data
    } catch (error) {
      console.error('Error adding lead to campaign:', error.response?.data || error.message)
      throw error
    }
  }

  // Create a new campaign
  async createCampaign(campaignData) {
    try {
      const response = await axios.post(`${this.baseURL}/campaign`, campaignData, {
        headers: this.headers
      })
      return response.data
    } catch (error) {
      console.error('Error creating campaign:', error.response?.data || error.message)
      throw error
    }
  }

  // Get campaign statistics
  async getCampaignStats(campaignId) {
    try {
      const response = await axios.get(`${this.baseURL}/campaign/${campaignId}/stats`, {
        headers: this.headers
      })
      return response.data
    } catch (error) {
      console.error('Error fetching campaign stats:', error.response?.data || error.message)
      throw error
    }
  }

  // Format lead data for Instantly API
  formatLeadForInstantly(lead) {
    return {
      email: lead.email,
      first_name: lead.github_username || '',
      last_name: '',
      company: '',
      website: lead.repo_url || '',
      linkedin_url: '',
      phone: '',
      custom_fields: {
        github_username: lead.github_username || '',
        repo_name: lead.repo_name || '',
        repo_description: lead.repo_description || '',
        last_activity: lead.last_activity || '',
        status: lead.status || 'new'
      }
    }
  }

  // Batch add leads with automatic feedback loop
  async batchAddLeadsToCampaign(campaignId, leads, batchSize = 50) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      total: leads.length
    }

    console.log(`📧 Adding ${leads.length} leads to Instantly campaign ${campaignId} in batches of ${batchSize}`)

    // Process leads in batches
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize)
      const formattedBatch = batch.map(lead => this.formatLeadForInstantly(lead))

      try {
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leads.length / batchSize)} (${batch.length} leads)`)
        
        const result = await this.addLeadsToCampaign(campaignId, formattedBatch)
        
        if (result.success) {
          results.success += batch.length
          console.log(`✅ Successfully added batch ${Math.floor(i / batchSize) + 1}`)
        } else {
          results.failed += batch.length
          results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${result.message || 'Unknown error'}`)
          console.log(`❌ Failed to add batch ${Math.floor(i / batchSize) + 1}`)
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < leads.length) {
          console.log('⏳ Waiting 1 second before next batch...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        results.failed += batch.length
        results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        console.log(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      }
    }

    console.log(`📊 Batch processing complete: ${results.success} successful, ${results.failed} failed`)
    return results
  }
}

// Initialize Instantly API with environment variable
function createInstantlyAPI() {
  const apiKey = process.env.INSTANTLY_API_KEY
  if (!apiKey) {
    throw new Error('INSTANTLY_API_KEY environment variable is required')
  }
  return new InstantlyAPI(apiKey)
}

module.exports = {
  InstantlyAPI,
  createInstantlyAPI
}
