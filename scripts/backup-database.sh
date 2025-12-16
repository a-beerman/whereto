#!/bin/bash
# Database backup script

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.dump"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."

# Create backup
docker exec whereto-postgres pg_dump -U whereto -Fc whereto_catalog > "$BACKUP_FILE" || {
  echo "Error: Failed to create backup"
  exit 1
}

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Remove old backups (keep last 30 days)
echo "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup-*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Optional: Upload to cloud storage
# if [ -n "$AWS_S3_BUCKET" ]; then
#   echo "Uploading to S3..."
#   aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/database/"
# fi

