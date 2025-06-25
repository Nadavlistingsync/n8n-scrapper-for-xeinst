# n8n Scraper Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - [Sign up here](https://supabase.com)
3. **GitHub Personal Access Token** - [Create here](https://github.com/settings/tokens)
4. **Resend API Key** (for email functionality) - [Sign up here](https://resend.com)
5. **OpenAI API Key** (for AI analysis) - [Get here](https://platform.openai.com)

## Step 1: Environment Setup

1. Copy the environment template:
```bash
cp env.example .env.local
```

2. Fill in your environment variables in `.env.local`:
```env
# GitHub API
GITHUB_TOKEN=your_github_token_here

# Resend Email API
RESEND_API_KEY=your_resend_api_key_here

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com

# OpenAI API (for AI agent functionality)
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 2: Database Setup

### Option A: Automatic Setup (Recommended)
Run the database setup script:
```bash
node scripts/create-table-simple.js
```

### Option B: Manual Setup
If automatic setup fails, follow these steps:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Run the following SQL:

```sql
-- Create the leads table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_github_username ON leads(github_username);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(email_sent);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_approved ON leads(email_approved);
CREATE INDEX IF NOT EXISTS idx_leads_email_pending_approval ON leads(email_pending_approval);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ai_recommendation ON leads(ai_recommendation);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Test Database Connection

```bash
node scripts/test-db.js
```

This will verify that your database is properly configured and the table exists.

## Step 5: Run the Scraper

### Option A: Command Line
```bash
node scripts/scrape.js
```

### Option B: Web Interface
```bash
npm run dev
```

Then visit `http://localhost:3000` and click "Start Scraping".

## Step 6: Monitor and Manage Leads

1. Visit the web interface at `http://localhost:3000/leads`
2. View all scraped leads
3. Approve/reject emails
4. Monitor AI analysis results

## Troubleshooting

### Database Connection Issues
- Verify your Supabase credentials in `.env.local`
- Ensure the `leads` table exists in your Supabase project
- Check that Row Level Security policies are configured

### GitHub API Issues
- Verify your GitHub token has the necessary permissions
- Check GitHub API rate limits
- Ensure the token is valid and not expired

### Email Issues
- Verify your Resend API key
- Check that your `FROM_EMAIL` domain is verified in Resend
- Ensure you have sufficient email credits

### AI Analysis Issues
- Verify your OpenAI API key
- Check that you have sufficient OpenAI credits
- Ensure the API key has the necessary permissions

## Features

### Automatic Feedback Loop
The scraper includes an automatic feedback loop that:
- Monitors success/failure rates
- Provides detailed error analysis
- Automatically retries failed operations
- Generates comprehensive reports

### AI-Powered Analysis
- Automatically analyzes leads for relevance
- Provides recommendations (approve/reject/review)
- Scores leads based on multiple factors
- Integrates with OpenAI for intelligent filtering

### Email Management
- Automatic email generation
- Approval workflow
- Email tracking and analytics
- Integration with Resend for reliable delivery

### Real-time Monitoring
- Live scraping progress
- Success rate tracking
- Error reporting and analysis
- Performance metrics

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console output for error messages
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed

For additional help, check the project documentation or create an issue in the repository. 