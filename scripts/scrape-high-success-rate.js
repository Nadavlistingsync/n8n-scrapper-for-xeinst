#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { 
  discoverUserEmail, 
  isHighValueUser, 
  isHighValueRepository,
  getUserInfo 
} = require('../lib/github.js')
const { insertLead, checkLeadExists } = require('../lib/supabase.js')

// Automatic feedback loop for debugging
class ScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
    this.emailSources = {
      profile: 0,
      bio: 0,
      commit: 0,
      readme: 0
    }
  }

  logError(message, error = null) {
    this.errors.push({ message, error, timestamp: new Date() })
    console.error(`❌ ${message}`, error ? `(${error.message})` : '')
  }

  logWarning(message) {
    this.warnings.push({ message, timestamp: new Date() })
    console.warn(`⚠️  ${message}`)
  }

  logSuccess(message) {
    this.successCount++
    console.log(`✅ ${message}`)
  }

  logInfo(message) {
    console.log(`ℹ️  ${message}`)
  }

  logEmailSource(source) {
    if (this.emailSources[source] !== undefined) {
      this.emailSources[source]++
    }
  }

  getStats() {
    const duration = Math.round((Date.now() - this.startTime) / 1000)
    const successRate = this.successCount + this.failureCount > 0 
      ? Math.round(this.successCount / (this.successCount + this.failureCount) * 100)
      : 0

    return {
      duration,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      emailSources: this.emailSources
    }
  }
}

// Search function for different terms
async function searchRepositories(query, page = 1) {
  const { Octokit } = require('octokit')
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  })

  try {
    const response = await octokit.rest.search.repos({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 100,
      page: page
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
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
    }))
  } catch (error) {
    console.error('Error searching repositories:', error)
    return []
  }
}

