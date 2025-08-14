#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkAndUpdateTableStructure() {
  console.log('🔍 Checking leads table structure...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Check current table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'leads')
      .eq('table_schema', 'public')
    
    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError)
      return
    }
    
    console.log('📋 Current table columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    
    // Check if search_strategy column exists
    const hasSearchStrategy = columns.some(col => col.column_name === 'search_strategy')
    
    if (!hasSearchStrategy) {
      console.log('🔧 Adding search_strategy column...')
      
      const addColumnSQL = `
        ALTER TABLE leads 
        ADD COLUMN search_strategy TEXT;
      `
      
      await supabase.rpc('exec_sql', { sql: addColumnSQL })
      console.log('✅ search_strategy column added successfully')
      
      // Wait a moment for the change to propagate
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Verify the column was added
      const { data: newColumns, error: newColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'leads')
        .eq('table_schema', 'public')
      
      if (newColumnsError) {
        console.error('❌ Error verifying column addition:', newColumnsError)
      } else {
        const hasNewColumn = newColumns.some(col => col.column_name === 'search_strategy')
        if (hasNewColumn) {
          console.log('✅ search_strategy column verified successfully')
        } else {
          console.log('❌ search_strategy column not found after addition')
        }
      }
    } else {
      console.log('✅ search_strategy column already exists')
    }
    
  } catch (error) {
    console.error('❌ Error updating table structure:', error)
  }
}

if (require.main === module) {
  checkAndUpdateTableStructure()
    .then(() => {
      console.log('✨ Table structure check completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Table structure check failed:', error)
      process.exit(1)
    })
}

module.exports = { checkAndUpdateTableStructure } 