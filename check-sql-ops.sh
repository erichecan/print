#!/bin/bash
PROJECT_ID=print-482914
INSTANCE=print1600

echo "Checking Cloud SQL operations history for $INSTANCE..."
gcloud sql operations list --instance=$INSTANCE --project=$PROJECT_ID --limit=5

echo "------------------------------------------------------"
echo "Fetching exact error message for the latest failed operation (if any)..."
# Get the ID of the most recent failed export operation
LATEST_FAILED_OP=$(gcloud sql operations list --instance=$INSTANCE --project=$PROJECT_ID --filter="STATUS!=DONE" --limit=1 --format="value(name)")

if [ -n "$LATEST_FAILED_OP" ]; then
    gcloud sql operations describe $LATEST_FAILED_OP --project=$PROJECT_ID
else
    echo "No recent failed operations found or all operations completed successfully."
fi
