#!/bin/bash
# GCP Cleanliness Verification - VERIFY CLEANUP SCRIPT (Simplified)
# This script lists current counts of Docker images and Secret Versions to prove cleanup worked.
# Project: print-482914

PROJECT_ID="print-482914"
REGION="us-central1"
REPOSITORY="print-main"
IMAGES=("backend" "frontend")
SECRETS=("api-url" "database-url")

echo "===================================================="
echo "🔍 GCP Resource Verification Report"
echo "Project: $PROJECT_ID"
echo "Expected Policy: Keep ~2 most recent versions"
echo "===================================================="

# 1. VERIFY IMAGES
echo ""
echo "📦 [Artifact Registry] Checking Image Counts..."
for IMAGE in "${IMAGES[@]}"; do
    IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE"
    
    # Try simple count first to avoid massive output
    # Using specific query to bypass potential permission issues on full list if possible
    COUNT=$(gcloud artifacts docker images list "$IMAGE_PATH" \
        --project="$PROJECT_ID" \
        --format="value(DIGEST)" | sort -u | wc -l | xargs)
    
    echo "   - $IMAGE: Found $COUNT unique digests."
done

# 2. VERIFY SECRETS
echo ""
echo "🔐 [Secret Manager] Checking Active/Enabled Versions..."
for SECRET in "${SECRETS[@]}"; do
    COUNT=$(gcloud secrets versions list "$SECRET" \
        --project="$PROJECT_ID" \
        --filter="state!=DESTROYED" \
        --format="value(name)" | wc -l | xargs)
        
    echo "   - $SECRET: Found $COUNT active (non-destroyed) versions."
done

echo ""
echo "===================================================="
echo "✅ Verification Complete"
