#!/bin/bash
# GCP Resource Cleanup Script - TURBO PARALLEL VERSION
# This script removes old Docker images (in parallel) and Secret Manager versions, keeping only the 2 most recent.
# Project: print-482914

set -o pipefail

PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
IMAGES=("backend" "frontend")
SECRETS=("database-url" "jwt-secret" "stripe-secret-key" "stripe-publishable-key" "api-url")
MAX_PARALLEL=5  # Adjust based on your network/GCP limits

echo "----------------------------------------------------"
echo "🚀 Starting TURBO GCP Cleanup for project: $PROJECT_ID"
echo "Keep Policy: 2 most recent versions"
echo "Parallelism: $MAX_PARALLEL"
echo "----------------------------------------------------"

# 1. Cleanup Artifact Registry Images
for IMAGE in "${IMAGES[@]}"; do
    echo "📦 Checking images for: $IMAGE..."
    IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE"
    
    # 1.1 Get all digests sorted by creation time (newest first)
    ALL_DIGESTS=$(gcloud artifacts docker images list "$IMAGE_PATH" \
        --project="$PROJECT_ID" \
        --sort-by=~CREATE_TIME --format="value(DIGEST)" | awk '!x[$0]++')
    
    # 1.2 Identify digests to delete (everything from the 3rd one onwards)
    DIGESTS_TO_DELETE=$(echo "$ALL_DIGESTS" | tail -n +3)
    
    if [ -n "$DIGESTS_TO_DELETE" ]; then
        COUNT=$(echo "$DIGESTS_TO_DELETE" | wc -l | xargs)
        echo "🔥 Found $COUNT old versions. Starting parallel deletion..."
        
        # Using xargs for parallel deletion
        echo "$DIGESTS_TO_DELETE" | xargs -I {} -P "$MAX_PARALLEL" sh -c "
            echo '🗑️ Deleting: $IMAGE@{}'
            gcloud artifacts docker images delete '$IMAGE_PATH@{}' --project='$PROJECT_ID' --delete-tags --quiet 2>/dev/null || \
            echo '⚠️  Skipped {} (possibly multi-arch dependency)'
        "
        echo "✅ Finished image cleanup for $IMAGE."
    else
        echo "✅ No old images to delete for $IMAGE."
    fi
done

# 2. Cleanup Secret Manager Versions
for SECRET in "${SECRETS[@]}"; do
    echo "🔐 Checking versions for secret: $SECRET..."
    
    # List all versions, sort by version number (desc), and skip top 2
    VERSIONS_TO_DESTROY=$(gcloud secrets versions list "$SECRET" \
        --project="$PROJECT_ID" \
        --format="value(name)" --sort-by=~name | tail -n +3)
    
    if [ -n "$VERSIONS_TO_DESTROY" ]; then
        for VERSION_NAME in $VERSIONS_TO_DESTROY; do
            VERSION_ID=$(basename "$VERSION_NAME")
            echo "🔥 Destroying old secret version: $SECRET (v$VERSION_ID)"
            gcloud secrets versions destroy "$VERSION_ID" --secret="$SECRET" --project="$PROJECT_ID" --quiet
        done
    else
        echo "✅ No old versions to destroy for $SECRET."
    fi
done

echo "----------------------------------------------------"
echo "🎉 TURBO Cleanup process finished!"
echo "Please monitor your GCP billing dashboard for changes."
echo "----------------------------------------------------"
