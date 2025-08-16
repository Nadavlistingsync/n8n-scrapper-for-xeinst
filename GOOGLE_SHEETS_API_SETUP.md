# 🔗 Google Sheets API Setup Guide

This guide will help you set up automated Google Sheets integration with your n8n scraper.

## 🎯 What We'll Achieve

- ✅ **Automated Sync**: Data automatically syncs to Google Sheets
- ✅ **Real-time Updates**: Changes appear instantly in Google Sheets
- ✅ **Multiple Sheets**: Separate sheets for leads, campaigns, analytics
- ✅ **No Manual Import/Export**: Fully automated workflow

## 📋 Prerequisites

1. **Google Account** - For Google Cloud Console access
2. **Google Cloud Project** - To enable APIs and create credentials
3. **Service Account** - For automated access to Google Sheets

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: `n8n-scraper-sheets`
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and press **"Enable"**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in the details:
   - **Name**: `n8n-sheets-service`
   - **Description**: `Service account for n8n scraper Google Sheets integration`
4. Click **"Create and Continue"**
5. Skip optional steps and click **"Done"**

### Step 4: Generate JSON Key

1. Click on your newly created service account
2. Go to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **"JSON"** format
5. Click **"Create"**
6. The JSON file will download automatically

### Step 5: Set Up Credentials

1. Rename the downloaded file to `google-credentials.json`
2. Move it to your project root (same level as `package.json`)
3. **Important**: Add to `.gitignore` to keep it secure

### Step 6: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: `N8N Scraper Data - [Your Name]`
4. Copy the spreadsheet ID from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### Step 7: Share with Service Account

1. In your Google Sheet, click **"Share"** (top right)
2. Add your service account email (found in the JSON file under `client_email`)
3. Give it **"Editor"** permissions
4. Click **"Send"**

### Step 8: Configure Environment Variables

Add these to your `.env.local`:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CREDENTIALS_PATH=google-credentials.json
```

Replace `your_spreadsheet_id_here` with the actual ID from Step 6.

## 🔧 Installation

Install the required packages:

```bash
npm install googleapis
```

## 🧪 Test the Setup

Run the test script to verify everything works:

```bash
node scripts/test-google-sheets-api.js
```

## 📊 Sheet Structure

The system will automatically create these sheets:

### 1. **Leads** 📊
- Complete lead information
- All fields from your database
- Real-time updates

### 2. **Email Campaigns** 📧
- Ready-to-use email campaign data
- Filtered leads for outreach
- Campaign status tracking

### 3. **Analytics** 📈
- Summary statistics
- Performance metrics
- Trend analysis

### 4. **Backups** 💾
- Historical data snapshots
- Data recovery points
- Archive management

## 🔄 Automated Workflow

Once set up, the system will:

1. **Scrape Leads** → Automatically save to Google Sheets
2. **Update Status** → Real-time sync to Google Sheets
3. **AI Analysis** → Results appear in Google Sheets
4. **Email Campaigns** → Campaign data in Google Sheets
5. **Analytics** → Automatic reporting in Google Sheets

## 🛠️ Available Scripts

### Setup Scripts
- `setup-google-sheets-api.js` - Automated setup
- `test-google-sheets-api.js` - Test connection
- `create-google-sheet.js` - Create new spreadsheet

### Sync Scripts
- `sync-to-google-sheets.js` - Manual sync
- `auto-sync.js` - Automated sync
- `backup-to-sheets.js` - Create backups

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check service account email is correct
   - Verify sheet is shared with service account
   - Ensure "Editor" permissions

2. **API Quota Exceeded**
   - Google Sheets API has rate limits
   - Wait a few minutes and try again
   - Consider upgrading Google Cloud plan

3. **Invalid Credentials**
   - Check JSON file path is correct
   - Verify JSON file is not corrupted
   - Ensure service account is active

### Debug Commands

```bash
# Test connection
node scripts/test-google-sheets-api.js

# Check credentials
node -e "console.log(require('./google-credentials.json').client_email)"

# Verify environment
node -e "console.log('Spreadsheet ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID)"
```

## 📈 Benefits

### ✅ Advantages
- **Real-time Sync**: Instant updates in Google Sheets
- **Automated**: No manual import/export needed
- **Reliable**: Google's infrastructure
- **Collaborative**: Multiple people can view/edit
- **Backup**: Google's built-in version history
- **Analytics**: Google Sheets built-in features

### ⚠️ Considerations
- **API Limits**: Google Sheets API has quotas
- **Setup Required**: Initial configuration needed
- **Cost**: May incur Google Cloud charges for high usage

## 🎯 Next Steps

After setup:

1. **Test the connection**: `node scripts/test-google-sheets-api.js`
2. **Sync existing data**: `node scripts/sync-to-google-sheets.js`
3. **Enable auto-sync**: Configure automatic updates
4. **Monitor usage**: Check API quotas and costs

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Test with the provided scripts
4. Check Google Cloud Console for API usage

---

**🎉 Once completed, your n8n scraper will have fully automated Google Sheets integration!**
