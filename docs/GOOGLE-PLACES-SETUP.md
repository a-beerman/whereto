# Google Places API Setup Guide

This guide walks you through setting up Google Places API credentials for the WhereTo ingestion system.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step-by-Step Setup

### 1. Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"** (or select an existing project)
4. Enter project name: `whereto` (or your preferred name)
5. Click **"Create"**

### 2. Enable Places API

1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"Places API"**
3. Click on **"Places API"** (the one by Google)
4. Click **"Enable"**

**Note**: You may also want to enable:

- **Places API (New)** - The newer version (recommended for new projects)
- **Geocoding API** - If you need address geocoding
- **Maps JavaScript API** - If you plan to use maps in the frontend

### 3. Create Service Account

The PlacesClient library requires a service account (not an API key) for authentication.

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"Service account"**
4. Enter a service account name (e.g., `whereto-places-api`)
5. Click **"Create and Continue"**
6. Skip the optional steps (Grant access, Grant users access) and click **"Done"**

### 4. Create Service Account Key

1. Click on the service account you just created
2. Go to the **"Keys"** tab
3. Click **"Add Key" > "Create new key"**
4. Select **"JSON"** format
5. Click **"Create"** - this will download a JSON key file
6. **Important**: Save this file securely (e.g., `google-service-account-key.json`)
   - **DO NOT** commit this file to version control
   - Add it to `.gitignore`

### 5. Grant Service Account Permissions

1. Go to **"IAM & Admin" > "IAM"**
2. Find your service account in the list
3. Click the **"Edit"** (pencil) icon
4. Add the role: **"Places API User"** or **"Places API (New) User"**
5. Click **"Save"**

### 6. Add Service Account Key File to Environment

Add the path to your service account key file in your `apps/api/.env` file:

```bash
# Path to the service account JSON key file
# Can be absolute path or relative to project root
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-service-account-key.json
# Or use absolute path:
# GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/absolute/path/to/google-service-account-key.json
```

**Important**:

- Never commit the service account key file to version control!
- Add `*.json` (or the specific filename) to `.gitignore`
- Never commit the `.env` file to version control!

### 7. Verify Setup

Test that your service account works by running the sync:

```bash
npm run sync:chisinau
```

Or use the verification script (if updated for service accounts):

```bash
npm run verify:google-places
```

## Billing Setup

**Important**: Google Places API is a paid service (with free tier):

1. Go to **"Billing"** in Google Cloud Console
2. Link a billing account to your project
3. Review the [Places API pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

**Free Tier** (as of 2024):

- $200 free credit per month
- Places API: $17 per 1,000 requests (text search/details)
- This typically covers ~11,000 requests/month for free

## Cost Optimization Tips

1. **Use caching**: The ingestion system stores venues locally, so you only sync periodically
2. **Limit sync frequency**: Sync once per day instead of real-time
3. **Use pagination efficiently**: The sync job already implements pagination limits
4. **Monitor usage**: Set up billing alerts in Google Cloud Console

## Troubleshooting

### Error: "Could not load the default credentials"

- Verify the `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` path is correct in your `.env` file
- Check that the service account key file exists and is readable
- Ensure the path is absolute or relative to the project root

### Error: "This API project is not authorized to use this API"

- Go to APIs & Services > Library
- Search for "Places API" and ensure it's enabled
- Wait a few minutes after enabling (propagation delay)
- Verify the service account has the "Places API User" role in IAM

### Error: "PERMISSION_DENIED" or "REQUEST_DENIED"

- Check that the service account has proper IAM roles
- Verify billing is enabled for the project
- Check that Places API is enabled
- Ensure the service account key file is valid and not expired

### Rate Limiting

- The sync job includes rate limiting (2s between pages, 100ms between places)
- If you hit rate limits, increase delays in `sync-city.job.ts`

## Security Best Practices

1. **Never commit service account key files** to version control
2. **Use environment variables** for file paths (not the key content itself)
3. **Restrict service account permissions** to minimum required (Places API User only)
4. **Rotate service account keys regularly** (every 90 days recommended)
5. **Monitor usage** for unexpected spikes
6. **Use separate service accounts** for development and production
7. **Store key files securely** - use secrets management in production (e.g., Google Secret Manager)

## Next Steps

After setting up the service account:

1. Verify the service account works: `npm run sync:chisinau`
2. Seed cities: `npx tsx apps/api/src/scripts/seed-cities.ts`
3. Sync venues: Use the ingestion endpoint or Swagger UI

## References

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Places API Pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
