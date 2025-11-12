#!/bin/bash
# Database migration script [2025-11-12 03:15:00]
# Usage: ./scripts/db-migrate.sh [--reset]

set -e

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f backend/.env ]; then
  export $(cat backend/.env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set. Please set it in backend/.env file."
  exit 1
fi

cd backend

if [ "$1" = "--reset" ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: This will reset the database!"
  read -p "Are you sure? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
  fi
  echo "Resetting database..."
  npx prisma migrate reset --force
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running database migrations..."
  npx prisma migrate deploy
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Generating Prisma Client..."
npx prisma generate

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Migration completed successfully!"

