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
    // Add search_strategy column if it doesn't exist
    const addColumnSQL = `
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS search_strategy TEXT;
    `
    
    await supabase.rpc('exec_sql', { sql: addColumnSQL })
    console.log('✅ search_strategy column added successfully')
    
    // Test the column
    const { data, error } = await supabase
      .from('leads')
      .select('search_strategy')
      .limit(1)
    
    if (error) {
      console.error('❌ Error testing column:', error)
    } else {
      console.log('✅ Column test successful')
    }
    
  } catch (error) {
    console.error('❌ Error adding column:', error)
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