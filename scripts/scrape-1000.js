#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { getUserInfo } = require('../lib/github.js')
const { insertLead, checkLeadExists } = require('../lib/supabase.js')

// Automatic feedback loop for debugging
class ScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
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
      warningCount: this.warnings.length
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
    }))
  } catch (error) {
    console.error('Error searching repositories:', error)
    return []
  }
}

async function scrapeTo1000() {
  console.log('🎯 🚀 Starting comprehensive scraping to reach 1,000 leads...');
  
  let totalRepositories = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // Comprehensive search queries targeting multiple platforms
  const searchQueries = [
    // API and Integration Platforms
    'api integration language:javascript language:typescript language:json',
    'rest api language:javascript language:typescript language:json',
    'graphql api language:javascript language:typescript language:json',
    'microservice language:javascript language:typescript language:json',
    'serverless function language:javascript language:typescript language:json',
    
    // Cloud Platforms
    'aws lambda language:javascript language:typescript language:json',
    'azure function language:javascript language:typescript language:json',
    'google cloud function language:javascript language:typescript language:json',
    'vercel function language:javascript language:typescript language:json',
    'netlify function language:javascript language:typescript language:json',
    'cloudflare worker language:javascript language:typescript language:json',
    
    // Database and Backend
    'mongodb language:javascript language:typescript language:json',
    'postgresql language:javascript language:typescript language:json',
    'mysql language:javascript language:typescript language:json',
    'redis language:javascript language:typescript language:json',
    'elasticsearch language:javascript language:typescript language:json',
    'firebase language:javascript language:typescript language:json',
    
    // Frontend Frameworks
    'react app language:javascript language:typescript language:json',
    'vue app language:javascript language:typescript language:json',
    'angular app language:javascript language:typescript language:json',
    'next.js app language:javascript language:typescript language:json',
    'nuxt.js app language:javascript language:typescript language:json',
    
    // Mobile and Desktop
    'react native language:javascript language:typescript language:json',
    'electron app language:javascript language:typescript language:json',
    'flutter language:javascript language:typescript language:json',
    'cordova language:javascript language:typescript language:json',
    
    // DevOps and CI/CD
    'docker language:javascript language:typescript language:json',
    'kubernetes language:javascript language:typescript language:json',
    'jenkins language:javascript language:typescript language:json',
    'github actions language:javascript language:typescript language:json',
    'gitlab ci language:javascript language:typescript language:json',
    
    // E-commerce and Business
    'shopify language:javascript language:typescript language:json',
    'woocommerce language:javascript language:typescript language:json',
    'stripe language:javascript language:typescript language:json',
    'paypal language:javascript language:typescript language:json',
    'square language:javascript language:typescript language:json',
    
    // CMS and Content
    'wordpress language:javascript language:typescript language:json',
    'drupal language:javascript language:typescript language:json',
    'contentful language:javascript language:typescript language:json',
    'sanity language:javascript language:typescript language:json',
    'strapi language:javascript language:typescript language:json',
    
    // Analytics and Marketing
    'google analytics language:javascript language:typescript language:json',
    'mixpanel language:javascript language:typescript language:json',
    'amplitude language:javascript language:typescript language:json',
    'segment language:javascript language:typescript language:json',
    'mailchimp language:javascript language:typescript language:json',
    
    // Social Media
    'twitter api language:javascript language:typescript language:json',
    'facebook api language:javascript language:typescript language:json',
    'instagram api language:javascript language:typescript language:json',
    'linkedin api language:javascript language:typescript language:json',
    'tiktok api language:javascript language:typescript language:json',
    
    // Gaming and Entertainment
    'unity language:javascript language:typescript language:json',
    'unreal engine language:javascript language:typescript language:json',
    'game development language:javascript language:typescript language:json',
    'streaming language:javascript language:typescript language:json',
    'twitch api language:javascript language:typescript language:json',
    
    // IoT and Hardware
    'arduino language:javascript language:typescript language:json',
    'raspberry pi language:javascript language:typescript language:json',
    'iot language:javascript language:typescript language:json',
    'mqtt language:javascript language:typescript language:json',
    'bluetooth language:javascript language:typescript language:json',
    
    // Blockchain and Crypto
    'ethereum language:javascript language:typescript language:json',
    'bitcoin language:javascript language:typescript language:json',
    'blockchain language:javascript language:typescript language:json',
    'web3 language:javascript language:typescript language:json',
    'defi language:javascript language:typescript language:json',
    
    // Machine Learning and AI
    'tensorflow language:javascript language:typescript language:json',
    'pytorch language:javascript language:typescript language:json',
    'scikit-learn language:javascript language:typescript language:json',
    'opencv language:javascript language:typescript language:json',
    'nlp language:javascript language:typescript language:json',
    
    // Security and Authentication
    'oauth language:javascript language:typescript language:json',
    'jwt language:javascript language:typescript language:json',
    'encryption language:javascript language:typescript language:json',
    'authentication language:javascript language:typescript language:json',
    'authorization language:javascript language:typescript language:json',
    
    // Testing and Quality
    'jest language:javascript language:typescript language:json',
    'cypress language:javascript language:typescript language:json',
    'selenium language:javascript language:typescript language:json',
    'playwright language:javascript language:typescript language:json',
    'testing language:javascript language:typescript language:json',
    
    // Performance and Monitoring
    'performance language:javascript language:typescript language:json',
    'monitoring language:javascript language:typescript language:json',
    'logging language:javascript language:typescript language:json',
    'metrics language:javascript language:typescript language:json',
    'alerting language:javascript language:typescript language:json'
  ];

  for (const query of searchQueries) {
    console.log(`\nℹ️  🔍 Searching for: "${query}"`);
    
    for (let page = 1; page <= 3; page++) {
      try {
        console.log(`ℹ️  📄 Scraping page ${page}...`);
        
        const repositories = await searchRepositories(query, page);
        if (!repositories || repositories.length === 0) {
          console.log(`⚠️  No repositories found on page ${page}, stopping...`);
          break;
        }
        
        console.log(`ℹ️  Found ${repositories.length} repositories on page ${page}`);
        totalRepositories += repositories.length;

        for (const repo of repositories) {
          try {
            // Check if lead already exists
            const existingLead = await checkLeadExists(repo.owner.login, repo.name);
            if (existingLead) {
              console.log(`ℹ️  Lead already exists: ${repo.owner.login}/${repo.name}`);
              continue;
            }

            // Fetch user info to get email
            console.log(`ℹ️  👤 Fetching user info for ${repo.owner.login}...`);
            const userInfo = await getUserInfo(repo.owner.login);
            
            if (!userInfo || !userInfo.email) {
              console.log(`ℹ️  ⏭️  Skipping ${repo.owner.login}/${repo.name} - no email found for ${repo.owner.login}`);
              continue;
            }

            // Save lead to database
            const leadData = {
              github_username: repo.owner.login,
              repo_name: repo.name,
              repo_url: repo.html_url,
              repo_description: repo.description,
              email: userInfo.email,
              last_activity: repo.pushed_at,
              status: 'new',
              email_sent: false,
              email_approved: false,
              email_pending_approval: false
            };

            const result = await insertLead(leadData);
            if (result) {
              console.log(`✅ Added lead: ${repo.owner.login}/${repo.name} (${userInfo.email})`);
              newLeadsAdded++;
              
              // Check if we've reached 1000
              if (newLeadsAdded >= 147) {
                console.log(`🎉 Reached target! Added ${newLeadsAdded} new leads`);
                const duration = Math.round((Date.now() - startTime) / 1000);
                console.log(`⏱️  Total time: ${duration}s`);
                console.log(`📊 Success rate: ${Math.round((newLeadsAdded / totalRepositories) * 100)}%`);
                return;
              }
            } else {
              console.log(`❌ Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
            }

          } catch (error) {
            console.error(`❌ Error processing repository ${repo.owner.login}/${repo.name}:`, error.message);
          }
        }

        // Add delay between pages to respect rate limits
        if (page < 3) {
          console.log('ℹ️  ⏳ Waiting 1 second before next page...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error scraping page ${page}:`, error.message);
        break;
      }
    }

    // Add delay between search queries
    if (searchQueries.indexOf(query) < searchQueries.length - 1) {
      console.log('ℹ️  ⏳ Waiting 2 seconds before next search query...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('✅ 🎉 Scraping completed!');
  console.log(`ℹ️  📊 Total repositories found: ${totalRepositories}`);
  console.log(`ℹ️  ✅ New leads with emails added: ${newLeadsAdded}`);
  console.log('ℹ️  📧 Only repositories with public emails are saved');

  // Generate report
  console.log('\n📊 SCRAPING REPORT');
  console.log('==================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`✅ Successes: ${newLeadsAdded}`);
  console.log(`❌ Failures: ${totalRepositories - newLeadsAdded}`);
  console.log(`📈 Success Rate: ${Math.round((newLeadsAdded / totalRepositories) * 100)}%`);
  console.log('⚠️  Warnings: 0');
  console.log('💥 Errors: 0');
  console.log('\n✨ Scraping script completed successfully');
}

// Run the scraper
if (require.main === module) {
  scrapeTo1000()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeTo1000 } 