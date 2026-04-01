#!/bin/bash
PROJECT_ID=print-482914
REGION=us-central1

echo "Fetching final definitive error logs from Cloud Run / Functions..."
gcloud run services logs read db-export --region $REGION --project $PROJECT_ID --limit 10

echo ""
echo "Or using gcloud logging to get the exact message payload (raw):"
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="db-export" AND severity>=ERROR' --project=$PROJECT_ID --limit=5 --format="value(textPayload,jsonPayload.message)"
