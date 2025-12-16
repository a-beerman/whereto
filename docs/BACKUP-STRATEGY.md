# Backup and Recovery Strategy

This document outlines the backup and recovery procedures for the WhereTo project.

## Backup Overview

### What to Backup

1. **Database**: PostgreSQL database with all catalog data, plans, bookings
2. **Configuration**: Environment variables and configuration files
3. **Application Code**: Git repository (already version controlled)

### Backup Frequency

- **Database**: Daily automated backups, with retention of 30 days
- **Configuration**: Before each deployment
- **Application Code**: Git repository (continuous)

## Database Backup

### Automated Daily Backups

#### Using Docker Compose

Add to `docker-compose.prod.yml`:

```yaml
postgres-backup:
  image: postgres:14
  container_name: whereto-postgres-backup
  environment:
    PGHOST: postgres
    PGPORT: 5432
    PGUSER: ${DB_USER:-whereto}
    PGPASSWORD: ${DB_PASSWORD}
    PGDATABASE: ${DB_NAME:-whereto_catalog}
  volumes:
    - ./backups:/backups
  command: >
    sh -c "
      while true; do
        pg_dump -Fc -f /backups/backup-$$(date +%Y%m%d-%H%M%S).dump
        # Keep only last 30 days
        find /backups -name 'backup-*.dump' -mtime +30 -delete
        sleep 86400
      done
    "
  depends_on:
    - postgres
  networks:
    - whereto-network
  restart: unless-stopped
```

#### Manual Backup

```bash
# Create backup
docker exec whereto-postgres pg_dump -U whereto -Fc whereto_catalog > backup-$(date +%Y%m%d-%H%M%S).dump

# Or using docker-compose
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U whereto -Fc whereto_catalog > backup-$(date +%Y%m%d-%H%M%S).dump
```

### Backup Storage

1. **Local Storage**: Keep on server in `/backups` directory
2. **Remote Storage**: Sync to cloud storage (S3, Google Cloud Storage, etc.)
3. **Offsite Backup**: Weekly full backup to separate location

### Backup Script

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash
# Database backup script

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.dump"
RETENTION_DAYS=30

# Create backup
docker exec whereto-postgres pg_dump -U whereto -Fc whereto_catalog > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Upload to cloud storage (example for AWS S3)
# aws s3 cp "$BACKUP_FILE" s3://whereto-backups/database/

# Remove old backups (keep last 30 days)
find "$BACKUP_DIR" -name "backup-*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

### Backup Verification

```bash
# Verify backup file
pg_restore --list backup-20240115-120000.dump

# Test restore on test database
docker exec -i whereto-postgres-test psql -U whereto whereto_catalog_test < backup-20240115-120000.dump
```

## Recovery Procedures

### Full Database Restore

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop api bot

# Drop existing database (CAUTION: This deletes all data)
docker exec whereto-postgres psql -U whereto -c "DROP DATABASE whereto_catalog;"
docker exec whereto-postgres psql -U whereto -c "CREATE DATABASE whereto_catalog;"
docker exec whereto-postgres psql -U whereto -d whereto_catalog -c "CREATE EXTENSION postgis;"

# Restore from backup
docker exec -i whereto-postgres pg_restore -U whereto -d whereto_catalog < backup-20240115-120000.dump

# Or using docker-compose
docker-compose -f docker-compose.prod.yml exec -T postgres pg_restore -U whereto -d whereto_catalog < backup-20240115-120000.dump

# Restart application
docker-compose -f docker-compose.prod.yml start api bot
```

### Point-in-Time Recovery

For point-in-time recovery, you need:

1. **WAL Archiving**: Enable Write-Ahead Log (WAL) archiving in PostgreSQL
2. **Base Backup**: Regular full backups
3. **WAL Files**: Continuous WAL file archiving

#### Enable WAL Archiving

Add to PostgreSQL configuration:

```yaml
# In docker-compose.prod.yml postgres service
command: >
  postgres
  -c wal_level=replica
  -c archive_mode=on
  -c archive_command='test ! -f /backups/wal/%f && cp %p /backups/wal/%f'
```

#### Point-in-Time Recovery

```bash
# Stop PostgreSQL
docker-compose -f docker-compose.prod.yml stop postgres

