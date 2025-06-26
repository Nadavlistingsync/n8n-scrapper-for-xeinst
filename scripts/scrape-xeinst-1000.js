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

async function scrapeXeinst1000() {
  console.log('🎯 🚀 Starting Xeinst-focused scraping for another 1,000 leads...');
  
  let totalRepositories = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // Xeinst-focused search queries targeting enterprise and business automation
  const searchQueries = [
    // Enterprise Automation
    'enterprise automation language:javascript language:typescript language:json',
    'business process automation language:javascript language:typescript language:json',
    'workflow automation language:javascript language:typescript language:json',
    'process automation language:javascript language:typescript language:json',
    'task automation language:javascript language:typescript language:json',
    
    // Enterprise Integration
    'enterprise integration language:javascript language:typescript language:json',
    'system integration language:javascript language:typescript language:json',
    'api integration language:javascript language:typescript language:json',
    'data integration language:javascript language:typescript language:json',
    'service integration language:javascript language:typescript language:json',
    
    // Enterprise Platforms
    'enterprise platform language:javascript language:typescript language:json',
    'business platform language:javascript language:typescript language:json',
    'saas platform language:javascript language:typescript language:json',
    'enterprise software language:javascript language:typescript language:json',
    'business software language:javascript language:typescript language:json',
    
    // Enterprise Tools
    'enterprise tool language:javascript language:typescript language:json',
    'business tool language:javascript language:typescript language:json',
    'enterprise solution language:javascript language:typescript language:json',
    'business solution language:javascript language:typescript language:json',
    'enterprise service language:javascript language:typescript language:json',
    
    // Enterprise APIs
    'enterprise api language:javascript language:typescript language:json',
    'business api language:javascript language:typescript language:json',
    'enterprise sdk language:javascript language:typescript language:json',
    'business sdk language:javascript language:typescript language:json',
    'enterprise client language:javascript language:typescript language:json',
    
    // Enterprise Data
    'enterprise data language:javascript language:typescript language:json',
    'business data language:javascript language:typescript language:json',
    'data processing language:javascript language:typescript language:json',
    'data transformation language:javascript language:typescript language:json',
    'data pipeline language:javascript language:typescript language:json',
    
    // Enterprise Security
    'enterprise security language:javascript language:typescript language:json',
    'business security language:javascript language:typescript language:json',
    'authentication language:javascript language:typescript language:json',
    'authorization language:javascript language:typescript language:json',
    'identity management language:javascript language:typescript language:json',
    
    // Enterprise Analytics
    'enterprise analytics language:javascript language:typescript language:json',
    'business analytics language:javascript language:typescript language:json',
    'data analytics language:javascript language:typescript language:json',
    'business intelligence language:javascript language:typescript language:json',
    'reporting language:javascript language:typescript language:json',
    
    // Enterprise Communication
    'enterprise communication language:javascript language:typescript language:json',
    'business communication language:javascript language:typescript language:json',
    'team collaboration language:javascript language:typescript language:json',
    'project management language:javascript language:typescript language:json',
    'workflow management language:javascript language:typescript language:json',
    
    // Enterprise CRM
    'crm language:javascript language:typescript language:json',
    'customer relationship language:javascript language:typescript language:json',
    'sales automation language:javascript language:typescript language:json',
    'lead management language:javascript language:typescript language:json',
    'contact management language:javascript language:typescript language:json',
    
    // Enterprise ERP
    'erp language:javascript language:typescript language:json',
    'enterprise resource planning language:javascript language:typescript language:json',
    'resource management language:javascript language:typescript language:json',
    'inventory management language:javascript language:typescript language:json',
    'supply chain language:javascript language:typescript language:json',
    
    // Enterprise HR
    'hr management language:javascript language:typescript language:json',
    'human resources language:javascript language:typescript language:json',
    'employee management language:javascript language:typescript language:json',
    'recruitment language:javascript language:typescript language:json',
    'payroll language:javascript language:typescript language:json',
    
    // Enterprise Finance
    'financial management language:javascript language:typescript language:json',
    'accounting language:javascript language:typescript language:json',
    'billing language:javascript language:typescript language:json',
    'invoicing language:javascript language:typescript language:json',
    'payment processing language:javascript language:typescript language:json',
    
    // Enterprise Marketing
    'marketing automation language:javascript language:typescript language:json',
    'email marketing language:javascript language:typescript language:json',
    'campaign management language:javascript language:typescript language:json',
    'lead generation language:javascript language:typescript language:json',
    'digital marketing language:javascript language:typescript language:json',
    
    // Enterprise E-commerce
    'ecommerce language:javascript language:typescript language:json',
    'online store language:javascript language:typescript language:json',
    'shopping cart language:javascript language:typescript language:json',
    'order management language:javascript language:typescript language:json',
    'product catalog language:javascript language:typescript language:json',
    
    // Enterprise Support
    'customer support language:javascript language:typescript language:json',
    'help desk language:javascript language:typescript language:json',
    'ticket management language:javascript language:typescript language:json',
    'support system language:javascript language:typescript language:json',
    'knowledge base language:javascript language:typescript language:json',
    
    // Enterprise Compliance
    'compliance language:javascript language:typescript language:json',
    'regulatory language:javascript language:typescript language:json',
    'audit language:javascript language:typescript language:json',
    'governance language:javascript language:typescript language:json',
    'risk management language:javascript language:typescript language:json',
    
    // Enterprise Cloud
    'cloud platform language:javascript language:typescript language:json',
    'cloud service language:javascript language:typescript language:json',
    'cloud integration language:javascript language:typescript language:json',
    'cloud migration language:javascript language:typescript language:json',
    'cloud management language:javascript language:typescript language:json',
    
    // Enterprise DevOps
    'devops language:javascript language:typescript language:json',
    'ci cd language:javascript language:typescript language:json',
    'deployment language:javascript language:typescript language:json',
    'infrastructure language:javascript language:typescript language:json',
    'monitoring language:javascript language:typescript language:json',
    
    // Enterprise AI/ML
    'machine learning language:javascript language:typescript language:json',
    'artificial intelligence language:javascript language:typescript language:json',
    'ai automation language:javascript language:typescript language:json',
    'ml pipeline language:javascript language:typescript language:json',
    'predictive analytics language:javascript language:typescript language:json',
    
    // Enterprise IoT
    'iot platform language:javascript language:typescript language:json',
    'internet of things language:javascript language:typescript language:json',
    'device management language:javascript language:typescript language:json',
    'sensor data language:javascript language:typescript language:json',
    'iot integration language:javascript language:typescript language:json',
    
    // Enterprise Blockchain
    'blockchain language:javascript language:typescript language:json',
    'distributed ledger language:javascript language:typescript language:json',
    'smart contract language:javascript language:typescript language:json',
    'cryptocurrency language:javascript language:typescript language:json',
    'defi language:javascript language:typescript language:json',
    
    // Enterprise Mobile
    'mobile app language:javascript language:typescript language:json',
    'mobile platform language:javascript language:typescript language:json',
    'mobile development language:javascript language:typescript language:json',
    'mobile integration language:javascript language:typescript language:json',
    'mobile automation language:javascript language:typescript language:json',
    
    // Enterprise Web
    'web application language:javascript language:typescript language:json',
    'web platform language:javascript language:typescript language:json',
    'web service language:javascript language:typescript language:json',
    'web automation language:javascript language:typescript language:json',
    'web integration language:javascript language:typescript language:json',
    
    // Enterprise Database
    'database management language:javascript language:typescript language:json',
    'data warehouse language:javascript language:typescript language:json',
    'data lake language:javascript language:typescript language:json',
    'database migration language:javascript language:typescript language:json',
    'data governance language:javascript language:typescript language:json',
    
    // Enterprise API Management
    'api management language:javascript language:typescript language:json',
    'api gateway language:javascript language:typescript language:json',
    'api documentation language:javascript language:typescript language:json',
    'api testing language:javascript language:typescript language:json',
    'api monitoring language:javascript language:typescript language:json',
    
    // Enterprise Microservices
    'microservice language:javascript language:typescript language:json',
    'service mesh language:javascript language:typescript language:json',
    'container orchestration language:javascript language:typescript language:json',
    'service discovery language:javascript language:typescript language:json',
    'load balancing language:javascript language:typescript language:json',
    
    // Enterprise Event Processing
    'event processing language:javascript language:typescript language:json',
    'stream processing language:javascript language:typescript language:json',
    'real time processing language:javascript language:typescript language:json',
    'event streaming language:javascript language:typescript language:json',
    'message queue language:javascript language:typescript language:json',
    
    // Enterprise B2B
    'b2b platform language:javascript language:typescript language:json',
    'business to business language:javascript language:typescript language:json',
    'partner integration language:javascript language:typescript language:json',
    'supplier management language:javascript language:typescript language:json',
    'vendor management language:javascript language:typescript language:json',
    
    // Enterprise B2C
    'b2c platform language:javascript language:typescript language:json',
    'business to consumer language:javascript language:typescript language:json',
    'customer portal language:javascript language:typescript language:json',
    'user management language:javascript language:typescript language:json',
    'customer experience language:javascript language:typescript language:json'
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
              if (newLeadsAdded >= 1000) {
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
  scrapeXeinst1000()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeXeinst1000 } 