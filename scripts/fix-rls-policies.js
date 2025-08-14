const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies...')
  
  try {
    // Test insertion first to see if it works
    console.log('🧪 Testing insertion...')
    const testLead = {
      github_username: 'test-user',
      repo_name: 'test-repo',
      repo_url: 'https://github.com/test-user/test-repo',
      repo_description: 'Test repository',
      email: 'test@example.com',
      last_activity: new Date().toISOString(),
      status: 'new'
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([testLead])
      .select()

    if (error) {
      console.error('❌ Test insertion failed:', error)
      console.log('🔧 This suggests RLS policies need to be fixed manually')
      console.log('📝 Please run the following SQL in your Supabase SQL Editor:')
      console.log('')
      console.log('-- Drop existing policies')
      console.log('DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON leads;')
      console.log('DROP POLICY IF EXISTS "Allow read access for anon users" ON leads;')
      console.log('')
      console.log('-- Create new policies')
      console.log('CREATE POLICY "Enable all for service role" ON leads')
      console.log('FOR ALL USING (auth.role() = \'service_role\');')
      console.log('')
      console.log('CREATE POLICY "Enable all for authenticated users" ON leads')
      console.log('FOR ALL USING (auth.role() = \'authenticated\');')
      console.log('')
      console.log('CREATE POLICY "Enable read for anon users" ON leads')
      console.log('FOR SELECT USING (true);')
      return false
    }

    console.log('✅ Test insertion successful! RLS policies are working correctly.')
    
    // Clean up test data
    await supabase
      .from('leads')
      .delete()
      .eq('github_username', 'test-user')
      .eq('repo_name', 'test-repo')

    console.log('🧹 Test data cleaned up')
    return true

  } catch (error) {
    console.error('❌ Error testing RLS policies:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Testing RLS policies...')
  
  const success = await fixRLSPolicies()
  
  if (success) {
    console.log('🎉 RLS policies are working correctly!')
    console.log('✅ You can now run the scraping script')
  } else {
    console.log('❌ RLS policies need manual fixing')
    console.log('📝 Please run the SQL commands shown above in your Supabase SQL Editor')
  }
}

main() 