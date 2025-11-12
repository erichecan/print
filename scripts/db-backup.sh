#!/bin/bash
# Database backup script [2025-11-12 03:15:00]
# Usage: ./scripts/db-backup.sh [output-dir]

set -e

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/backup_${TIMESTAMP}.dump"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set. Please set it in .env file or environment."
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting database backup..."
echo "Output: $BACKUP_FILE"

# Use pg_dump with custom format for better compression and restore options
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="$BACKUP_FILE" \
  --verbose

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup completed successfully!"
  echo "File: $BACKUP_FILE"
  echo "Size: $BACKUP_SIZE"
  
  # Keep only last 7 backups
  echo "Cleaning old backups (keeping last 7)..."
  ls -t "${OUTPUT_DIR}"/backup_*.dump 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
  
  exit 0
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup failed!"
  exit 1
fi

