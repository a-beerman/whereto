# Production Deployment Guide

This document provides step-by-step instructions for deploying WhereTo to production.

## Prerequisites

- Docker and Docker Compose installed on production server
- Domain name configured with DNS
- SSL certificates (Let's Encrypt recommended)
- PostgreSQL database (managed or self-hosted)
- Environment variables configured

## Deployment Steps

### 1. Prepare Production Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/whereto.git
cd whereto
git checkout main
```

### 3. Configure Environment Variables

```bash
# Copy example files
cp apps/api/.env.production.example apps/api/.env.production
cp apps/bot/.env.production.example apps/bot/.env.production

# Edit and set all required variables
nano apps/api/.env.production
nano apps/bot/.env.production
```

### 4. Set Up Database

#### Option A: Using Docker Compose (for small deployments)

The `docker-compose.prod.yml` includes PostgreSQL. Ensure you set a strong password.

#### Option B: Using Managed Database (Recommended)

1. Create PostgreSQL database on your cloud provider (AWS RDS, Google Cloud SQL, etc.)
2. Enable PostGIS extension
3. Update `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env.production`
4. Remove `postgres` service from `docker-compose.prod.yml`

### 5. Run Database Migrations

```bash
# Build API image locally or pull from registry
docker build -f apps/api/Dockerfile -t whereto-api:latest .

# Run migrations
docker run --rm \
  --env-file apps/api/.env.production \
  --network whereto-network \
  whereto-api:latest \
  npm run migration:run
```

### 6. Deploy Services

```bash
# Pull latest images (if using registry)
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 7. Set Up Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/whereto
upstream api {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.whereto.example.com;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8. Set Up SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.whereto.example.com
```

### 9. Set Up Monitoring

1. Configure health check monitoring (e.g., UptimeRobot, Pingdom)
2. Set up log aggregation (e.g., ELK stack, CloudWatch)
3. Configure error tracking (e.g., Sentry)
4. Set up metrics collection (e.g., Prometheus, Datadog)

### 10. Set Up Backups

See `docs/BACKUP-STRATEGY.md` for detailed backup procedures.

## Database Migration Strategy

### Running Migrations in Production

1. **Always backup database before migrations**
2. **Test migrations on staging first**
3. **Run migrations during low-traffic periods**
4. **Monitor application after migration**

```bash
# Backup database
docker exec whereto-postgres pg_dump -U whereto whereto_catalog > backup-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
docker-compose -f docker-compose.prod.yml exec api npm run migration:run

# Verify migration
docker-compose -f docker-compose.prod.yml exec api npm run migration:show
```

### Rollback Strategy

1. Keep previous Docker image version
2. Restore database from backup if needed
3. Rollback to previous image version

```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
VERSION=previous-version docker-compose -f docker-compose.prod.yml up -d
```

## Health Checks

### API Health Check

```bash
curl https://api.whereto.example.com/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  }
}
```

### Bot Health Check

The bot service should be running and connected to Telegram. Check logs:

```bash
docker-compose -f docker-compose.prod.yml logs bot
```

## Scaling

### Horizontal Scaling (API)

```bash
# Scale API service
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

Update Nginx configuration to load balance across multiple API instances.

### Database Scaling

For production, consider:

- Read replicas for read-heavy workloads
- Connection pooling (already configured in TypeORM)
- Database sharding (if needed for multi-city expansion)

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Metrics**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Database connection pool usage

2. **Database Metrics**
   - Connection count
   - Query performance
   - Disk usage
   - Replication lag (if using replicas)

3. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

### Alerting Thresholds

- **API Error Rate**: Alert if > 1% for 5 minutes
- **API Latency**: Alert if p95 > 500ms for 5 minutes
- **Database Connections**: Alert if > 80% of pool
- **Disk Usage**: Alert if > 80%
- **Memory Usage**: Alert if > 85%

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs bot

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart api
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec api node -e "require('./dist/config/database.config').default().then(c => console.log('Connected'))"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## Security Checklist

- [ ] All environment variables are set and secure
- [ ] Database password is strong and unique
- [ ] API service token is secure
- [ ] SSL/TLS is configured
- [ ] Firewall rules are configured
- [ ] Regular security updates are applied
- [ ] Secrets are not committed to repository
- [ ] Database backups are encrypted
- [ ] Access logs are monitored
- [ ] Rate limiting is enabled

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review logs for errors
   - Check disk usage
   - Review security alerts

2. **Monthly**
   - Update dependencies
   - Review and optimize database queries
   - Review and update documentation

3. **Quarterly**
   - Security audit
   - Performance review
   - Capacity planning

## Rollback Procedure

If a deployment causes issues:

1. **Immediate Rollback**

   ```bash
   docker-compose -f docker-compose.prod.yml down
   VERSION=previous-version docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Database Rollback** (if needed)

   ```bash
   # Restore from backup
   docker exec -i whereto-postgres psql -U whereto whereto_catalog < backup-YYYYMMDD-HHMMSS.sql
   ```

3. **Investigate Issue**
   - Review logs
   - Check metrics
   - Identify root cause

4. **Fix and Redeploy**
   - Fix issue in code
   - Test on staging
   - Deploy to production
