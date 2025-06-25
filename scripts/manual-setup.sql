-- Manual Database Setup for n8n Scraper
-- Run this SQL in your Supabase SQL Editor

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

-- Test insert to verify table works
INSERT INTO leads (github_username, repo_name, repo_url, last_activity)
VALUES ('test-user', 'test-repo', 'https://github.com/test-user/test-repo', NOW())
ON CONFLICT (github_username, repo_name) DO NOTHING;

-- Verify the insert worked
SELECT COUNT(*) as total_leads FROM leads;

-- Clean up test data
DELETE FROM leads WHERE github_username = 'test-user'; 