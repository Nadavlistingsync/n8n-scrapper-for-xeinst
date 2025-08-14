
        const { insertLead, getAllLeads } = require('../lib/google-sheets-db')
        
        async function testScraping() {
          console.log('Testing scraping with new system...')
          
          const testLead = {
            github_username: 'migration-test-user',
            repo_name: 'migration-test-repo',
            repo_url: 'https://github.com/migration-test-user/migration-test-repo',
            repo_description: 'Test repository for migration verification',
            email: 'test@migration.com',
            last_activity: new Date().toISOString(),
            status: 'new',
            email_sent: false,
            email_approved: false,
            email_pending_approval: false
          }
          
          const inserted = await insertLead(testLead)
          if (inserted) {
            console.log('✅ Test lead inserted successfully')
            
            const allLeads = await getAllLeads()
            console.log(`✅ Total leads in system: ${allLeads.length}`)
            
            // Clean up test lead
            const { updateLead } = require('../lib/google-sheets-db')
            const nonTestLeads = allLeads.filter(lead => 
              !(lead.github_username === 'migration-test-user' && lead.repo_name === 'migration-test-repo')
            )
            
            // Re-save without test leads
            const { saveLeads } = require('../lib/google-sheets-db')
            await saveLeads(nonTestLeads)
            console.log('✅ Test lead cleaned up')
            
          } else {
            console.log('⚠️  Test lead not inserted (might be duplicate)')
          }
        }
        
        testScraping().catch(console.error)
      