# Restore base backup
docker exec whereto-postgres pg_restore -U whereto -d whereto_catalog < base-backup.dump

# Restore WAL files up to target time
docker exec whereto-postgres pg_waldump /backups/wal/ -p /var/lib/postgresql/data/pg_wal --end-time="2024-01-15 14:30:00"

# Start PostgreSQL
docker-compose -f docker-compose.prod.yml start postgres
```

## Configuration Backup

### Environment Variables

```bash
# Backup environment files
cp apps/api/.env.production apps/api/.env.production.backup-$(date +%Y%m%d)
cp apps/bot/.env.production apps/bot/.env.production.backup-$(date +%Y%m%d)

# Store in secure location (encrypted)
tar -czf config-backup-$(date +%Y%m%d).tar.gz apps/*/.env.production*
# Encrypt and upload to secure storage
```

## Disaster Recovery Plan

### Scenario 1: Database Corruption

1. **Immediate Actions**
   - Stop application services
   - Assess damage
   - Identify last known good backup

2. **Recovery Steps**
   - Restore from most recent backup
   - Verify data integrity
   - Restart services
   - Monitor for issues

3. **Post-Recovery**
   - Investigate root cause
   - Implement preventive measures
   - Update backup procedures if needed

### Scenario 2: Complete Server Failure

1. **Immediate Actions**
   - Provision new server
   - Restore from offsite backups
   - Verify infrastructure

2. **Recovery Steps**
   - Install Docker and dependencies
   - Restore database from backup
   - Deploy application code
   - Restore configuration
   - Start services
   - Verify functionality

3. **Post-Recovery**
   - Update DNS if needed
   - Verify all services
   - Monitor closely
   - Document lessons learned

### Scenario 3: Data Loss (Accidental Deletion)

1. **Immediate Actions**
   - Stop application if needed
   - Identify affected data
   - Locate backup before deletion

2. **Recovery Steps**
   - Restore from backup
   - Extract specific data if possible
   - Re-apply any changes made after backup
   - Verify data integrity

## Backup Testing

### Regular Backup Testing

Test backups monthly:

1. **Create Test Environment**

   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Restore Backup**

   ```bash
   docker exec -i whereto-postgres-test pg_restore -U whereto -d whereto_catalog_test < backup-latest.dump
   ```

3. **Verify Data**
   - Check record counts
   - Verify data integrity
   - Test application functionality

4. **Document Results**
   - Record test date
   - Note any issues
   - Update procedures if needed

## Backup Retention Policy

- **Daily Backups**: Keep for 30 days
- **Weekly Backups**: Keep for 12 weeks
- **Monthly Backups**: Keep for 12 months
- **Yearly Backups**: Keep indefinitely

## Cloud Storage Integration

### AWS S3 Example

```bash
# Install AWS CLI
apt-get install awscli

# Configure credentials
aws configure

# Upload backup
aws s3 cp backup-20240115-120000.dump.gz s3://whereto-backups/database/

# Download backup
aws s3 cp s3://whereto-backups/database/backup-20240115-120000.dump.gz ./
```

### Automated Cloud Sync

Add to backup script:

```bash
# Upload to S3
aws s3 sync /backups s3://whereto-backups/database/ --delete

# Or use lifecycle policies for automatic cleanup
```

## Monitoring Backup Health

### Backup Monitoring

1. **Check Backup Completion**
   - Monitor backup script execution
   - Verify backup file creation
   - Check backup file size

2. **Alert on Failures**
   - Set up alerts for backup failures
   - Monitor backup storage usage
   - Verify cloud sync success

### Backup Health Checks

```bash
# Check last backup time
ls -lh /backups/backup-*.dump.gz | tail -1

# Verify backup integrity
pg_restore --list /backups/backup-latest.dump.gz | head -20

# Check backup size (should be consistent)
du -h /backups/backup-*.dump.gz
```

## Best Practices

1. **Automate Everything**: Use cron jobs or scheduled tasks
2. **Test Regularly**: Monthly backup restoration tests
3. **Store Offsite**: Keep backups in separate location
4. **Encrypt Backups**: Encrypt sensitive data
5. **Document Procedures**: Keep recovery procedures up to date
6. **Monitor Health**: Set up alerts for backup failures
7. **Version Control**: Track backup procedures in Git
8. **Regular Reviews**: Review and update backup strategy quarterly
