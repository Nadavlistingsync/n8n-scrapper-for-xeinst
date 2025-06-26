# 🚀 Cloud Deployment Guide

This guide will help you set up your lead scraper to run automatically in the cloud using GitHub Actions.

## ✨ Benefits of Cloud Deployment

- **No computer needed**: Runs automatically in the cloud
- **24/7 operation**: Scrapes leads even when you're sleeping
- **Free**: GitHub Actions provides 2000 minutes/month free
- **Reliable**: Automatic retries and error handling
- **Notifications**: Get alerts for successful runs and new leads

## 🛠️ Setup Instructions

### 1. Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and create a new repository
2. Name it something like `n8n-lead-scraper`
3. Make it public or private (your choice)

### 2. Push Your Code

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push your code
git add .
git commit -m "feat: add cloud deployment workflows"
git push -u origin main
```

### 3. Set Up GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each of these:

#### Required Secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Supabase Dashboard > Settings > API |
| `OPENAI_API_KEY` | Your OpenAI API key | [OpenAI Platform](https://platform.openai.com/api-keys) |

### 4. Run Setup Script

```bash
node scripts/setup-cloud-deployment.js
```

This script will check if everything is configured correctly.

## 📅 Automation Schedule

The scraper will run automatically:

- **Every 6 hours** (2 AM, 8 AM, 2 PM, 8 PM UTC)
- **On every push** to the main branch
- **Manually** via GitHub Actions tab

## 📊 Monitoring

### View Results

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Click on any workflow run to see detailed logs

### Notifications

- **Successful runs**: Commits with new leads are automatically pushed
- **Great results**: Issues are created when 50+ new leads are found
- **Error reports**: Failed runs are logged with details

### Artifacts

Each run creates downloadable artifacts:
- Scraping reports
- Lead count summaries
- Error logs (if any)

## 🔧 Customization

### Change Schedule

Edit `.github/workflows/scraper-advanced.yml`:

```yaml
schedule:
  # Run every day at 2 AM UTC
  - cron: '0 2 * * *'
  
  # Run every 12 hours
  - cron: '0 */12 * * *'
  
  # Run every Monday at 9 AM UTC
  - cron: '0 9 * * 1'
```

### Add More Scrapers

Add new steps to the workflow:

```yaml
- name: Run custom scraper
  run: node scripts/my-custom-scraper.js
  continue-on-error: true
```

### Email Notifications

Add email notifications by including your email in the workflow:

```yaml
- name: Send email notification
  if: steps.new-leads.outputs.count > 0
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "New leads found: ${{ steps.new-leads.outputs.count }}"
    to: your-email@example.com
    from: Lead Scraper
    body: |
      New leads were found in the latest scraping run!
      
      Total new leads: ${{ steps.new-leads.outputs.count }}
      View details: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Workflow not running**
   - Check if secrets are set correctly
   - Verify the cron schedule
   - Check GitHub Actions permissions

2. **Scraping fails**
   - Check GitHub token permissions
   - Verify Supabase credentials
   - Check rate limits

3. **No new leads**
   - GitHub search limits (1000 results max)
   - All leads already exist in database
   - Rate limiting from GitHub API

### Debug Mode

To run with more verbose logging, add this to your workflow:

```yaml
- name: Run scraper with debug
  run: DEBUG=* node scripts/scrape.js
  env:
    DEBUG: "*"
```

## 💰 Cost Analysis

### GitHub Actions (Free Tier)
- **2,000 minutes/month** included
- Each run takes ~10-15 minutes
- **~80-120 runs/month** possible
- **More than enough** for daily scraping

### Supabase (Free Tier)
- **50,000 reads/month** included
- **50,000 writes/month** included
- **500 MB database** included
- **Plenty** for lead storage

### OpenAI (Pay per use)
- Only used for AI analysis (optional)
- Very low cost for lead analysis
- Can be disabled if not needed

## 🎯 Best Practices

1. **Monitor regularly**: Check the Actions tab weekly
2. **Review leads**: Use the web interface to review new leads
3. **Update queries**: Add new search terms periodically
4. **Backup data**: Export leads regularly
5. **Rate limiting**: Respect GitHub API limits

## 📈 Scaling Up

If you need more capacity:

1. **More frequent runs**: Adjust cron schedule
2. **Parallel scraping**: Run multiple scrapers simultaneously
3. **Different timezones**: Use different GitHub accounts
4. **Paid services**: Upgrade to GitHub Pro for more minutes

## 🎉 Success!

Once set up, your scraper will:

- ✅ Run automatically every 6 hours
- ✅ Find new leads while you sleep
- ✅ Send notifications for great results
- ✅ Store everything in your Supabase database
- ✅ Cost nothing to operate

Your lead generation is now fully automated! 🚀 