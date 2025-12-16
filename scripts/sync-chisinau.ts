#!/usr/bin/env tsx

/**
 * Helper script to sync venues from Chisinau
 * - Ensures Chisinau city exists in database
 * - Finds the city ID
 * - Triggers the sync via API
 * - Shows progress and results
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = process.env.API_PREFIX || 'api';
const API_VERSION = process.env.API_VERSION || 'v1';
const BASE_URL = `${API_URL}/${API_PREFIX}/${API_VERSION}`;

interface City {
  id: string;
  name: string;
  countryCode: string;
  isActive: boolean;
}

interface SyncResponse {
  data: {
    success: boolean;
    metrics: {
      cityId: string;
      cityName: string;
      startTime: string;
      endTime?: string;
      durationMs?: number;
      placesFetched: number;
      venuesCreated: number;
      venuesUpdated: number;
      duplicatesFound: number;
      errors: number;
      errorDetails: string[];
    };
  };
}

function makeRequest(url: string, method: string = 'GET', body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function checkApiHealth(): Promise<boolean> {
  try {
    await makeRequest(`${API_URL}/docs-json`);
    return true;
  } catch (error) {
    return false;
  }
}

async function findChisinauCity(): Promise<City | null> {
  try {
    console.log('🔍 Looking for Chisinau city in database...\n');
    const response = await makeRequest(`${BASE_URL}/cities`);

    if (response.data && Array.isArray(response.data)) {
      // Try different spellings
      const chisinau = response.data.find(
        (city: City) =>
          city.name.toLowerCase().includes('chisinau') ||
          city.name.toLowerCase().includes('chișinău') ||
          city.name.toLowerCase().includes('kishinev') ||
          (city.countryCode === 'MD' && city.name.toLowerCase().includes('chi')),
      );

      return chisinau || null;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to fetch cities:', error);
    return null;
  }
}

async function seedCities(): Promise<void> {
  console.log('📦 Seeding cities...\n');
  try {
    const { execSync } = await import('child_process');
    execSync('npx ts-node apps/api/src/scripts/seed-cities.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('\n✅ Cities seeded successfully\n');
  } catch (error) {
    console.error('❌ Failed to seed cities:', error);
    throw error;
  }
}

async function syncCity(cityId: string): Promise<SyncResponse> {
  console.log(`🚀 Starting sync for city ID: ${cityId}\n`);
  console.log('⏳ This may take several minutes...\n');

  try {
    const response = await makeRequest(`${BASE_URL}/ingestion/sync/${cityId}`, 'POST');
    return response as SyncResponse;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

function displayResults(response: SyncResponse): void {
  const { metrics } = response.data;

  console.log('\n' + '='.repeat(60));
  console.log('✨ SYNC COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60) + '\n');

  console.log('📊 Metrics:');
  console.log(`   City: ${metrics.cityName} (${metrics.cityId})`);
  console.log(`   Duration: ${formatDuration(metrics.durationMs)}`);
  console.log(`   Places fetched: ${metrics.placesFetched}`);
  console.log(`   Venues created: ${metrics.venuesCreated}`);
  console.log(`   Venues updated: ${metrics.venuesUpdated}`);
  console.log(`   Duplicates found: ${metrics.duplicatesFound}`);
  console.log(`   Errors: ${metrics.errors}`);

  if (metrics.errors > 0 && metrics.errorDetails.length > 0) {
    console.log('\n⚠️  Error details:');
    metrics.errorDetails.slice(0, 5).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    if (metrics.errorDetails.length > 5) {
      console.log(`   ... and ${metrics.errorDetails.length - 5} more errors`);
    }
  }

  const successRate =
    metrics.placesFetched > 0
      ? (((metrics.venuesCreated + metrics.venuesUpdated) / metrics.placesFetched) * 100).toFixed(1)
      : '0';

  console.log(`\n📈 Success rate: ${successRate}%`);
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🏙️  Chisinau Venue Sync Helper\n');
  console.log('='.repeat(60) + '\n');

  // Check if API is running
  console.log('🔌 Checking API connection...');
  const apiRunning = await checkApiHealth();

  if (!apiRunning) {
    console.error('❌ API is not running or not accessible');
    console.log(`\n💡 Please start the API server first:`);
    console.log(`   npm run dev:api\n`);
    console.log(`   Then try again.\n`);
    process.exit(1);
  }

  console.log('✅ API is running\n');

  // Find or seed Chisinau
  let city = await findChisinauCity();

  if (!city) {
    console.log('📍 Chisinau city not found. Seeding cities...\n');
    await seedCities();

    // Try to find it again
    city = await findChisinauCity();

    if (!city) {
      console.error('❌ Failed to find Chisinau city after seeding');
      console.log('\n💡 Please check the seed script or add Chisinau manually\n');
      process.exit(1);
    }
  }

  console.log(`✅ Found city: ${city.name} (${city.id})\n`);

  if (!city.isActive) {
    console.warn(
      '⚠️  Warning: City is not active. Sync may still work, but venues may not be visible.\n',
    );
  }

  // Confirm before syncing
  console.log('⚠️  This will sync venues from Google Places API.');
  console.log('   This may take several minutes and use API quota.\n');
  console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Sync the city
  try {
    const response = await syncCity(city.id);
    displayResults(response);

    console.log('🎉 All done! You can now query venues using the API.\n');
    console.log('💡 Try: GET /api/v1/venues?cityId=' + city.id + '\n');
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
