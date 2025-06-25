# 🚀 Quick Setup - Get Your n8n Scraper Working in 2 Minutes

## The Problem
Your scraper is finding **500+ repositories** but saving **0 leads** because the database table doesn't exist.

## The Solution
Create the database table in Supabase:

### Step 1: Go to Supabase Dashboard
1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the SQL
Copy and paste this entire SQL into the editor:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_github_username ON leads(github_username);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(email_sent);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_approved ON leads(email_approved);
CREATE INDEX IF NOT EXISTS idx_leads_email_pending_approval ON leads(email_pending_approval);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ai_recommendation ON leads(ai_recommendation);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Step 3: Click "Run"
Click the **Run** button in the SQL editor.

### Step 4: Test the Scraper
```bash
node scripts/scrape.js
```

## Expected Results
- ✅ **500+ repositories found** (already working)
- ✅ **500+ leads saved** (will work after table creation)
- ✅ **Success rate: 100%** (instead of 0%)

## What You'll Get
After creating the table, your scraper will save:
- Repository details (name, description, URL)
- Owner information (username, email if public)
- Activity metrics (last commit, repository age)
- All n8n-related projects from GitHub

## Need Help?
If you still get errors after creating the table:
1. Run: `node scripts/test-db.js`
2. Check your `.env.local` file has correct Supabase credentials
3. Make sure your Supabase project is active

**The scraper is working perfectly - we just need the database table!** 🎯 