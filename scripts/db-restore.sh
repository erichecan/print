#!/bin/bash
# Database restore script 
# Usage: ./scripts/db-restore.sh <backup-file.dump>

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Error: Backup file path required"
  echo "Usage: ./scripts/db-restore.sh <backup-file.dump>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set. Please set it in .env file or environment."
  exit 1
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: This will replace all data in the database!"
echo "Database: $DATABASE_URL"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting database restore..."

# Use pg_restore with clean option to drop existing objects
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --verbose \
  "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restore completed successfully!"
  
  # Run Prisma migrations to ensure schema is up to date
  echo "Running Prisma migrations..."
  cd backend && npx prisma migrate deploy && cd ..
  
  exit 0
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restore failed!"
  exit 1
fi

