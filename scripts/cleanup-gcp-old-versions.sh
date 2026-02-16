#!/bin/bash
# GCP Resource Cleanup Script - STREAMING ROBUST VERSION
# This script uses a streaming pipeline to handle UNLIMITED numbers of images.
# It completely avoids "Argument list too long" errors by never storing the full list in a variable or argument.
# Project: print-482914

set -u
set -o pipefail

PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
IMAGES=("backend" "frontend")
SECRETS=("database-url" "jwt-secret" "stripe-secret-key" "stripe-publishable-key" "api-url")

echo "----------------------------------------------------"
echo "🚀 Starting Streaming GCP Cleanup: $PROJECT_ID"
echo "Keep Policy: 2 most recent versions"
echo "Strategy: Stream processing (No memory/arg limits)"
echo "----------------------------------------------------"

# 1. Cleanup Artifact Registry Images
for IMAGE in "${IMAGES[@]}"; do
    echo "📦 Processing images for: $IMAGE..."
    IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE"
    
    # STREAMING DELETION PIPELINE
    # 1. List all images (sorted by create time desc) -> Stream
    # 2. Extract DIGEST -> Stream
    # 3. Deduplicate (awk) -> Stream
    # 4. Skip first 2 (tail) -> Stream
    # 5. Loop and destroy (while read)
    
    gcloud artifacts docker images list "$IMAGE_PATH" \
        --project="$PROJECT_ID" \
        --sort-by=~CREATE_TIME \
        --format="value(DIGEST)" \
    | awk '!x[$0]++' \
    | tail -n +3 \
    | while read -r DIGEST; do
        echo "🗑️  Deleting: $IMAGE@$DIGEST"
        
        # Async delete to speed up and avoid polling errors
        gcloud artifacts docker images delete "$IMAGE_PATH@$DIGEST" \
            --project="$PROJECT_ID" \
            --delete-tags \
            --quiet \
            --async >/dev/null 2>&1
            
        echo "   -> Delete signal sent."
        # Tiny sleep to be nice to the API
        sleep 0.05
    done
    
    echo "✅ Finished processing $IMAGE."
done

# 2. Cleanup Secret Manager Versions
for SECRET in "${SECRETS[@]}"; do
    echo "🔐 Checking versions for secret: $SECRET..."
    
    # Filter out already destroyed versions to prevent errors
    # Still using variable here as versions are usually few (<1000)
    VERSIONS_TO_DESTROY=$(gcloud secrets versions list "$SECRET" \
        --project="$PROJECT_ID" \
        --filter="state!=DESTROYED" \
        --format="value(name)" \
        --sort-by=~name | tail -n +3)
    
    if [ -n "$VERSIONS_TO_DESTROY" ]; then
        echo "$VERSIONS_TO_DESTROY" | while read -r VERSION_NAME; do
            VERSION_ID=$(basename "$VERSION_NAME")
            echo "🔥 Destroying old secret version: $SECRET (v$VERSION_ID)"
            
            if gcloud secrets versions destroy "$VERSION_ID" --secret="$SECRET" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
                 echo "✅  Destroyed."
            else
                 echo "⚠️  Could not destroy (likely already destroyed)."
            fi
        done
    else
        echo "✅ No old versions to destroy for $SECRET."
    fi
done

echo "----------------------------------------------------"
echo "🎉 Cleanup pipeline finished."
echo "----------------------------------------------------"
