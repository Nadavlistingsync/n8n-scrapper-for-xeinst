#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })

console.log('🚀 Setting up Cloud Deployment for Lead Scraper')
console.log('===============================================\n')

// Check if we're in a git repository
const { execSync } = require('child_process')

try {
  execSync('git status', { stdio: 'ignore' })
  console.log('✅ Git repository detected')
} catch (error) {
  console.log('❌ Not in a git repository. Please run:')
  console.log('   git init')
  console.log('   git add .')
  console.log('   git commit -m "Initial commit"')
  process.exit(1)
}

// Check for remote repository
try {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
  console.log(`✅ Remote repository: ${remoteUrl}`)
} catch (error) {
  console.log('❌ No remote repository configured.')
  console.log('Please create a GitHub repository and run:')
  console.log('   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git')
  console.log('   git push -u origin main')
  process.exit(1)
}

// Check environment variables
console.log('\n📋 Environment Variables Check:')
console.log('===============================')

const requiredVars = [
  'GITHUB_TOKEN',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
]

let missingVars = []

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`)
  } else {
    console.log(`❌ ${varName}: Missing`)
    missingVars.push(varName)
  }
})

if (missingVars.length > 0) {
  console.log('\n⚠️  Missing environment variables:')
  console.log('==================================')
  console.log('You need to add these as GitHub Secrets:')
  console.log('')
  console.log('1. Go to your GitHub repository')
  console.log('2. Click Settings > Secrets and variables > Actions')
  console.log('3. Click "New repository secret" for each missing variable:')
  console.log('')
  
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`)
  })
  
  console.log('\n📝 How to get these values:')
  console.log('===========================')
  
  if (missingVars.includes('GITHUB_TOKEN')) {
    console.log('\n🔑 GITHUB_TOKEN:')
    console.log('1. Go to GitHub.com > Settings > Developer settings > Personal access tokens')
    console.log('2. Generate new token (classic)')
    console.log('3. Select scopes: repo, workflow')
    console.log('4. Copy the token')
  }
  
  if (missingVars.includes('SUPABASE_URL') || missingVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('\n🗄️  Supabase credentials:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Settings > API')
    console.log('3. Copy Project URL and service_role key')
  }
  
  if (missingVars.includes('OPENAI_API_KEY')) {
    console.log('\n🤖 OpenAI API Key:')
    console.log('1. Go to https://platform.openai.com/api-keys')
    console.log('2. Create new secret key')
    console.log('3. Copy the key')
  }
  
  console.log('\n💡 After adding secrets, the workflow will run automatically!')
  console.log('   - Every 6 hours automatically')
  console.log('   - On every push to main branch')
  console.log('   - Manually via GitHub Actions tab')
  
} else {
  console.log('\n🎉 All environment variables are set!')
  console.log('=====================================')
  console.log('Your cloud deployment is ready!')
  console.log('')
  console.log('📅 The scraper will run:')
  console.log('   - Every 6 hours automatically')
  console.log('   - When you push changes to main')
  console.log('   - Manually via GitHub Actions')
  console.log('')
  console.log('📊 You can monitor progress at:')
  console.log('   https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions')
  console.log('')
  console.log('🔔 You\'ll get notifications for:')
  console.log('   - Successful runs with new leads')
  console.log('   - Issues when 50+ leads are found')
  console.log('   - Error reports if something fails')
}

console.log('\n📚 Next Steps:')
console.log('==============')
console.log('1. Push your code to GitHub:')
console.log('   git add .')
console.log('   git commit -m "feat: add cloud deployment workflows"')
console.log('   git push')
console.log('')
console.log('2. Check the Actions tab to see your first run')
console.log('')
console.log('3. Your scraper will now run in the cloud! 🎉') 