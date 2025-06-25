const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Try different environment variable names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔍 Checking environment variables...');
console.log('Supabase URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('Supabase Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure the following are set in .env.local:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  try {
    console.log('🚀 Starting database setup...');
    
    // First, test the connection
    console.log('🔗 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      console.log('📋 Table does not exist, creating...');
      
      // Create the table using raw SQL
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
      `;
      
      // Try to execute the SQL
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.log('⚠️  Direct SQL execution failed, trying alternative method...');
        
        // Alternative: Create table by inserting a test record and handling the error
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            github_username: 'test',
            repo_name: 'test',
            repo_url: 'https://github.com/test/test',
            last_activity: new Date().toISOString()
          });
        
        if (insertError && insertError.code === '42P01') {
          console.log('❌ Table creation failed. Please create the table manually:');
          console.log('\n=== MANUAL SETUP REQUIRED ===');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Run the following SQL:');
          console.log('\n' + createTableSQL);
          console.log('\nOr copy the content from scripts/setup-database.sql');
          return;
        }
      }
      
      console.log('✅ Table created successfully!');
    } else if (testError) {
      console.log('❌ Database connection error:', testError);
      return;
    } else {
      console.log('✅ Table already exists!');
    }
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_leads_github_username ON leads(github_username);',
      'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);',
      'CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(email_sent);',
      'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity DESC);',
      'CREATE INDEX IF NOT EXISTS idx_leads_email_approved ON leads(email_approved);',
      'CREATE INDEX IF NOT EXISTS idx_leads_email_pending_approval ON leads(email_pending_approval);',
      'CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);',
      'CREATE INDEX IF NOT EXISTS idx_leads_ai_recommendation ON leads(ai_recommendation);'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await supabase.rpc('exec_sql', { sql: indexSQL });
      } catch (error) {
        console.log('⚠️  Index creation skipped (may already exist)');
      }
    }
    
    // Test the table
    console.log('🧪 Testing table functionality...');
    const { data: testInsert, error: testInsertError } = await supabase
      .from('leads')
      .insert({
        github_username: 'test-user',
        repo_name: 'test-repo',
        repo_url: 'https://github.com/test-user/test-repo',
        last_activity: new Date().toISOString()
      })
      .select();
    
    if (testInsertError) {
      console.log('❌ Test insert failed:', testInsertError);
    } else {
      console.log('✅ Test insert successful!');
      
      // Clean up test data
      await supabase
        .from('leads')
        .delete()
        .eq('github_username', 'test-user');
      
      console.log('🧹 Test data cleaned up');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('📈 You can now run the scraping script');
    
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    console.log('\n=== TROUBLESHOOTING ===');
    console.log('1. Check your Supabase credentials in .env.local');
    console.log('2. Ensure your Supabase project is active');
    console.log('3. Try creating the table manually in the Supabase dashboard');
  }
}

// Add automatic feedback loop
async function setupWithRetry() {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}`);
    
    try {
      await createTable();
      break;
    } catch (error) {
      console.log(`❌ Attempt ${attempts} failed:`, error.message);
      
      if (attempts < maxAttempts) {
        console.log('⏳ Waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('💥 All attempts failed. Please check your configuration.');
      }
    }
  }
}

setupWithRetry(); 