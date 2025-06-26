#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { ReplitScraper } = require('../lib/replit.js')
const { insertLead, checkLeadExists } = require('../lib/supabase.js')

// Automatic feedback loop for debugging
class ReplitScrapingFeedbackLoop {
  constructor() {
    this.errors = []
    this.warnings = []
    this.successCount = 0
    this.failureCount = 0
    this.startTime = Date.now()
    this.emailSources = {
      profile: 0,
      bio: 0,
      project: 0,
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

async function scrapeReplit() {
  console.log('🎯 🚀 Starting Replit scraping for automation leads...');
  
  const feedback = new ReplitScrapingFeedbackLoop()
  const scraper = new ReplitScraper()
  
  let totalProjects = 0;
  let newLeadsAdded = 0;
  let startTime = Date.now();

  // Comprehensive automation-related search queries for Replit
  const searchQueries = [
    // Core automation platforms
    'n8n automation',
    'n8n workflow',
    'n8n integration',
    'zapier alternative',
    'make.com automation',
    'integromat automation',
    'automation.io',
    'workflow automation',
    'process automation',
    'task automation',
    
    // Business automation
    'business automation',
    'enterprise automation',
    'workflow management',
    'business process automation',
    'office automation',
    'productivity automation',
    'workflow tool',
    'automation platform',
    'integration platform',
    'no-code automation',
    
    // API and webhook automation
    'api automation',
    'webhook automation',
    'api integration',
    'webhook integration',
    'rest api automation',
    'api workflow',
    'webhook workflow',
    'api connector',
    'webhook connector',
    'api platform',
    
    // Data automation
    'data automation',
    'data integration',
    'data pipeline',
    'etl automation',
    'data workflow',
    'data processing automation',
    'database automation',
    'data sync automation',
    'data migration automation',
    'data transformation',
    
    // Marketing and sales automation
    'marketing automation',
    'sales automation',
    'email automation',
    'lead automation',
    'crm automation',
    'customer automation',
    'campaign automation',
    'social media automation',
    'advertising automation',
    'funnel automation',
    
    // Development automation
    'devops automation',
    'ci cd automation',
    'deployment automation',
    'testing automation',
    'code automation',
    'development workflow',
    'git automation',
    'build automation',
    'release automation',
    'code deployment',
    
    // Communication automation
    'communication automation',
    'messaging automation',
    'chat automation',
    'notification automation',
    'alert automation',
    'slack automation',
    'discord automation',
    'telegram automation',
    'whatsapp automation',
    'sms automation',
    
    // E-commerce automation
    'ecommerce automation',
    'shopify automation',
    'woocommerce automation',
    'payment automation',
    'order automation',
    'inventory automation',
    'shipping automation',
    'customer service automation',
    'support automation',
    'billing automation',
    
    // Social media automation
    'social media automation',
    'twitter automation',
    'linkedin automation',
    'facebook automation',
    'instagram automation',
    'youtube automation',
    'tiktok automation',
    'content automation',
    'posting automation',
    'engagement automation',
    
    // File and document automation
    'file automation',
    'document automation',
    'pdf automation',
    'excel automation',
    'google sheets automation',
    'document processing',
    'file processing',
    'document workflow',
    'file sync automation',
    'backup automation',
    
    // IoT and hardware automation
    'iot automation',
    'hardware automation',
    'sensor automation',
    'device automation',
    'smart home automation',
    'industrial automation',
    'manufacturing automation',
    'sensor data automation',
    'device integration',
    'iot platform',
    
    // AI and ML automation
    'ai automation',
    'machine learning automation',
    'nlp automation',
    'chatbot automation',
    'intelligent automation',
    'ai workflow',
    'ml pipeline',
    'ai integration',
    'automated ai',
    'ai platform',
    
    // Financial automation
    'financial automation',
    'accounting automation',
    'billing automation',
    'invoice automation',
    'payment processing',
    'expense automation',
    'budget automation',
    'financial workflow',
    'money automation',
    'finance automation',
    
    // HR and recruitment automation
    'hr automation',
    'recruitment automation',
    'hiring automation',
    'employee automation',
    'onboarding automation',
    'payroll automation',
    'attendance automation',
    'performance automation',
    'hr workflow',
    'talent automation',
    
    // Customer service automation
    'customer service automation',
    'support automation',
    'help desk automation',
    'ticket automation',
    'chatbot automation',
    'customer automation',
    'service automation',
    'support workflow',
    'customer care automation',
    'service desk automation',
    
    // Project management automation
    'project management automation',
    'task management automation',
    'project automation',
    'team automation',
    'collaboration automation',
    'project workflow',
    'team workflow',
    'collaboration workflow',
    'project tracking automation',
    'task tracking automation',
    
    // Analytics and reporting automation
    'analytics automation',
    'reporting automation',
    'dashboard automation',
    'metrics automation',
    'kpi automation',
    'data visualization automation',
    'report automation',
    'analytics workflow',
    'reporting workflow',
    'business intelligence automation',
    
    // Security and compliance automation
    'security automation',
    'compliance automation',
    'audit automation',
    'monitoring automation',
    'alert automation',
    'security workflow',
    'compliance workflow',
    'audit workflow',
    'security monitoring',
    'compliance monitoring',
    
    // Education and training automation
    'education automation',
    'training automation',
    'learning automation',
    'course automation',
    'educational automation',
    'training workflow',
    'learning workflow',
    'course workflow',
    'education platform',
    'training platform',
    
    // Healthcare automation
    'healthcare automation',
    'medical automation',
    'health automation',
    'patient automation',
    'medical workflow',
    'healthcare workflow',
    'patient workflow',
    'medical platform',
    'healthcare platform',
    'medical device automation',
    
    // Legal automation
    'legal automation',
    'law automation',
    'contract automation',
    'legal workflow',
    'law workflow',
    'contract workflow',
    'legal platform',
    'law platform',
    'legal tech automation',
    'contract management automation',
    
    // Real estate automation
    'real estate automation',
    'property automation',
    'housing automation',
    'rental automation',
    'property management automation',
    'real estate workflow',
    'property workflow',
    'housing workflow',
    'real estate platform',
    'property platform',
    
    // Transportation automation
    'transportation automation',
    'logistics automation',
    'shipping automation',
    'delivery automation',
    'fleet automation',
    'transportation workflow',
    'logistics workflow',
    'shipping workflow',
    'transportation platform',
    'logistics platform',
    
    // Manufacturing automation
    'manufacturing automation',
    'industrial automation',
    'factory automation',
    'production automation',
    'industrial iot automation',
    'manufacturing workflow',
    'industrial workflow',
    'factory workflow',
    'manufacturing platform',
    'industrial platform',
    
    // Energy automation
    'energy automation',
    'utility automation',
    'power automation',
    'solar automation',
    'renewable energy automation',
    'energy workflow',
    'utility workflow',
    'power workflow',
    'energy platform',
    'utility platform',
    
    // Agriculture automation
    'agriculture automation',
    'farming automation',
    'agricultural automation',
    'smart farming automation',
    'precision agriculture automation',
    'agriculture workflow',
    'farming workflow',
    'agricultural workflow',
    'agriculture platform',
    'farming platform',
    
    // Retail automation
    'retail automation',
    'commerce automation',
    'store automation',
    'inventory automation',
    'point of sale automation',
    'retail workflow',
    'commerce workflow',
    'store workflow',
    'retail platform',
    'commerce platform',
    
    // Hospitality automation
    'hospitality automation',
    'tourism automation',
    'hotel automation',
    'restaurant automation',
    'travel automation',
    'hospitality workflow',
    'tourism workflow',
    'hotel workflow',
    'hospitality platform',
    'tourism platform',
    
    // Entertainment automation
    'entertainment automation',
    'media automation',
    'streaming automation',
    'content creation automation',
    'video automation',
    'entertainment workflow',
    'media workflow',
    'streaming workflow',
    'entertainment platform',
    'media platform',
    
    // Gaming automation
    'gaming automation',
    'game automation',
    'esports automation',
    'game development automation',
    'gaming platform automation',
    'gaming workflow',
    'game workflow',
    'esports workflow',
    'gaming platform',
    'game platform',
    
    // Sports automation
    'sports automation',
    'fitness automation',
    'health tracking automation',
    'workout automation',
    'athletic automation',
    'sports workflow',
    'fitness workflow',
    'health workflow',
    'sports platform',
    'fitness platform',
    
    // Non-profit automation
    'nonprofit automation',
    'social impact automation',
    'charity automation',
    'volunteer automation',
    'social good automation',
    'nonprofit workflow',
    'social impact workflow',
    'charity workflow',
    'nonprofit platform',
    'social impact platform',
    
    // Government automation
    'government automation',
    'public sector automation',
    'civic automation',
    'public service automation',
    'government tech automation',
    'government workflow',
    'public sector workflow',
    'civic workflow',
    'government platform',
    'public sector platform'
  ];

  for (const query of searchQueries) {
    feedback.logInfo(`🔍 Searching Replit for: "${query}"`);
    
    for (let page = 1; page <= 2; page++) { // Limit pages to avoid rate limiting
      try {
        feedback.logInfo(`📄 Scraping page ${page}...`);
        
        const projects = await scraper.searchProjects(query, page);
        if (!projects || projects.length === 0) {
          feedback.logWarning(`No projects found on page ${page}, stopping...`);
          break;
        }
        
        feedback.logInfo(`Found ${projects.length} projects on page ${page}`);
        totalProjects += projects.length;

        for (const project of projects) {
          try {
            // Check if lead already exists
            const existingLead = await checkLeadExists(project.author, project.title);
            if (existingLead) {
              feedback.logInfo(`Lead already exists: ${project.author}/${project.title}`);
              continue;
            }

            // Get user profile to check if it's a high-value user
            feedback.logInfo(`👤 Fetching profile for ${project.author}...`);
            const profile = await scraper.getUserProfile(project.author);
            
            if (!scraper.isHighValueUser(profile)) {
              feedback.logInfo(`⏭️  Skipping low-value user: ${project.author}`);
              continue;
            }

            // Discover emails from multiple sources
            feedback.logInfo(`🔍 Discovering emails for ${project.author}...`);
            const emails = await scraper.discoverEmails(project.author);
            
            if (emails.length === 0) {
              feedback.logInfo(`⏭️  No emails found for ${project.author}/${project.title}`);
              feedback.failureCount++;
              continue;
            }

            // Use the first email found
            const emailResult = emails[0];

            // Save lead to database
            const leadData = {
              github_username: project.author,
              repo_name: project.title,
              repo_url: project.url || `https://replit.com/@${project.author}`,
              repo_description: project.description,
              email: emailResult.email,
              last_activity: new Date().toISOString(), // Replit doesn't provide this easily
              status: 'new',
              email_sent: false,
              email_approved: false,
              email_pending_approval: false
            };

            const result = await insertLead(leadData);
            if (result) {
              feedback.logSuccess(`Added Replit lead: ${project.author}/${project.title} (${emailResult.email}) - Source: ${emailResult.source}`);
              feedback.logEmailSource(emailResult.source);
              newLeadsAdded++;
              
              // Check if we've reached target
              if (newLeadsAdded >= 500) { // Target 500 Replit leads
                const stats = feedback.getStats();
                feedback.logInfo(`🎉 Reached target! Added ${newLeadsAdded} new Replit leads`);
                feedback.logInfo(`⏱️  Total time: ${stats.duration}s`);
                feedback.logInfo(`📊 Success rate: ${stats.successRate}%`);
                feedback.logInfo(`📧 Email sources:`, stats.emailSources);
                return;
              }
            } else {
              feedback.logError(`Failed to save lead: ${project.author}/${project.title} - database error`);
            }

          } catch (error) {
            feedback.logError(`Error processing project ${project.author}/${project.title}:`, error.message);
          }
        }

        // Add delay between pages to respect rate limits
        if (page < 2) {
          feedback.logInfo('⏳ Waiting 2 seconds before next page...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        feedback.logError(`Error scraping page ${page}:`, error.message);
        break;
      }
    }

    // Add delay between search queries
    if (searchQueries.indexOf(query) < searchQueries.length - 1) {
      feedback.logInfo('⏳ Waiting 3 seconds before next search query...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const stats = feedback.getStats();
  
  feedback.logInfo('✅ 🎉 Replit scraping completed!');
  feedback.logInfo(`📊 Total projects found: ${totalProjects}`);
  feedback.logInfo(`✅ New leads with emails added: ${newLeadsAdded}`);
  feedback.logInfo(`📧 Email sources:`, stats.emailSources);

  // Generate detailed report
  console.log('\n📊 DETAILED REPLIT SCRAPING REPORT');
  console.log('==================================');
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
  console.log('\n✨ Replit scraping completed successfully');
}

// Run the scraper
if (require.main === module) {
  scrapeReplit()
    .then(() => {
      console.log('\n✨ Replit scraping script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Replit scraping script failed:', error)
      process.exit(1)
    })
}

module.exports = { scrapeReplit } 