# Instantly API Integration Setup

This guide will help you set up the Instantly API integration to send scraped Gmail leads directly to Instantly campaigns.

## Prerequisites

1. An active Instantly account
2. Your Instantly API key
3. Node.js and npm installed

## Setup Steps

### 1. Get Your Instantly API Key

1. Log in to your Instantly account at https://app.instantly.ai
2. Go to Settings → API
3. Copy your API key

### 2. Configure Environment Variables

Add your Instantly API key to your `.env.local` file:

```bash
# Instantly API (for direct lead sending)
INSTANTLY_API_KEY=your_actual_api_key_here
INSTANTLY_CAMPAIGN_ID=your_campaign_id_here  # Optional - will be auto-created
```

### 3. Run the Setup Script

```bash
node scripts/setup-instantly.js
```

This script will:
- Test your API connection
- Show existing campaigns
- Create a new campaign for n8n leads
- Update your `.env.local` file with the campaign ID

### 4. Start Scraping to Instantly

```bash
node scripts/scrape-to-instantly.js
```

This will:
- Scrape n8n repositories for Gmail leads
- Filter for Gmail addresses only
- Send leads directly to your Instantly campaign
- Target 500 Gmail leads

## Features

### Automatic Gmail Filtering
- Only Gmail and Googlemail addresses are accepted
- Non-Gmail emails are automatically skipped

### Batch Processing
- Leads are sent in batches of 50 to respect API limits
- Automatic retry logic for failed batches

### Real-time Feedback
- Live progress tracking
- Detailed error reporting
- Success/failure statistics

### Campaign Management
- Automatic campaign creation
- Support for existing campaigns
- Campaign statistics tracking

## API Endpoints Used

- `GET /campaigns` - List campaigns
- `POST /campaign` - Create new campaign
- `POST /campaign/{id}/leads` - Add leads to campaign
- `GET /campaign/{id}/stats` - Get campaign statistics

## Lead Data Structure

Each lead sent to Instantly includes:

```json
{
  "email": "user@gmail.com",
  "first_name": "github_username",
  "last_name": "",
  "company": "",
  "website": "https://github.com/user/repo",
  "linkedin_url": "",
  "phone": "",
  "custom_fields": {
    "github_username": "user",
    "repo_name": "repo-name",
    "repo_description": "Repository description",
    "last_activity": "2025-01-01T00:00:00Z",
    "status": "new"
  }
}
```

## Troubleshooting

### API Connection Issues
- Verify your API key is correct
- Check your internet connection
- Ensure your Instantly account is active

### Rate Limiting
- The script includes automatic delays between requests
- Batch size is limited to 50 leads per request
- 1-second delay between batches

### Campaign Issues
- Verify the campaign ID in your `.env.local` file
- Check that the campaign exists in your Instantly dashboard
- Ensure you have permission to add leads to the campaign

## Monitoring

### Check Progress
```bash
node scripts/check-gmail-count.js
```

### View Campaign in Instantly
- Log in to https://app.instantly.ai
- Navigate to your campaign
- View leads and statistics

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your API key and campaign ID
3. Test the API connection with the setup script
4. Check your Instantly account status

## Next Steps

After setting up:

1. Run the scraping script to collect 500 Gmail leads
2. Configure your email sequences in Instantly
3. Set up automation workflows
4. Monitor campaign performance

---

**Note**: This integration replaces the Google Sheets workflow for direct lead sending to Instantly campaigns.
