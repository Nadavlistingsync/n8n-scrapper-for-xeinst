const { insertLeadToNotion } = require('../lib/notion');

(async () => {
  const testLead = {
    github_username: 'octocat',
    repo_name: 'Hello-World',
    repo_url: 'https://github.com/octocat/Hello-World',
    repo_description: 'This is your first repo!',
    email: 'octocat@github.com',
    last_activity: '2024-06-27T12:00:00Z',
    status: 'new',
    email_sent: false,
    email_approved: false,
    email_pending_approval: true
  };
  const result = await insertLeadToNotion(testLead);
  if (result) {
    console.log('✅ Successfully inserted test lead to Notion!');
  } else {
    console.log('❌ Failed to insert test lead to Notion.');
  }
})(); 