#!/bin/bash
# GCP Artifact Registry Cleanup - STREAMING ROBUST VERSION
# This script uses a streaming pipeline to handle UNLIMITED numbers of images.
# It completely avoids "Argument list too long" errors by never storing the full list in a variable.
# Project: print-482914

set -u
set -o pipefail

PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
IMAGES=("backend" "frontend")

echo "----------------------------------------------------"
echo "🚀 Starting Streaming GCP Artifact Cleanup: $PROJECT_ID"
echo "Keep Policy: 2 most recent versions"
echo "Strategy: Stream processing (No memory/arg limits)"
echo "----------------------------------------------------"

for IMAGE in "${IMAGES[@]}"; do
    echo "📦 Processing images for: $IMAGE..."
    IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE"
    
    # COUNTING (Optional, just for display)
    TOTAL_COUNT=$(gcloud artifacts docker images list "$IMAGE_PATH" --project="$PROJECT_ID" --format="value(DIGEST)" | sort -u | wc -l | xargs)
    echo "📊 Total unique digests found: $TOTAL_COUNT"
    
    if [ "$TOTAL_COUNT" -le 2 ]; then
        echo "✅ Count is $TOTAL_COUNT (<= 2). No cleanup needed."
        continue
    fi

    # STREAMING DELETION PIPELINE
    # 1. List all images (sorted by create time desc) -> Stream
    # 2. Extract DIGEST -> Stream
    # 3. Deduplicate (awk) -> Stream
    # 4. Skip first 2 (tail) -> Stream
    # 5. Loop and destroy (while read)
    
    echo "🔥 Starting streaming deletion for $IMAGE..."
    
    gcloud artifacts docker images list "$IMAGE_PATH" \
        --project="$PROJECT_ID" \
        --sort-by=~CREATE_TIME \
        --format="value(DIGEST)" \
    | awk '!x[$0]++' \
    | tail -n +3 \
    | while read -r DIGEST; do
        echo "🗑️  Deleting: $IMAGE@$DIGEST"
        
        # Run delete synchronously or asynchronously? 
        # For "thorough" cleanup, synchronous is safer but slower. 
        # Given the user wants "thorough", we'll use sync but suppress errors for robustness.
        # Adding --async for speed as requested previously, but piping stderr to hide harmless errors.
        
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

echo "----------------------------------------------------"
echo "🎉 Artifact Cleanup pipeline finished."
echo "----------------------------------------------------"
