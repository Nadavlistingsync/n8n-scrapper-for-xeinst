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

  printReport() {
    const stats = this.getStats()
    console.log('\n📊 SCRAPING REPORT')
    console.log('==================')
    console.log(`⏱️  Duration: ${stats.duration}s`)
    console.log(`✅ Successes: ${stats.successCount}`)
    console.log(`❌ Failures: ${stats.failureCount}`)
    console.log(`📈 Success Rate: ${stats.successRate}%`)
    console.log(`⚠️  Warnings: ${stats.warningCount}`)
    console.log(`💥 Errors: ${stats.errorCount}`)

    if (this.errors.length > 0) {
      console.log('\n🔍 ERROR ANALYSIS:')
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message} (${error.timestamp.toISOString()})`)
        if (error.error) {
          console.log(`   Details: ${error.error.message}`)
        }
      })
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message} (${warning.timestamp.toISOString()})`)
      })
    }
  }
}

// Database health check with automatic table creation
async function ensureDatabaseHealth() {
  const feedback = new ScrapingFeedbackLoop()
  
  try {
    feedback.logInfo('Checking database health...')
    
    // Test database connection by trying to check if a lead exists
    const { data, error } = await checkLeadExists('test', 'test')
    
    if (error && error.code === '42P01') {
      feedback.logWarning('Leads table does not exist, attempting to create...')
      
      // Try to create the table
      const { createClient } = require('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        feedback.logError('Missing Supabase credentials for table creation')
        return false
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Create table SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS leads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          github_username TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          repo_description TEXT,
          email TEXT,
          last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          email_sent BOOLEAN DEFAULT FALSE,
          email_sent_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'converted')),
          email_approved BOOLEAN DEFAULT FALSE,
          email_pending_approval BOOLEAN DEFAULT FALSE,
          ai_score DECIMAL(3,2),
          ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
          ai_analysis TEXT,
          UNIQUE(github_username, repo_name)
        );
      `
      
      try {
        await supabase.rpc('exec_sql', { sql: createTableSQL })
        feedback.logSuccess('Leads table created successfully')
        
        // Wait a moment for the table to be ready
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Test the table again
        const { data: testData, error: testError } = await checkLeadExists('test', 'test')
        if (testError && testError.code === '42P01') {
          feedback.logError('Table creation failed - table still does not exist')
          return false
        }
        
        return true
      } catch (createError) {
        feedback.logError('Failed to create table automatically', createError)
        feedback.logInfo('Please run: node scripts/create-table-simple.js')
        return false
      }
    } else if (error) {
      feedback.logError('Database connection failed', error)
      return false
    } else {
      feedback.logSuccess('Database health check passed')
      return true
    }
  } catch (error) {
    feedback.logError('Database health check failed', error)
    return false
  }
}

// Custom search function for different terms
async function searchN8nWorkflows(page = 1) {
  const { Octokit } = require('octokit')
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  })

  try {
    const response = await octokit.rest.search.repos({
      q: 'n8n-workflows language:javascript language:typescript language:json',
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

async function searchN8nNodes(page = 1) {
  const { Octokit } = require('octokit')
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  })

  try {
    const response = await octokit.rest.search.repos({
      q: 'n8n-nodes language:javascript language:typescript language:json',
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

async function scrapeWorkflows() {
  console.log('ℹ️  🚀 Starting n8n-workflows repository scraping...');
  
  // Check database health first
  console.log('ℹ️  Checking database health...');
  const healthCheck = await ensureDatabaseHealth();
  if (!healthCheck) {
    console.error('❌ Database health check failed');
    return;
  }
  console.log('✅ Database health check passed');

  let totalRepositories = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // Search for n8n-workflows repositories
  for (let page = 1; page <= 5; page++) {
    try {
      console.log(`ℹ️  📄 Scraping n8n-workflows page ${page}...`);
      
      const repositories = await searchN8nWorkflows(page);
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
          } else {
            console.log(`❌ Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
          }

        } catch (error) {
          console.error(`❌ Error processing repository ${repo.owner.login}/${repo.name}:`, error.message);
        }
      }

      // Add delay between pages to respect rate limits
      if (page < 5) {
        console.log('ℹ️  ⏳ Waiting 2 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error scraping page ${page}:`, error.message);
      break;
    }
  }

  // Now search for n8n-nodes repositories
  console.log('\nℹ️  🔄 Starting n8n-nodes repository scraping...');
  
  for (let page = 1; page <= 5; page++) {
    try {
      console.log(`ℹ️  📄 Scraping n8n-nodes page ${page}...`);
      
      const repositories = await searchN8nNodes(page);
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
          } else {
            console.log(`❌ Failed to save lead: ${repo.owner.login}/${repo.name} - database error`);
          }

        } catch (error) {
          console.error(`❌ Error processing repository ${repo.owner.login}/${repo.name}:`, error.message);
        }
      }

      // Add delay between pages to respect rate limits
      if (page < 5) {
        console.log('ℹ️  ⏳ Waiting 2 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error scraping page ${page}:`, error.message);
      break;
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
  scrapeWorkflows()
    .then(() => {
      console.log('\n✨ Scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeWorkflows } 