# Deployment & CI/CD Guide

This document describes deployment processes, CI/CD pipelines, and infrastructure setup for the WhereTo project.

## Overview

- **CI/CD**: GitHub Actions (or similar)
- **Containerization**: Docker
- **Orchestration**: Docker Compose (development), Kubernetes (production, optional)
- **Database**: Managed PostgreSQL (e.g., AWS RDS, Google Cloud SQL)

## Environment Setup

### Environments

- **Development**: Local development
- **Staging**: Pre-production testing
- **Production**: Live environment

See `docs/ENVIRONMENT.md` for environment variable configuration.

## Docker

### Dockerfile (API)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy source
COPY apps/api ./apps/api
COPY libs ./libs

# Install dependencies
RUN npm ci

# Build
RUN npx nx build api --prod

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist/apps/api ./dist

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_USER: whereto
      POSTGRES_PASSWORD: whereto
      POSTGRES_DB: whereto_catalog
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: whereto
      DB_PASSWORD: whereto
      DB_NAME: whereto_catalog
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:14-3.2
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: whereto_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

### Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging
        # Add deployment steps

  deploy-production:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        # Add deployment steps
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run health checks
3. Switch traffic from "blue" to "green"
4. Keep "blue" as rollback option

### Rolling Deployment

1. Deploy new version incrementally
2. Replace instances one by one
3. Monitor for issues
4. Rollback if needed

### Canary Deployment

1. Deploy new version to small percentage of traffic
2. Monitor metrics and errors
3. Gradually increase traffic
4. Full rollout or rollback based on results

## Database Migrations

### Migration Strategy

1. **Test migrations** in staging first
2. **Backup database** before production migration
3. **Run migrations** during deployment
4. **Verify** migration success
5. **Monitor** for issues

### Migration Script

```bash
#!/bin/bash
# scripts/migrate.sh

set -e

echo "Running database migrations..."

# Run migrations
npm run migration:run

# Verify migration
if [ $? -eq 0 ]; then
  echo "Migrations completed successfully"
else
  echo "Migration failed"
  exit 1
fi
```

## Health Checks

### Health Check Endpoint

```typescript
// apps/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    const dbStatus = await this.dataSource.query('SELECT 1');
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
    };
  }
}
```

## Monitoring & Observability

### Application Logging

Use structured logging:

```typescript
// Use NestJS Logger
private readonly logger = new Logger(VenuesService.name);

this.logger.log('Finding venues', { filters });
this.logger.error('Failed to find venues', error.stack);
```

For production, use centralized logging (e.g., ELK stack, CloudWatch, Datadog):

```typescript
// Structured logging with context
this.logger.log({
  message: 'Venue search completed',
  filters,
  resultCount: venues.length,
  duration: Date.now() - startTime,
  userId: request.user?.id,
  timestamp: new Date().toISOString(),
});
```

### Metrics Collection

#### Product Events

Track product events as specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 8.1:

- `search` (q/category, city)
- `open_place` (venueId)
- `save_place`
- `share_place`
- `open_plan_flow` (if /plan is used)

Implementation: Use analytics service (Mixpanel, Amplitude, or custom) to track these events. See [`docs/TECH-STACK.md`](TECH-STACK.md) for implementation patterns.

#### Ingestion Metrics

Track ingestion job metrics as specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 8.2:

- Job duration per city
- Fetched count
- Created/updated venues
- Duplicates count
- Errors/retries
- Last successful sync time per city

Store in database or metrics service:

```typescript
// Store ingestion metrics
await metricsRepository.save({
  cityId: 'city-uuid',
  duration: 12345, // milliseconds
  fetched: 1000,
  created: 50,
  updated: 950,
  duplicates: 10,
  errors: 2,
  timestamp: new Date(),
});
```

#### API Performance Metrics

Track API metrics:
- Response times (p50, p95, p99)
- Request rates
- Error rates by endpoint
- Database query performance

Use monitoring service (Prometheus, Datadog, CloudWatch):

```typescript
// Example: Track API latency
metrics.histogram('api.request.duration', duration, {
  method: 'GET',
  endpoint: '/api/v1/venues',
  statusCode: 200,
});
```

