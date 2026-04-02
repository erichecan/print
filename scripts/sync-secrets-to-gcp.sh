#!/bin/bash
# Script to sync local environment secrets to Google Cloud Secret Manager
#
# ⚠️⚠️⚠️  CRITICAL WARNING  ⚠️⚠️⚠️
# DATABASE_URL is intentionally EXCLUDED from this sync.
# backend/.env contains a LOCAL/DEV Neon URL.
# Production uses Cloud SQL (print-482914:us-central1:print1600).
# Syncing DATABASE_URL from .env would DESTROY all production data access.
#
# To update the production database-url secret, use:
#   scripts/update-database-url-secret-and-deploy-backend.sh
# ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

# Ensure we are in the root directory
cd "$(dirname "$0")/.."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Load backend/.env
ENV_FILE="backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found."
    exit 1
fi

# Function to update or create secret
sync_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -z "$secret_value" ]; then
        echo "⚠️  Skip $secret_name: value is empty"
        return
    fi

    echo "🔄 Syncing $secret_name..."

    # Check if secret exists
    if gcloud secrets describe "$secret_name" &> /dev/null; then
        echo "  - Secret exists, adding new version..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        echo "  - Secret does not exist, creating..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --replication-policy="automatic" --data-file=-
    fi

    echo "✅ $secret_name synced."
}

# Extract values from .env
# NOTE: DATABASE_URL is intentionally NOT extracted or synced.
#       Production uses Cloud SQL; local .env has Neon dev URL only.
JWT_SEC=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2-)
STRIPE_SEC=$(grep "^STRIPE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2-)

# Sync (database-url is deliberately omitted)
sync_secret "jwt-secret" "$JWT_SEC"
sync_secret "stripe-secret-key" "$STRIPE_SEC"

echo ""
echo "🎉 Secrets (jwt-secret, stripe-secret-key) synced to GCP Secret Manager!"
echo "⚠️  database-url was NOT synced. Production uses Cloud SQL."
echo "🚀 You can now redeploy your backend service."
