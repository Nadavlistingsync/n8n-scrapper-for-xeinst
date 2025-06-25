require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

console.log('🔍 Testing database connection...')
console.log('URL:', supabaseUrl ? '✅ Found' : '❌ Missing')
console.log('Key:', supabaseKey ? '✅ Found' : '❌ Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  try {
    console.log('\n🔗 Testing connection...')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Connection error:', testError)
      
      if (testError.code === '42P01') {
        console.log('📋 Table does not exist')
        
        // Try to create the table
        console.log('🔨 Attempting to create table...')
        
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
          const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
          
          if (createError) {
            console.log('❌ Failed to create table via RPC:', createError)
            console.log('\n📝 Manual setup required:')
            console.log('1. Go to Supabase dashboard')
            console.log('2. Navigate to SQL Editor')
            console.log('3. Run this SQL:')
            console.log('\n' + createTableSQL)
            return
          }
          
          console.log('✅ Table created successfully!')
          
          // Test again
          await new Promise(resolve => setTimeout(resolve, 2000))
          const { data: retestData, error: retestError } = await supabase
            .from('leads')
            .select('count')
            .limit(1)
          
          if (retestError) {
            console.log('❌ Table still not accessible:', retestError)
          } else {
            console.log('✅ Table is now accessible!')
          }
          
        } catch (createError) {
          console.log('❌ Table creation failed:', createError)
        }
      }
    } else {
      console.log('✅ Connection successful!')
      console.log('📊 Table exists and is accessible')
    }
    
    // Test insert
    console.log('\n🧪 Testing insert...')
    const { data: insertData, error: insertError } = await supabase
      .from('leads')
      .insert({
        github_username: 'test-user',
        repo_name: 'test-repo',
        repo_url: 'https://github.com/test-user/test-repo',
        last_activity: new Date().toISOString()
      })
      .select()
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError)
    } else {
      console.log('✅ Insert successful!')
      console.log('📝 Inserted record:', insertData[0])
      
      // Clean up
      await supabase
        .from('leads')
        .delete()
        .eq('github_username', 'test-user')
      
      console.log('🧹 Test data cleaned up')
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

testDatabase(); 