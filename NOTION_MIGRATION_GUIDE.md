# Notion to Google Sheets Migration Guide

This guide will help you migrate all your data from Notion to Google Sheets, providing a complete replacement for your Notion database.

## 🚀 Quick Start

### Prerequisites

1. **Notion API Key** - Required to access your Notion database
2. **Google Cloud Project** - For Google Sheets API access
3. **Service Account** - For automated Google Sheets access

### Step 1: Get Your Notion API Key

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the details:
   - **Name**: `XEINST Migration`
   - **Description**: `Migration tool for moving data to Google Sheets`
4. Click "Submit"
5. Copy the **Internal Integration Token**

### Step 2: Set Up Google Cloud (if not already done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name: `notion-migration`
   - Download the JSON credentials file
5. Save the JSON file as `google-credentials.json` in your project root

### Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Notion Configuration
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# Google Sheets (if not already set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 4: Run the Migration

```bash
# Run the migration script
node scripts/migrate-notion-to-google-sheets.js
```

## 📊 What Gets Migrated

The migration creates a comprehensive Google Spreadsheet with four sheets:

### 1. **Notion Data** 📊
- Complete data from your Notion database
- All properties and metadata
- Formatted with headers and styling
- Includes Notion IDs for reference

### 2. **Email Campaign** 📧
- Ready-to-use email campaign data
- Personalized email templates
- Demo and unsubscribe links
- Campaign status tracking

### 3. **Analytics** 📈
- Key metrics and insights
- Email domain analysis
- Status breakdown
- Migration statistics

### 4. **Migration Log** 📝
- Complete migration details
- Data quality checks
- Next steps and recommendations
- Migration timeline

## 🔧 Advanced Configuration

### Custom Database ID

If you want to migrate a different Notion database:

```bash
# Set the database ID in your .env.local
NOTION_DATABASE_ID=your_custom_database_id
```

### Batch Processing

For large databases, the script automatically:
- Processes data in batches of 100 records
- Respects Notion API rate limits
- Provides progress updates
- Handles pagination automatically

### Data Validation

The migration includes:
- Data integrity checks
- Missing field detection
- Email validation
- Status verification

## 🛠️ Troubleshooting

### Common Issues

#### "NOTION_API_KEY not set"
```bash
# Add to .env.local
NOTION_API_KEY=your_integration_token
```

#### "Database not found"
- Verify your database ID is correct
- Ensure your integration has access to the database
- Check that the database is shared with your integration

#### "Permission denied"
- Verify your Google credentials file is correct
- Check that the service account has proper permissions
- Ensure Google Sheets API is enabled

#### "Rate limit exceeded"
- The script automatically handles rate limits
- For very large databases, consider running during off-peak hours
- Monitor Notion API usage in your integration settings

### Debug Mode

Run with verbose logging:

```bash
DEBUG=* node scripts/migrate-notion-to-google-sheets.js
```

## 📈 Migration Process

### Phase 1: Data Extraction
1. Connect to Notion API
2. Fetch all database records
3. Parse Notion properties
4. Validate data integrity

### Phase 2: Google Sheets Setup
1. Create new spreadsheet
2. Set up multiple sheets
3. Configure formatting
4. Prepare data structure

### Phase 3: Data Migration
1. Export raw Notion data
2. Generate email campaign data
3. Create analytics dashboard
4. Build migration log

### Phase 4: Verification
1. Data quality checks
2. Record count verification
3. Email validation
4. Link verification

## 🔄 Post-Migration Steps

### 1. Data Review
- Verify all records were migrated
- Check data formatting
- Validate email addresses
- Review analytics

### 2. Team Setup
- Share the Google Sheets with your team
- Set up appropriate permissions
- Create team workflows
- Establish data entry processes

### 3. Workflow Migration
- Update your email campaigns to use Google Sheets
- Modify your scraping scripts to export to Google Sheets
- Set up automated exports
- Configure notifications

### 4. Notion Cleanup
- Archive the old Notion database
- Update team documentation
- Remove Notion integrations
- Clean up environment variables

## 📋 Migration Checklist

### Before Migration
- [ ] Notion API key obtained
- [ ] Google credentials configured
- [ ] Environment variables set
- [ ] Database access verified
- [ ] Team notified of migration

### During Migration
- [ ] Migration script running
- [ ] Progress monitoring
- [ ] Error handling
- [ ] Data validation
- [ ] Backup verification

### After Migration
- [ ] Data review completed
- [ ] Team access configured
- [ ] Workflows updated
- [ ] Notion archived
- [ ] Documentation updated

## 🎯 Use Cases

### Sales Team
- Use Email Campaign sheet for outreach
- Track responses and follow-ups
- Monitor conversion rates
- Manage lead status

### Marketing Team
- Analyze lead sources and quality
- Track campaign performance
- Generate reports for stakeholders
- Monitor email engagement

### Development Team
- Monitor scraping success rates
- Track data quality metrics
- Debug scraping issues
- Maintain data integrity

## 🔒 Security Considerations

### Data Protection
- Notion API keys are stored securely
- Google credentials are protected
- Migration logs are created
- Data integrity is verified

### Access Control
- Limit Google Sheets permissions
- Use service accounts for automation
- Monitor API usage
- Regular credential rotation

### Compliance
- Data retention policies
- GDPR considerations
- Audit trail maintenance
- Privacy protection

## 📞 Support

### Getting Help

1. **Check the logs** - Review migration logs for errors
2. **Verify credentials** - Ensure API keys are correct
3. **Test connectivity** - Verify API access
4. **Review documentation** - Check this guide and setup docs

### Common Solutions

#### Migration Fails
- Check environment variables
- Verify API permissions
- Review error logs
- Test with smaller dataset

#### Data Missing
- Verify database access
- Check property mappings
- Review data filters
- Validate Notion structure

#### Performance Issues
- Run during off-peak hours
- Monitor API rate limits
- Use batch processing
- Optimize data queries

## 🔄 Automation

### Scheduled Migrations

Set up automated migrations:

```bash
# Daily migration at 9 AM
0 9 * * * cd /path/to/project && node scripts/migrate-notion-to-google-sheets.js
```

### GitHub Actions

Add to your workflow:

```yaml
- name: Migrate Notion to Google Sheets
  run: |
    echo "${{ secrets.GOOGLE_CREDENTIALS }}" > google-credentials.json
    node scripts/migrate-notion-to-google-sheets.js
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
    NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
```

### Notifications

Set up notifications for successful migrations:

```bash
# Add to migration script
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Migration completed successfully!"}' \
  https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## 📚 Additional Resources

### Documentation
- [Notion API Documentation](https://developers.notion.com/)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Project Setup Guide](SETUP.md)
- [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md)

### Tools
- [Notion API Explorer](https://developers.notion.com/docs/create-a-notion-integration)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets](https://sheets.google.com/)

### Support
- [Notion Community](https://www.notion.so/community)
- [Google Cloud Support](https://cloud.google.com/support)
- [Project Issues](https://github.com/your-repo/issues)

---

**Need help?** Check the troubleshooting section or create an issue in the repository. 