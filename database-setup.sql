-- =====================================================
-- n8n Lead Generation System - Database Setup
-- =====================================================
-- Copy and paste this entire file into your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MAIN LEADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- GitHub Information
  github_username TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_description TEXT,
  
  -- Contact Information
  email TEXT,
  
  -- Activity Tracking
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Email Campaign Status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'converted')),
  
  -- Approval Workflow
  email_approved BOOLEAN DEFAULT FALSE,
  email_pending_approval BOOLEAN DEFAULT FALSE,
  
  -- AI Analysis Results
  ai_score DECIMAL(3,2),
  ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
  ai_analysis TEXT,
  
  -- Constraints
  UNIQUE(github_username, repo_name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- GitHub username index for quick lookups
CREATE INDEX IF NOT EXISTS idx_leads_github_username ON leads(github_username);

-- Status index for filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Email sent index for campaign tracking
CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(email_sent);

-- Created at index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Last activity index for recent activity sorting
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity DESC);

-- Email approval status indexes
CREATE INDEX IF NOT EXISTS idx_leads_email_approved ON leads(email_approved);
CREATE INDEX IF NOT EXISTS idx_leads_email_pending_approval ON leads(email_pending_approval);

-- AI analysis indexes
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ai_recommendation ON leads(ai_recommendation);

-- Email index for contact lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all operations for authenticated users" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access for anon users (for public data)
CREATE POLICY "Allow read access for anon users" ON leads
  FOR SELECT USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get lead statistics
CREATE OR REPLACE FUNCTION get_lead_stats()
RETURNS TABLE (
  total_leads BIGINT,
  leads_with_emails BIGINT,
  leads_without_emails BIGINT,
  approved_leads BIGINT,
  pending_leads BIGINT,
  contacted_leads BIGINT,
  converted_leads BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE email IS NOT NULL) as leads_with_emails,
    COUNT(*) FILTER (WHERE email IS NULL) as leads_without_emails,
    COUNT(*) FILTER (WHERE email_approved = true) as approved_leads,
    COUNT(*) FILTER (WHERE email_pending_approval = true) as pending_leads,
    COUNT(*) FILTER (WHERE email_sent = true) as contacted_leads,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_leads
  FROM leads;
END;
$$ LANGUAGE plpgsql;

-- Function to get leads by AI recommendation
CREATE OR REPLACE FUNCTION get_leads_by_ai_recommendation(recommendation_param TEXT)
RETURNS TABLE (
  id UUID,
  github_username TEXT,
  repo_name TEXT,
  email TEXT,
  ai_score DECIMAL(3,2),
  ai_recommendation TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.github_username,
    l.repo_name,
    l.email,
    l.ai_score,
    l.ai_recommendation,
    l.status
  FROM leads l
  WHERE l.ai_recommendation = recommendation_param
  ORDER BY l.ai_score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get leads for AI analysis (no AI score yet)
CREATE OR REPLACE FUNCTION get_leads_for_ai_analysis()
RETURNS TABLE (
  id UUID,
  github_username TEXT,
  repo_name TEXT,
  repo_description TEXT,
  email TEXT,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.github_username,
    l.repo_name,
    l.repo_description,
    l.email,
    l.last_activity
  FROM leads l
  WHERE l.ai_score IS NULL
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Uncomment the following lines if you want to insert sample data for testing

/*
INSERT INTO leads (
  github_username, 
  repo_name, 
  repo_url, 
  repo_description, 
  email, 
  last_activity,
  status,
  ai_score,
  ai_recommendation
) VALUES 
(
  'sample-user-1',
  'n8n-automation-demo',
  'https://github.com/sample-user-1/n8n-automation-demo',
  'Automated workflow for customer onboarding using n8n',
  'sample1@example.com',
  NOW() - INTERVAL '2 days',
  'new',
  0.85,
  'approve'
),
(
  'sample-user-2',
  'n8n-integration-setup',
  'https://github.com/sample-user-2/n8n-integration-setup',
  'Integration setup for e-commerce automation',
  'sample2@example.com',
  NOW() - INTERVAL '5 days',
  'new',
  0.72,
  'review'
),
(
  'sample-user-3',
  'n8n-workflow-templates',
  'https://github.com/sample-user-3/n8n-workflow-templates',
  'Collection of reusable n8n workflow templates',
  'sample3@example.com',
  NOW() - INTERVAL '1 day',
  'new',
  0.95,
  'approve'
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if table was created successfully
SELECT 
  'Table created successfully' as status,
  COUNT(*) as total_rows
FROM leads;

-- Check indexes
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'leads';

-- Check functions
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN ('get_lead_stats', 'get_leads_by_ai_recommendation', 'get_leads_for_ai_analysis');

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Get lead statistics
-- SELECT * FROM get_lead_stats();

-- Get leads approved by AI
-- SELECT * FROM get_leads_by_ai_recommendation('approve');

-- Get leads pending AI analysis
-- SELECT * FROM get_leads_for_ai_analysis();

-- Get recent leads
-- SELECT github_username, repo_name, email, created_at 
-- FROM leads 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- After running this SQL, your database will be ready for the n8n lead generation system.
-- You can now run the Node.js scripts to start scraping and managing leads. 