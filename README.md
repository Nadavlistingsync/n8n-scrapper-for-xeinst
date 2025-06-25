# N8N Scraper for Xeinst

A Next.js 14 application that automatically discovers n8n workflow creators on GitHub and manages outreach campaigns for the Xeinst platform.

## Features

- 🔍 **GitHub Repository Scraping**: Automatically finds repositories with n8n topics
- 👤 **Lead Discovery**: Extracts GitHub profiles and emails (when public)
- 📧 **Email Outreach**: Automated email campaigns via Resend
- 💬 **DM Script Generation**: Creates personalized DM scripts for leads without emails
- 📊 **Lead Management**: Dashboard to view and manage all leads
- 🗄️ **Database Storage**: Stores leads in Supabase with full CRUD operations
- ⚡ **Background Scripts**: Automated scraping and email campaigns
- 🎯 **Smart Filtering**: Avoids duplicates and inactive accounts

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **GitHub API**: Octokit
- **Icons**: Lucide React

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd n8n-scraper-xeinst
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your API keys:

```bash
cp env.example .env.local
```

Edit `.env.local` with your actual API keys:

```env
# GitHub API
GITHUB_TOKEN=your_github_token_here

# Resend Email API
RESEND_API_KEY=your_resend_api_key_here

# Supabase Database
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database setup script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of scripts/setup-database.sql
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## API Keys Setup

### GitHub Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with `public_repo` and `read:user` scopes
3. Add to your `.env.local`

### Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Create an API key in your dashboard
3. Add to your `.env.local`

### Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Add to your `.env.local`

## Usage

### Web Interface

1. **Homepage** (`/`): Overview and quick actions
2. **Leads Dashboard** (`/leads`): View and manage all scraped leads
3. **API Endpoints**:
   - `GET /api/scrape`: Start scraping n8n repositories
   - `GET /api/leads`: Fetch all leads
   - `PATCH /api/leads/[id]`: Update lead status
   - `POST /api/email`: Send email campaigns

### Command Line Scripts

#### Scrape Repositories
```bash
npm run scrape
```

#### Send Email Campaign
```bash
npm run email
```

### Manual Scraping

Visit `/api/scrape` in your browser or use curl:

```bash
curl "http://localhost:3000/api/scrape?page=1&maxPages=3"
```

### Email Campaigns

Send emails to selected leads via the dashboard or API:

```bash
curl -X POST http://localhost:3000/api/email \
  -H "Content-Type: application/json" \
  -d '{"leadIds": ["lead-id-1", "lead-id-2"], "dryRun": false}'
```

## Lead Management

### Status Types
- **New**: Freshly scraped leads
- **Contacted**: Email sent or DM script generated
- **Responded**: Lead responded to outreach
- **Converted**: Lead joined Xeinst platform

### Filtering
- Filter by status in the dashboard
- View leads with/without emails
- Sort by creation date or last activity

### Email Features
- **Dry Run**: Test email campaigns without sending
- **Bulk Selection**: Select multiple leads for campaigns
- **DM Scripts**: Generated for leads without emails
- **Rate Limiting**: Built-in delays to respect API limits

## Database Schema

```sql
leads (
  id UUID PRIMARY KEY,
  github_username TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_description TEXT,
  email TEXT,
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  status TEXT DEFAULT 'new'
)
```

## Automation

### Cron Jobs (Optional)

Set up automated scraping and email campaigns:

```bash
# Daily scraping at 9 AM
0 9 * * * cd /path/to/app && npm run scrape

# Weekly email campaign on Mondays at 10 AM
0 10 * * 1 cd /path/to/app && npm run email
```

### Monitoring

The application includes built-in logging and error handling:
- Console logs for all operations
- Error tracking and reporting
- Success rate calculations
- Performance metrics

## Customization

### Email Templates
Edit `lib/email.ts` to customize email content and DM scripts.

### Scraping Criteria
Modify `lib/github.ts` to adjust:
- Repository search queries
- Activity thresholds
- Filtering logic

### UI Styling
Update `app/globals.css` and Tailwind classes for custom styling.

## Troubleshooting

### Common Issues

1. **GitHub API Rate Limits**
   - The app includes built-in rate limiting
   - Consider using a GitHub token with higher limits

2. **Email Delivery Issues**
   - Verify your Resend API key
   - Check your domain verification in Resend
   - Review email content for spam triggers

3. **Database Connection**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure database table exists

### Debug Mode

Enable detailed logging by setting:

```env
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Open an issue on GitHub

---

Built with ❤️ for the Xeinst platform 