async function scrapeHighSuccessRate() {
  console.log('🎯 🚀 Starting high-success-rate scraping for 1,000 leads...');
  
  const feedback = new ScrapingFeedbackLoop()
  let totalRepositories = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // High-value search queries targeting users more likely to have emails
  const searchQueries = [
    // Business/Enterprise focused queries
    'enterprise automation company:true language:javascript language:typescript language:json',
    'business automation company:true language:javascript language:typescript language:json',
    'workflow automation company:true language:javascript language:typescript language:json',
    'process automation company:true language:javascript language:typescript language:json',
    'task automation company:true language:javascript language:typescript language:json',
    
    // Professional services
    'consulting automation language:javascript language:typescript language:json',
    'agency automation language:javascript language:typescript language:json',
    'freelance automation language:javascript language:typescript language:json',
    'professional automation language:javascript language:typescript language:json',
    'service automation language:javascript language:typescript language:json',
    
    // Well-established companies
    'startup automation language:javascript language:typescript language:json',
    'saas automation language:javascript language:typescript language:json',
    'platform automation language:javascript language:typescript language:json',
    'software automation language:javascript language:typescript language:json',
    'tech automation language:javascript language:typescript language:json',
    
    // Specific business domains
    'crm automation language:javascript language:typescript language:json',
    'marketing automation language:javascript language:typescript language:json',
    'sales automation language:javascript language:typescript language:json',
    'support automation language:javascript language:typescript language:json',
    'hr automation language:javascript language:typescript language:json',
    
    // Integration focused
    'api integration language:javascript language:typescript language:json',
    'webhook automation language:javascript language:typescript language:json',
    'third party integration language:javascript language:typescript language:json',
    'service integration language:javascript language:typescript language:json',
    'data integration language:javascript language:typescript language:json',
    
    // Professional tools
    'developer tool language:javascript language:typescript language:json',
    'productivity tool language:javascript language:typescript language:json',
    'business tool language:javascript language:typescript language:json',
    'management tool language:javascript language:typescript language:json',
    'automation tool language:javascript language:typescript language:json',
    
    // Popular frameworks and platforms
    'react automation language:javascript language:typescript language:json',
    'vue automation language:javascript language:typescript language:json',
    'angular automation language:javascript language:typescript language:json',
    'node automation language:javascript language:typescript language:json',
    'express automation language:javascript language:typescript language:json',
    
    // Cloud platforms
    'aws automation language:javascript language:typescript language:json',
    'azure automation language:javascript language:typescript language:json',
    'gcp automation language:javascript language:typescript language:json',
    'heroku automation language:javascript language:typescript language:json',
    'vercel automation language:javascript language:typescript language:json',
    
    // Database and data
    'database automation language:javascript language:typescript language:json',
    'data processing language:javascript language:typescript language:json',
    'analytics automation language:javascript language:typescript language:json',
    'reporting automation language:javascript language:typescript language:json',
    'dashboard automation language:javascript language:typescript language:json',
    
    // Communication and collaboration
    'slack automation language:javascript language:typescript language:json',
    'discord automation language:javascript language:typescript language:json',
    'teams automation language:javascript language:typescript language:json',
    'zoom automation language:javascript language:typescript language:json',
    'communication automation language:javascript language:typescript language:json',
    
    // E-commerce and payments
    'shopify automation language:javascript language:typescript language:json',
    'stripe automation language:javascript language:typescript language:json',
    'paypal automation language:javascript language:typescript language:json',
    'ecommerce automation language:javascript language:typescript language:json',
    'payment automation language:javascript language:typescript language:json',
    
    // Social media and marketing
    'twitter automation language:javascript language:typescript language:json',
    'linkedin automation language:javascript language:typescript language:json',
    'facebook automation language:javascript language:typescript language:json',
    'instagram automation language:javascript language:typescript language:json',
    'social media automation language:javascript language:typescript language:json',
    
    // Project management
    'jira automation language:javascript language:typescript language:json',
    'trello automation language:javascript language:typescript language:json',
    'asana automation language:javascript language:typescript language:json',
    'notion automation language:javascript language:typescript language:json',
    'project management automation language:javascript language:typescript language:json',
    
    // Development tools
    'github automation language:javascript language:typescript language:json',
    'gitlab automation language:javascript language:typescript language:json',
    'bitbucket automation language:javascript language:typescript language:json',
    'ci cd automation language:javascript language:typescript language:json',
    'deployment automation language:javascript language:typescript language:json',
    
    // Monitoring and logging
    'monitoring automation language:javascript language:typescript language:json',
    'logging automation language:javascript language:typescript language:json',
    'alerting automation language:javascript language:typescript language:json',
    'metrics automation language:javascript language:typescript language:json',
    'observability automation language:javascript language:typescript language:json',
    
    // Security and compliance
    'security automation language:javascript language:typescript language:json',
    'compliance automation language:javascript language:typescript language:json',
    'audit automation language:javascript language:typescript language:json',
    'authentication automation language:javascript language:typescript language:json',
    'authorization automation language:javascript language:typescript language:json',
    
    // AI and ML
    'ai automation language:javascript language:typescript language:json',
    'machine learning automation language:javascript language:typescript language:json',
    'nlp automation language:javascript language:typescript language:json',
    'chatbot automation language:javascript language:typescript language:json',
    'intelligent automation language:javascript language:typescript language:json',
    
    // IoT and hardware
    'iot automation language:javascript language:typescript language:json',
    'hardware automation language:javascript language:typescript language:json',
    'sensor automation language:javascript language:typescript language:json',
    'device automation language:javascript language:typescript language:json',
    'smart home automation language:javascript language:typescript language:json',
    
    // Blockchain and crypto
    'blockchain automation language:javascript language:typescript language:json',
    'crypto automation language:javascript language:typescript language:json',
    'defi automation language:javascript language:typescript language:json',
    'nft automation language:javascript language:typescript language:json',
    'web3 automation language:javascript language:typescript language:json',
    
    // Mobile and web
    'mobile automation language:javascript language:typescript language:json',
    'web automation language:javascript language:typescript language:json',
    'app automation language:javascript language:typescript language:json',
    'progressive web app automation language:javascript language:typescript language:json',
    'cross platform automation language:javascript language:typescript language:json',
    
    // Testing and quality
    'testing automation language:javascript language:typescript language:json',
    'qa automation language:javascript language:typescript language:json',
    'quality assurance automation language:javascript language:typescript language:json',
    'test automation language:javascript language:typescript language:json',
    'automated testing language:javascript language:typescript language:json',
    
    // Documentation and content
    'documentation automation language:javascript language:typescript language:json',
    'content automation language:javascript language:typescript language:json',
    'blog automation language:javascript language:typescript language:json',
    'seo automation language:javascript language:typescript language:json',
    'content management automation language:javascript language:typescript language:json',
    
    // Customer service
    'customer service automation language:javascript language:typescript language:json',
    'support automation language:javascript language:typescript language:json',
    'help desk automation language:javascript language:typescript language:json',
    'ticket automation language:javascript language:typescript language:json',
    'customer support automation language:javascript language:typescript language:json',
    
    // Finance and accounting
    'finance automation language:javascript language:typescript language:json',
    'accounting automation language:javascript language:typescript language:json',
    'billing automation language:javascript language:typescript language:json',
    'invoicing automation language:javascript language:typescript language:json',
    'financial automation language:javascript language:typescript language:json',
    
    // Education and training
    'education automation language:javascript language:typescript language:json',
    'training automation language:javascript language:typescript language:json',
    'learning automation language:javascript language:typescript language:json',
    'course automation language:javascript language:typescript language:json',
    'educational automation language:javascript language:typescript language:json',
    
    // Healthcare and medical
    'healthcare automation language:javascript language:typescript language:json',
    'medical automation language:javascript language:typescript language:json',
    'health automation language:javascript language:typescript language:json',
    'patient automation language:javascript language:typescript language:json',
    'medical device automation language:javascript language:typescript language:json',
    
    // Legal and compliance
    'legal automation language:javascript language:typescript language:json',
    'law automation language:javascript language:typescript language:json',
    'contract automation language:javascript language:typescript language:json',
    'legal tech automation language:javascript language:typescript language:json',
    'regulatory automation language:javascript language:typescript language:json',
    
    // Real estate and property
    'real estate automation language:javascript language:typescript language:json',
    'property automation language:javascript language:typescript language:json',
    'housing automation language:javascript language:typescript language:json',
    'rental automation language:javascript language:typescript language:json',
    'property management automation language:javascript language:typescript language:json',
    
    // Transportation and logistics
    'transportation automation language:javascript language:typescript language:json',
    'logistics automation language:javascript language:typescript language:json',
    'shipping automation language:javascript language:typescript language:json',
    'delivery automation language:javascript language:typescript language:json',
    'fleet automation language:javascript language:typescript language:json',
    
    // Manufacturing and industrial
    'manufacturing automation language:javascript language:typescript language:json',
    'industrial automation language:javascript language:typescript language:json',
    'factory automation language:javascript language:typescript language:json',
    'production automation language:javascript language:typescript language:json',
    'industrial iot automation language:javascript language:typescript language:json',
    
    // Energy and utilities
    'energy automation language:javascript language:typescript language:json',
    'utility automation language:javascript language:typescript language:json',
    'power automation language:javascript language:typescript language:json',
    'solar automation language:javascript language:typescript language:json',
    'renewable energy automation language:javascript language:typescript language:json',
    
    // Agriculture and farming
    'agriculture automation language:javascript language:typescript language:json',
    'farming automation language:javascript language:typescript language:json',
    'agricultural automation language:javascript language:typescript language:json',
    'smart farming automation language:javascript language:typescript language:json',
    'precision agriculture automation language:javascript language:typescript language:json',
    
    // Retail and commerce
    'retail automation language:javascript language:typescript language:json',
    'commerce automation language:javascript language:typescript language:json',
    'store automation language:javascript language:typescript language:json',
    'inventory automation language:javascript language:typescript language:json',
    'point of sale automation language:javascript language:typescript language:json',
    
    // Hospitality and tourism
    'hospitality automation language:javascript language:typescript language:json',
    'tourism automation language:javascript language:typescript language:json',
    'hotel automation language:javascript language:typescript language:json',
    'restaurant automation language:javascript language:typescript language:json',
    'travel automation language:javascript language:typescript language:json',
    
    // Entertainment and media
    'entertainment automation language:javascript language:typescript language:json',
    'media automation language:javascript language:typescript language:json',
    'streaming automation language:javascript language:typescript language:json',
    'content creation automation language:javascript language:typescript language:json',
    'video automation language:javascript language:typescript language:json',
    
    // Gaming and esports
    'gaming automation language:javascript language:typescript language:json',
    'game automation language:javascript language:typescript language:json',
    'esports automation language:javascript language:typescript language:json',
    'game development automation language:javascript language:typescript language:json',
    'gaming platform automation language:javascript language:typescript language:json',
    
    // Sports and fitness
    'sports automation language:javascript language:typescript language:json',
    'fitness automation language:javascript language:typescript language:json',
    'health tracking automation language:javascript language:typescript language:json',
    'workout automation language:javascript language:typescript language:json',
    'athletic automation language:javascript language:typescript language:json',
    
    // Non-profit and social impact
    'nonprofit automation language:javascript language:typescript language:json',
    'social impact automation language:javascript language:typescript language:json',
    'charity automation language:javascript language:typescript language:json',
    'volunteer automation language:javascript language:typescript language:json',
    'social good automation language:javascript language:typescript language:json',
    
    // Government and public sector
    'government automation language:javascript language:typescript language:json',
    'public sector automation language:javascript language:typescript language:json',
    'civic automation language:javascript language:typescript language:json',
    'public service automation language:javascript language:typescript language:json',
    'government tech automation language:javascript language:typescript language:json'
  ];

  for (const query of searchQueries) {
    feedback.logInfo(`🔍 Searching for: "${query}"`);
    
    for (let page = 1; page <= 2; page++) { // Reduced pages to focus on quality
      try {
        feedback.logInfo(`📄 Scraping page ${page}...`);
        
        const repositories = await searchRepositories(query, page);
        if (!repositories || repositories.length === 0) {
          feedback.logWarning(`No repositories found on page ${page}, stopping...`);
          break;
        }
        
        feedback.logInfo(`Found ${repositories.length} repositories on page ${page}`);
        totalRepositories += repositories.length;

        for (const repo of repositories) {
          try {
            // Enhanced filtering for high-value repositories
            if (!isHighValueRepository(repo)) {
              feedback.logInfo(`⏭️  Skipping low-value repo: ${repo.owner.login}/${repo.name}`);
              continue;
            }

            // Check if lead already exists
            const existingLead = await checkLeadExists(repo.owner.login, repo.name);
            if (existingLead) {
              feedback.logInfo(`Lead already exists: ${repo.owner.login}/${repo.name}`);
              continue;
            }

            // Get user info first to check if it's a high-value user
            feedback.logInfo(`👤 Fetching user info for ${repo.owner.login}...`);
            const userInfo = await getUserInfo(repo.owner.login);
            
            if (!isHighValueUser(userInfo)) {
              feedback.logInfo(`⏭️  Skipping low-value user: ${repo.owner.login}`);
              continue;
            }

            // Enhanced email discovery
            feedback.logInfo(`🔍 Discovering email for ${repo.owner.login}...`);
            const emailResult = await discoverUserEmail(repo.owner.login);
            
            if (!emailResult) {
              feedback.logInfo(`⏭️  No email found for ${repo.owner.login}/${repo.name}`);
              feedback.failureCount++;
              continue;
            }

            // Save lead to database
            const leadData = {
              github_username: repo.owner.login,
              repo_name: repo.name,
              repo_url: repo.html_url,
              repo_description: repo.description,
              email: emailResult.email,
              last_activity: repo.pushed_at,
              status: 'new',
              email_sent: false,
              email_approved: false,
              email_pending_approval: false
            };

            const result = await insertLead(leadData);
            if (result) {
              feedback.logSuccess(`Added lead: ${repo.owner.login}/${repo.name} (${emailResult.email}) - Source: ${emailResult.source}`);
              feedback.logEmailSource(emailResult.source);
              newLeadsAdded++;
              
              // Check if we've reached 1000
              if (newLeadsAdded >= 1000) {
                const stats = feedback.getStats();
                feedback.logInfo(`🎉 Reached target! Added ${newLeadsAdded} new leads`);
                feedback.logInfo(`⏱️  Total time: ${stats.duration}s`);
                feedback.logInfo(`📊 Success rate: ${stats.successRate}%`);
                feedback.logInfo(`📧 Email sources:`, stats.emailSources);
                return;
              }
            } else {
              feedback.logError(`Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
            }

          } catch (error) {
            feedback.logError(`Error processing repository ${repo.owner.login}/${repo.name}:`, error.message);
          }
        }

        // Add delay between pages to respect rate limits
        if (page < 2) {
          feedback.logInfo('⏳ Waiting 1 second before next page...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        feedback.logError(`Error scraping page ${page}:`, error.message);
        break;
      }
    }

    // Add delay between search queries
    if (searchQueries.indexOf(query) < searchQueries.length - 1) {
      feedback.logInfo('⏳ Waiting 2 seconds before next search query...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const stats = feedback.getStats();
  
  feedback.logInfo('✅ 🎉 Scraping completed!');
  feedback.logInfo(`📊 Total repositories found: ${totalRepositories}`);
  feedback.logInfo(`✅ New leads with emails added: ${newLeadsAdded}`);
  feedback.logInfo(`📧 Email sources:`, stats.emailSources);

  // Generate detailed report
  console.log('\n📊 DETAILED SCRAPING REPORT');
  console.log('==========================');
  console.log(`⏱️  Duration: ${stats.duration}s`);
  console.log(`✅ Successes: ${stats.successCount}`);
  console.log(`❌ Failures: ${stats.failureCount}`);
  console.log(`📈 Success Rate: ${stats.successRate}%`);
  console.log(`⚠️  Warnings: ${stats.warningCount}`);
  console.log(`💥 Errors: ${stats.errorCount}`);
  console.log('\n📧 Email Discovery Sources:');
  Object.entries(stats.emailSources).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });
  console.log('\n✨ High-success-rate scraping completed successfully');
}

// Run the scraper
if (require.main === module) {
  scrapeHighSuccessRate()
    .then(() => {
      console.log('\n✨ High-success-rate scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 High-success-rate scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeHighSuccessRate } 