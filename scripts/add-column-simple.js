#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function addSearchStrategyColumn() {
  console.log('🔧 Adding search_strategy column to leads table...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Try to add the column
    const addColumnSQL = `
      ALTER TABLE leads 
      ADD COLUMN search_strategy TEXT;
    `
    
    await supabase.rpc('exec_sql', { sql: addColumnSQL })
    console.log('✅ search_strategy column added successfully')
    
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('✅ search_strategy column already exists')
    } else {
      console.error('❌ Error adding column:', error.message)
    }
  }
  
  // Test by trying to insert a record with the new column
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        github_username: 'test-user',
        repo_name: 'test-repo',
        repo_url: 'https://github.com/test-user/test-repo',
        email: 'test@example.com',
        last_activity: new Date().toISOString(),
        search_strategy: 'test-strategy'
      })
      .select()
    
    if (error) {
      console.error('❌ Error testing column:', error.message)
    } else {
      console.log('✅ Column test successful - inserted test record')
      
      // Clean up test record
      await supabase
        .from('leads')
        .delete()
        .eq('github_username', 'test-user')
        .eq('repo_name', 'test-repo')
      
      console.log('✅ Test record cleaned up')
    }
    
  } catch (error) {
    console.error('❌ Error testing column:', error.message)
  }
}

if (require.main === module) {
  addSearchStrategyColumn()
    .then(() => {
      console.log('✨ Column addition completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Column addition failed:', error)
      process.exit(1)
    })
}

module.exports = { addSearchStrategyColumn } 