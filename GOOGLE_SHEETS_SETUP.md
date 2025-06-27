# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration to export all your lead data automatically.

## 🚀 Quick Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 2: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the details:
   - **Name**: `xeinst-leads-export`
   - **Description**: `Service account for exporting leads to Google Sheets`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

### Step 3: Generate JSON Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create"
6. The JSON file will download automatically

### Step 4: Set Up Credentials

1. Rename the downloaded JSON file to `google-credentials.json`
2. Move it to your project root directory (same level as `package.json`)
3. **Important**: Add `google-credentials.json` to your `.gitignore` file to keep it secure

### Step 5: Share Google Sheets

1. Create a new Google Sheet or use an existing one
2. Click "Share" in the top right
3. Add your service account email (found in the JSON file under `client_email`)
4. Give it "Editor" permissions
5. Click "Send"

## 📊 Running the Export

### One-time Export

```bash
node scripts/export-to-google-sheets.js
```

### What Gets Exported

The script creates a new Google Spreadsheet with three sheets:

#### 1. **Leads Data** 📊
- Complete lead information
- All fields from your database
- Formatted with headers and styling

#### 2. **Email Campaign** 📧
- Ready-to-use email campaign data
- Personalized email templates
- Demo and unsubscribe links
- Campaign status tracking

#### 3. **Analytics** 📈
- Key metrics and insights
- Success rates
- Email domain analysis
- Campaign status breakdown

## 🔧 Configuration

### Environment Variables

Make sure these are set in your `.env.local`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### File Structure

```
your-project/
├── google-credentials.json    # Google service account credentials
├── google-sheets-config.json  # Auto-generated config (after first export)
├── scripts/
│   └── export-to-google-sheets.js
└── .gitignore                 # Should include google-credentials.json
```

## 📋 Output Files

After running the export, you'll get:

1. **Google Spreadsheet**: Complete data in organized sheets
2. **google-sheets-config.json**: Configuration with spreadsheet URL and stats

## 🔄 Automated Exports

### Option 1: GitHub Actions (Recommended)

Add this to your GitHub Actions workflow:

```yaml
- name: Export to Google Sheets
  run: |
    echo "${{ secrets.GOOGLE_CREDENTIALS }}" > google-credentials.json
    node scripts/export-to-google-sheets.js
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Option 2: Cron Job

Set up a cron job to run exports automatically:

```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/your/project && node scripts/export-to-google-sheets.js
```

### Option 3: Manual with Notifications

Create a script that sends notifications:

```bash
#!/bin/bash
cd /path/to/your/project
node scripts/export-to-google-sheets.js
# Add notification logic here (email, Slack, etc.)
```

## 🔒 Security Best Practices

1. **Never commit credentials**: Keep `google-credentials.json` in `.gitignore`
2. **Use environment variables**: Store sensitive data in environment variables
3. **Limit permissions**: Only give the service account necessary permissions
4. **Regular rotation**: Rotate service account keys periodically
5. **Monitor usage**: Check Google Cloud Console for API usage

## 🛠️ Troubleshooting

### Common Issues

#### "Google credentials file not found"
- Make sure `google-credentials.json` is in the project root
- Check file permissions

#### "Permission denied"
- Verify the service account has access to the spreadsheet
- Check that the Google Sheets API is enabled

#### "Rate limit exceeded"
- Google Sheets API has quotas
- Implement delays between requests if needed
- Consider batching large exports

#### "Invalid credentials"
- Check that the JSON file is valid
- Verify the service account is active
- Ensure the project has billing enabled

### Debug Mode

Run with verbose logging:

```bash
DEBUG=* node scripts/export-to-google-sheets.js
```

## 📈 Advanced Features

### Custom Spreadsheet Templates

You can modify the script to use existing spreadsheets:

```javascript
// In export-to-google-sheets.js
const EXISTING_SPREADSHEET_ID = 'your-spreadsheet-id'
```

### Data Filtering

Filter leads before export:

```javascript
// Export only leads with emails
const { data: leads, error } = await supabase
  .from('leads')
  .select('*')
  .not('email', 'is', null)
  .order('created_at', { ascending: false })
```

### Custom Formatting

Add custom formatting to sheets:

```javascript
// Add conditional formatting
await sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  resource: {
    requests: [
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId: 0, startRowIndex: 1 }],
            booleanRule: {
              condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=$C2=""' }] },
              format: { backgroundColor: { red: 1, green: 0.8, blue: 0.8 } }
            }
          }
        }
      }
    ]
  }
})
```

## 🎯 Use Cases

### Sales Team
- Use Email Campaign sheet for outreach
- Track responses and follow-ups
- Monitor conversion rates

### Marketing Team
- Analyze lead sources and quality
- Track campaign performance
- Generate reports for stakeholders

### Development Team
- Monitor scraping success rates
- Track data quality metrics
- Debug scraping issues

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Google Cloud Console logs
3. Verify all environment variables are set
4. Test with a small dataset first

## 🔄 Next Steps

After setting up Google Sheets integration:

1. **Test the export** with a small dataset
2. **Set up automated exports** via GitHub Actions or cron
3. **Configure notifications** for successful exports
4. **Share the spreadsheet** with your team
5. **Set up data validation** in Google Sheets
6. **Create dashboards** for key metrics

---

**Need help?** Check the troubleshooting section or create an issue in the repository. 