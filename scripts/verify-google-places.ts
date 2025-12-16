#!/usr/bin/env tsx

/**
 * Verification script for Google Places API credentials
 * Checks if the API key is configured and working
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function verifyApiKey(): Promise<void> {
  console.log('🔍 Verifying Google Places API credentials...\n');

  // Check if API key is set
  if (!API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set in apps/api/.env');
    console.log('\n💡 Add the following to apps/api/.env:');
    console.log('   GOOGLE_PLACES_API_KEY=your_api_key_here\n');
    console.log('📖 See docs/GOOGLE-PLACES-SETUP.md for setup instructions');
    process.exit(1);
  }

  if (API_KEY === 'your_api_key_here' || API_KEY.length < 20) {
    console.error('❌ GOOGLE_PLACES_API_KEY appears to be a placeholder or invalid');
    console.log('\n💡 Please set a valid API key in apps/api/.env');
    process.exit(1);
  }

  console.log('✅ API key found in environment');
  console.log(`   Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  // Test the API key with a simple request
  console.log('🧪 Testing API key with a sample request...\n');

  const testUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=47.0104,28.8638&radius=1000&type=restaurant&key=${API_KEY}`;

  try {
    const response = await fetch(testUrl);
    const data = await response.json();

    if (data.status === 'OK') {
      console.log('✅ API key is valid and working!');
      console.log(`   Found ${data.results?.length || 0} places in test query\n`);
      console.log('📊 Response status:', data.status);
      if (data.results && data.results.length > 0) {
        console.log('   Sample place:', data.results[0].name);
      }
      console.log('\n✨ You can now use the ingestion system to sync venues!');
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ API key was denied');
      console.error('   Error:', data.error_message || 'Unknown error');
      console.log('\n💡 Possible issues:');
      console.log('   1. Places API is not enabled for your project');
      console.log('   2. API key restrictions are too strict');
      console.log('   3. Billing is not enabled');
      console.log('\n📖 See docs/GOOGLE-PLACES-SETUP.md for troubleshooting');
      process.exit(1);
    } else if (data.status === 'INVALID_REQUEST') {
      console.error('❌ Invalid request');
      console.error('   Error:', data.error_message || 'Unknown error');
      process.exit(1);
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('❌ API quota exceeded');
      console.error('   Error:', data.error_message || 'Unknown error');
      console.log('\n💡 Check your billing and quota limits in Google Cloud Console');
      process.exit(1);
    } else {
      console.error('❌ Unexpected response:', data.status);
      console.error('   Error:', data.error_message || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to verify API key:', error);
    console.log('\n💡 Check your internet connection and try again');
    process.exit(1);
  }
}

verifyApiKey();
