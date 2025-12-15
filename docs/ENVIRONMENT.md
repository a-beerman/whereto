# Environment Configuration Guide

This document describes environment variables, configuration files, and environment setup for all WhereTo services.

> **Reference**: Environment configuration supports implementation of [`docs/FINAL-SPEC.md`](FINAL-SPEC.md). For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Overview

Each service (API, Bot, Mini App) has its own environment configuration. Environment variables are loaded from `.env` files or system environment.

## Environment Files

### File Structure

```
whereto/
├── apps/
│   ├── api/
│   │   └── .env.example
│   ├── bot/
│   │   └── .env.example
│   └── miniapp/
│       └── .env.example
└── .env.example (root, if needed)
```

### Creating Environment Files

```bash
# Copy example files
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
cp apps/miniapp/.env.example apps/miniapp/.env
```

## API Environment Variables

### Database Configuration

```bash
# apps/api/.env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=whereto
DB_PASSWORD=whereto
DB_NAME=whereto_catalog
DB_SSL=false

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Application Configuration

```bash
# API
API_PORT=3000
API_PREFIX=api
API_VERSION=v1
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:4200

# Logging
LOG_LEVEL=debug
```

### External Services

```bash
# Google Places API (for ingestion only)
GOOGLE_PLACES_API_KEY=your_api_key_here

# Telegram (for bot communication)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_API_URL=https://api.telegram.org
```

### Authentication & Security

```bash
# JWT (if used)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Service Token (for bot-to-api communication)
SERVICE_TOKEN=your_service_token_here

# Telegram WebApp Verification
TELEGRAM_BOT_SECRET=your_bot_secret_here
```

### Redis (Optional, for caching)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Rate Limiting

```bash
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

## Bot Environment Variables

```bash
# apps/bot/.env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_API_URL=https://api.telegram.org

# API
API_BASE_URL=http://localhost:3000
API_SERVICE_TOKEN=your_service_token_here

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## Mini App Environment Variables

```bash
# apps/miniapp/.env
# API
API_BASE_URL=http://localhost:3000

# Telegram
TELEGRAM_BOT_NAME=whereto_bot

# Environment
NODE_ENV=development
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_SSL=false
CORS_ORIGIN=http://localhost:4200
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
DB_SSL=true
CORS_ORIGIN=https://staging.whereto.app
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
DB_SSL=true
CORS_ORIGIN=https://whereto.app
```

## Configuration Loading

### NestJS (API)

Use `@nestjs/config`:

```typescript
// apps/api/src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.API_PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
});
```

```typescript
// apps/api/src/app.module.ts
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
  ],
})
export class AppModule {}
```

### Angular (Mini App)

Use environment files:

```typescript
// apps/miniapp/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: process.env['API_BASE_URL'] || 'http://localhost:3000',
  telegramBotName: process.env['TELEGRAM_BOT_NAME'] || 'whereto_bot',
};
```

## Validation

### Validate Environment Variables

Create validation schema:

```typescript
// apps/api/src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
```

## Secrets Management

### Development

- Use `.env` files (gitignored)
- Never commit `.env` files
- Use `.env.example` as template

### Production

- Use secret managers (AWS Secrets Manager, HashiCorp Vault)
- Inject secrets at runtime
- Rotate secrets regularly

### Example: AWS Secrets Manager

```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

async function loadSecrets() {
  const client = new SecretsManager({ region: 'us-east-1' });
  const secret = await client.getSecretValue({ SecretId: 'whereto/prod' });
  return JSON.parse(secret.SecretString);
}
```

## Environment Variable Checklist

### Required for API

- [ ] `DB_HOST`
- [ ] `DB_PORT`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `DB_NAME`
- [ ] `API_PORT`
- [ ] `NODE_ENV`

### Required for Bot

- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `API_BASE_URL`
- [ ] `API_SERVICE_TOKEN`

### Optional

- [ ] `GOOGLE_PLACES_API_KEY` (for ingestion)
- [ ] `REDIS_HOST` (for caching)
- [ ] `JWT_SECRET` (if using JWT)

## .env.example Template

Create `.env.example` files with placeholder values:

```bash
# apps/api/.env.example
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=whereto
DB_PASSWORD=change_me
DB_NAME=whereto_catalog

# API
API_PORT=3000
NODE_ENV=development

# Google Places (for ingestion)
GOOGLE_PLACES_API_KEY=your_api_key_here

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Troubleshooting

### Missing Environment Variables

Error: `Environment variable DB_HOST is not defined`

Solution: Check `.env` file exists and contains required variables.

### Invalid Values

Error: `DB_PORT must be a number`

Solution: Ensure numeric values are valid numbers, not strings.

### Environment Not Loading

Check:
1. `.env` file exists in correct location
2. File is not gitignored (should be)
3. Application is reading from correct path
4. No typos in variable names

## Best Practices

1. **Never commit `.env` files**: Always gitignore
2. **Use `.env.example`**: Document required variables
3. **Validate on startup**: Fail fast if required vars missing
4. **Use defaults carefully**: Only for non-critical values
5. **Document all variables**: Keep this doc updated
6. **Rotate secrets**: Regularly update API keys, tokens
7. **Use secret managers**: For production environments

## References

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Angular Environments](https://angular.io/guide/build#configuring-application-environments)
- [12-Factor App: Config](https://12factor.net/config)

