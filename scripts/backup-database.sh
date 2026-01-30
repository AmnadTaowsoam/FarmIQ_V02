#!/bin/bash
set -e

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASES=("cloud_identity_access" "cloud_tenant_registry" "cloud_ingestion" "cloud_telemetry")

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

echo "Starting database backup at $TIMESTAMP"

# Backup each database
for DB in "${DATABASES[@]}"; do
    DB_BACKUP_FILE="$BACKUP_DIR/${DB}_${TIMESTAMP}.sql.gz"
    
    echo "Backing up $DB..."
    
    # Use environment variables for database connection
    DB_HOST=${POSTGRES_HOST:-postgres}
    DB_PORT=${POSTGRES_PORT:-5432}
    DB_USER=${POSTGRES_USER:-farmiq}
    DB_PASSWORD=${POSTGRES_PASSWORD:-farmiq_dev}
    
    # Perform backup
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB" | gzip > "$DB_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "Successfully backed up $DB to $DB_BACKUP_FILE"
        SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
        echo "Backup size: $SIZE bytes"
    else
        echo "Failed to backup $DB"
        exit 1
done

# Upload to GCS (if configured)
if [ -n "$GCS_BUCKET" ]; then
    echo "Uploading backups to GCS bucket: $GCS_BUCKET"
    
    for BACKUP_FILE in "$BACKUP_DIR"/*_${TIMESTAMP}.sql.gz; do
        gsutil cp "$BACKUP_FILE" "gs://$GCS_BUCKET/daily/"
        if [ $? -eq 0 ]; then
            echo "Uploaded $BACKUP_FILE"
        else
            echo "Failed to upload $BACKUP_FILE"
        exit 1
    done
else
    echo "GCS_BUCKET not configured, skipping upload"
fi

# Cleanup old local backups (keep 7 days)
echo "Cleaning up old local backups (older than 7 days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +7 -delete

echo "Backup completed at $TIMESTAMP"
