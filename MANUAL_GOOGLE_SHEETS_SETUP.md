# Manual Google Sheets Setup Guide

Since the automated Google Sheet creation is having permission issues, here's how to manually set up Google Sheets for your data export:

## Step 1: Create a Google Sheet Manually

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Name it something like "Xeinst Data Export - 2025-06-27"
4. Copy the spreadsheet ID from the URL:
   - The URL will look like: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - The ID is the long string between `/d/` and `/edit`: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 2: Share the Sheet with Your Service Account

1. In your Google Sheet, click the "Share" button (top right)
2. Add your service account email as an editor:
   - Email: `sheets-writer@xeinst.iam.gserviceaccount.com`
   - Role: Editor
   - Click "Send"

## Step 3: Add the Spreadsheet ID to Your Environment

Add this line to your `.env` file:
```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
```

Replace `your_spreadsheet_id_here` with the actual ID you copied in Step 1.

## Step 4: Run the Export Script

Now you can run the export script:
```bash
node scripts/export-to-existing-sheet.js
```

## Alternative: Use the Simple Export Script

If you prefer, you can also use the existing simple export script:
```bash
node scripts/simple-google-push.js
```

## Troubleshooting

### Permission Issues
- Make sure Google Sheets API is enabled in your Google Cloud Console
- Verify the service account email is correct
- Ensure the sheet is shared with the service account

### API Quotas
- Google Sheets API has rate limits
- If you hit limits, wait a few minutes and try again

### Data Format Issues
- The script will automatically create new sheets for each data file
- CSV files will be imported with headers
- JSON files will be formatted as key-value pairs
- Text files with emails will be imported as email lists

## Expected Output

After running the export, you should see:
- Multiple sheets in your Google Sheet (one for each data file)
- A summary of the export process
- The spreadsheet URL for easy access

## Files That Will Be Exported

The script will export these files from your `exports/` folder:
- `notion-migration-2025-06-27.csv` → NotionMigrationData sheet
- `email-campaign-2025-06-27.csv` → EmailCampaignData sheet
- `xeinst-campaign-2025-06-26.csv` → XeinstCampaignData sheet
- `emails-only-2025-06-26.txt` → EmailLists sheet
- `emails-with-names-2025-06-26.txt` → EmailListsWithNames sheet
- `notion-analytics-2025-06-27.json` → NotionAnalytics sheet

Each sheet will contain the data with proper headers and formatting. 