### SLO Monitoring

Track SLOs as specified in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 8.3:

1. **p95 latency** for `/venues` and `/venues/{id}`
   - Target: < 500ms for search, < 200ms for details
   - Alert if p95 exceeds threshold

2. **Ingestion job success rate**
   - Target: > 99% success rate
   - Alert if success rate drops below threshold

Set up dashboards and alerts:

```yaml
# Example alert configuration
alerts:
  - name: HighAPILatency
    condition: p95_latency > 500ms
    duration: 5m
    action: notify_team
    
  - name: IngestionJobFailure
    condition: ingestion_success_rate < 99%
    duration: 10m
    action: notify_team
```

### Dashboards

Create dashboards for:

1. **API Performance**
   - Request rate by endpoint
   - Response time percentiles (p50, p95, p99)
   - Error rate by endpoint
   - Top slow queries

2. **Ingestion Jobs**
   - Job duration by city
   - Success/failure rate
   - Records processed (created/updated/duplicates)
   - Last sync time per city

3. **Product Metrics**
   - Search events by city/category
   - Place opens
   - Save/share actions
   - User engagement trends

4. **Infrastructure**
   - Database connection pool usage
   - CPU/Memory usage
   - Disk I/O
   - Network traffic

### Alerts

Set up alerts for:

- **High error rates**: > 1% error rate for 5 minutes
- **Slow response times**: p95 latency > 500ms for 5 minutes
- **Database connection issues**: Connection pool exhaustion
- **Ingestion job failures**: Job failure or timeout
- **High duplicate rate**: > 10% duplicates in ingestion
- **Stale data**: Last sync > 25 hours ago

### Error Tracking

Use error tracking service (Sentry, Rollbar):

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

// Capture exceptions
try {
  // code
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'venues-service' },
    extra: { filters, userId },
  });
}
```

### Log Aggregation

Centralize logs for analysis:

- **Development**: Console output
- **Staging/Production**: ELK stack, CloudWatch Logs, or Datadog

Search and filter logs by:
- Service/component
- Error level
- Time range
- User ID
- Request ID (correlation ID)

### Performance Profiling

Profile slow operations:

```typescript
// Profile database queries
const start = Date.now();
const venues = await this.repository.find(filters);
const duration = Date.now() - start;

if (duration > 1000) {
  this.logger.warn('Slow query detected', {
    duration,
    filters,
    query: this.repository.createQueryBuilder().getQuery(),
  });
}
```

Use APM tools (New Relic, Datadog APM) for automatic profiling.

## Rollback Procedure

### Application Rollback

1. **Identify issue**: Check logs and metrics
2. **Revert code**: Rollback to previous version
3. **Redeploy**: Deploy previous version
4. **Verify**: Check health endpoints
5. **Monitor**: Watch for resolution

### Database Rollback

1. **Stop application**: Prevent new writes
2. **Revert migration**: Run migration down
3. **Restore backup**: If needed
4. **Verify data**: Check data integrity
5. **Restart application**: Resume operations

## Security

### Secrets Management

- **Never commit secrets**: Use environment variables
- **Use secret managers**: AWS Secrets Manager, HashiCorp Vault
- **Rotate secrets**: Regularly update API keys, tokens

### Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] API keys rotated
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] Rate limiting configured

## Performance

### Optimization

- **Database indexes**: Ensure proper indexing
- **Caching**: Implement caching where appropriate
- **Connection pooling**: Configure database pool
- **CDN**: Use CDN for static assets
- **Compression**: Enable gzip/brotli compression

### Load Testing

Run load tests before major releases:
- Simulate expected traffic
- Identify bottlenecks
- Verify scaling behavior

## Backup & Recovery

### Database Backups

- **Automated backups**: Daily backups
- **Retention**: Keep backups for 30 days
- **Test restores**: Regularly test backup restoration

### Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).dump"

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE

# Upload to S3 or backup storage
aws s3 cp $BACKUP_FILE s3://whereto-backups/
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [NestJS Deployment](https://docs.nestjs.com/recipes/deployment)

