const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLeadsTable() {
  try {
    console.log('🔧 Creating leads table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.leads (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        github_username TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        owner_name TEXT,
        owner_email TEXT,
        owner_bio TEXT,
        owner_location TEXT,
        owner_company TEXT,
        owner_blog TEXT,
        owner_twitter_username TEXT,
        repo_description TEXT,
        repo_stars INTEGER DEFAULT 0,
        repo_forks INTEGER DEFAULT 0,
        repo_language TEXT,
        repo_created_at TIMESTAMP WITH TIME ZONE,
        repo_updated_at TIMESTAMP WITH TIME ZONE,
        repo_last_commit_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'new',
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_at TIMESTAMP WITH TIME ZONE,
        email_pending_approval BOOLEAN DEFAULT FALSE,
        email_approved BOOLEAN DEFAULT FALSE,
        ai_score DECIMAL(3,2),
        ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
        ai_analysis TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const createIndexSQL = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_github_repo 
      ON public.leads(github_username, repo_name);
    `;

    // Execute the table creation
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (tableError) {
      console.log('⚠️  Table creation failed, trying alternative method...');
      
      // Try using the SQL editor approach
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
      console.log('\n' + createTableSQL + '\n' + createIndexSQL);
      console.log('\n🔗 Visit: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql');
      
      return false;
    }

    // Execute the index creation
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexSQL });
    
    if (indexError) {
      console.log('⚠️  Index creation failed, but table was created');
    }

    console.log('✅ Leads table created successfully!');
    
    // Verify the table exists
    const { data, error: verifyError } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
    
    if (verifyError) {
      console.log('⚠️  Table verification failed:', verifyError.message);
      return false;
    }
    
    console.log('✅ Table verification successful!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    return false;
  }
}

createLeadsTable().then((success) => {
  if (success) {
    console.log('\n🎉 Database setup complete! You can now run the scraper.');
  } else {
    console.log('\n❌ Database setup failed. Please check the instructions above.');
  }
  process.exit(success ? 0 : 1);
}); 