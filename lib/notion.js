const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID || '21e2be81198f80ed8a84ffd120c04fab';

async function insertLeadToNotion(lead) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'github_username': { title: [{ text: { content: lead.github_username || '' } }] },
        'repo_name': { rich_text: [{ text: { content: lead.repo_name || '' } }] },
        'repo_url': { url: lead.repo_url || '' },
        'repo_description': { rich_text: [{ text: { content: lead.repo_description || '' } }] },
        'email': { email: lead.email || '' },
        'last_activity': lead.last_activity ? { date: { start: lead.last_activity } } : undefined,
        'status': { select: lead.status ? { name: lead.status } : undefined },
        'email_sent': { checkbox: !!lead.email_sent },
        'email_approved': { checkbox: !!lead.email_approved },
        'email_pending_approval': { checkbox: !!lead.email_pending_approval },
      }
    });
    return response;
  } catch (error) {
    console.error('Error inserting lead to Notion:', error.body || error);
    return null;
  }
}

module.exports = { insertLeadToNotion }; 