# Docker Compose deployment script 
# Usage: ./scripts/deploy.sh [environment] [--build] [--restart]

set -e

ENVIRONMENT="${1:-production}"
BUILD_FLAG=""
RESTART_FLAG=""

if [ "$2" = "--build" ] || [ "$3" = "--build" ]; then
  BUILD_FLAG="--build"
fi

if [ "$2" = "--restart" ] || [ "$3" = "--restart" ]; then
  RESTART_FLAG="--force-recreate"
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Deploying to $ENVIRONMENT environment..."

# Check if .env file exists
if [ ! -f ".env.$ENVIRONMENT" ] && [ ! -f ".env" ]; then
  echo "Error: Environment file not found. Please create .env.$ENVIRONMENT or .env"
  exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
  export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run database migrations
echo "Running database migrations..."
docker compose exec backend npx prisma migrate deploy || \
  docker compose run --rm backend npx prisma migrate deploy

# Deploy services
echo "Deploying services..."
docker compose up -d $BUILD_FLAG $RESTART_FLAG

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check service health
docker compose ps

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Deployment completed!"

