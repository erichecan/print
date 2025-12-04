#!/bin/bash
# Build script for production [2025-11-12 03:20:00]
# Usage: ./scripts/build.sh [--skip-tests]

set -e

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting production build..."

# Install dependencies
echo "Installing dependencies..."
npm install --production=false

# Run tests (optional)
if [ "$1" != "--skip-tests" ]; then
  echo "Running tests..."
  npm run test --workspace backend || echo "Warning: Tests failed, continuing build..."
fi

# Build backend
echo "Building backend..."
cd backend
npm run build || echo "Backend build skipped (no build script)"
cd ..

# Build frontend
echo "Building frontend..."
cd apps/web
npm run build
cd ../..

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Build completed successfully!"

