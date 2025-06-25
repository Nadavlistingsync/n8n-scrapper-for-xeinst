const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying direct SQL execution...');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.log(`Statement failed: ${statement.substring(0, 50)}...`);
            console.log('Error:', stmtError);
          }
        }
      }
    }
    
    // Alternative: Create table directly using Supabase client
    console.log('Creating leads table...');
    const { error: createError } = await supabase
      .from('leads')
      .select('*')
      .limit(1);
    
    if (createError && createError.code === '42P01') {
      // Table doesn't exist, create it
      console.log('Table does not exist, creating...');
      
      // We'll need to use the Supabase dashboard or SQL editor to create the table
      // For now, let's provide instructions
      console.log('\n=== DATABASE SETUP REQUIRED ===');
      console.log('Please run the following SQL in your Supabase SQL Editor:');
      console.log('\n' + sqlContent);
      console.log('\nOr visit: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql');
      console.log('And paste the SQL content from scripts/setup-database.sql');
    } else {
      console.log('✅ Database setup completed successfully!');
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase(); 