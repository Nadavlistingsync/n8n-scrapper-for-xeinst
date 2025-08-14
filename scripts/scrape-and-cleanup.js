#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { deleteFirst15Leads } = require('./delete-first-15.js')
const { scrapeMoreRepositories } = require('./scrape-more-leads.js')

async function main() {
  console.log('🚀 Starting scrape and cleanup process...');
  
  // Step 1: Delete first 15 leads
  console.log('\n=== STEP 1: DELETING FIRST 15 LEADS ===');
  const deletionSuccess = await deleteFirst15Leads();
  
  if (!deletionSuccess) {
    console.error('❌ Deletion failed, stopping process');
    return;
  }
  
  // Step 2: Scrape more leads
  console.log('\n=== STEP 2: SCRAPING MORE LEADS ===');
  await scrapeMoreRepositories();
  
  console.log('\n✨ Scrape and cleanup process completed successfully');
}

// Run the combined script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✨ Combined script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Combined script failed:', error)
      process.exit(1)
    })
}

module.exports = { main } 