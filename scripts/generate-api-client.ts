#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as https from 'https';
import * as http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const OPENAPI_SPEC_URL = `${API_URL}/docs-json`;
const OPENAPI_SPEC_FILE = path.join(__dirname, '../openapi.json');

// Output directories
const AXIOS_CLIENT_DIR = path.join(__dirname, '../libs/shared/src/api-client-axios');
const ANGULAR_CLIENT_DIR = path.join(__dirname, '../libs/shared/src/api-client-angular');

interface GenerateClientOptions {
  generator: string;
  outputDir: string;
  additionalProperties?: string;
}

function fetchOpenAPISpec(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Failed to fetch OpenAPI spec: ${res.statusCode}`));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function loadOpenAPISpec(useLocal: boolean): Promise<string> {
  if (useLocal && fs.existsSync(OPENAPI_SPEC_FILE)) {
    console.log(`📄 Loading OpenAPI spec from local file: ${OPENAPI_SPEC_FILE}`);
    return fs.readFileSync(OPENAPI_SPEC_FILE, 'utf-8');
  }

  console.log(`🌐 Fetching OpenAPI spec from: ${OPENAPI_SPEC_URL}`);
  try {
    return await fetchOpenAPISpec(OPENAPI_SPEC_URL);
  } catch (error) {
    console.error('❌ Failed to fetch OpenAPI spec from API');
    console.error(
      '💡 Make sure the API is running, or use --local flag with a local openapi.json file',
    );
    throw error;
  }
}

function generateClient(options: GenerateClientOptions, specPath: string): void {
  const { generator, outputDir, additionalProperties = '' } = options;

  console.log(`\n🔧 Generating ${generator} client...`);
  console.log(`   Output: ${outputDir}`);

  // Ensure output directory exists
  if (fs.existsSync(outputDir)) {
    console.log(`   Cleaning existing directory...`);
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const command = `npx @openapitools/openapi-generator-cli generate -g ${generator} -i ${specPath} -o ${outputDir} --additional-properties="${additionalProperties}" --skip-validate-spec`;
    console.log(`   Running: ${command}`);

    const result = execSync(command, {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
    });

    if (result) {
      console.log(result);
    }
    console.log(`✅ Successfully generated ${generator} client`);
  } catch (error: any) {
    console.error(`❌ Failed to generate ${generator} client`);
    if (error.stdout) {
      console.error('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr);
    }
    if (error.message) {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useLocal = args.includes('--local');

  console.log('🚀 Starting API client generation...\n');

  try {
    // Load OpenAPI spec
    const specContent = await loadOpenAPISpec(useLocal);

    // Save spec to temporary file for openapi-generator
    const tempSpecPath = path.join(__dirname, '../openapi-temp.json');
    fs.writeFileSync(tempSpecPath, specContent, 'utf-8');
    console.log(`✅ OpenAPI spec loaded (${specContent.length} bytes)\n`);

    // Generate Axios client (for bot)
    generateClient(
      {
        generator: 'typescript-axios',
        outputDir: AXIOS_CLIENT_DIR,
        additionalProperties:
          'npmName=@whereto/api-client-axios,supportsES6=true,withSeparateModelsAndApi=true,modelPackage=models,apiPackage=api',
      },
      tempSpecPath,
    );

    // Generate Angular client (for miniapp)
    generateClient(
      {
        generator: 'typescript-angular',
        outputDir: ANGULAR_CLIENT_DIR,
        additionalProperties:
          'ngVersion=20.0.0,npmName=@whereto/api-client-angular,providedInRoot=true',
      },
      tempSpecPath,
    );

    // Clean up temporary spec file
    if (fs.existsSync(tempSpecPath)) {
      fs.unlinkSync(tempSpecPath);
    }

    console.log('\n✨ Client generation completed successfully!');
    console.log(`\n📦 Generated clients:`);
    console.log(`   - Axios client: ${AXIOS_CLIENT_DIR}`);
    console.log(`   - Angular client: ${ANGULAR_CLIENT_DIR}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the generated clients`);
    console.log(`   2. Import and use in your bot/miniapp applications`);
    console.log(`   3. Regenerate when API changes are made`);
  } catch (error) {
    console.error('\n❌ Client generation failed:', error);
    process.exit(1);
  }
}

main();
