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
  
  -- Ensure unique combination of github_username and repo_name
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

-- Create a function to update the email_sent_at timestamp when email_sent is set to true
CREATE OR REPLACE FUNCTION update_email_sent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_sent = TRUE AND OLD.email_sent = FALSE THEN
    NEW.email_sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update email_sent_at
DROP TRIGGER IF EXISTS trigger_update_email_sent_at ON leads;
CREATE TRIGGER trigger_update_email_sent_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sent_at();

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this based on your needs)
CREATE POLICY "Allow all operations" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create a view for lead statistics
CREATE OR REPLACE VIEW lead_stats AS
SELECT 
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as leads_with_email,
  COUNT(*) FILTER (WHERE email_sent = TRUE) as emails_sent,
  COUNT(*) FILTER (WHERE status = 'new') as new_leads,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted_leads,
  COUNT(*) FILTER (WHERE status = 'responded') as responded_leads,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
  COUNT(*) FILTER (WHERE last_activity > NOW() - INTERVAL '90 days') as active_leads,
  COUNT(*) FILTER (WHERE email_approved = TRUE) as approved_emails,
  COUNT(*) FILTER (WHERE email_pending_approval = TRUE) as pending_approval,
  COUNT(*) FILTER (WHERE ai_score IS NOT NULL) as ai_analyzed,
  COUNT(*) FILTER (WHERE ai_recommendation = 'approve') as ai_recommended_approve,
  COUNT(*) FILTER (WHERE ai_recommendation = 'reject') as ai_recommended_reject,
  COUNT(*) FILTER (WHERE ai_recommendation = 'review') as ai_recommended_review,
  AVG(ai_score) FILTER (WHERE ai_score IS NOT NULL) as avg_ai_score
FROM leads;

-- Grant necessary permissions
GRANT ALL ON leads TO authenticated;
GRANT ALL ON lead_stats TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 