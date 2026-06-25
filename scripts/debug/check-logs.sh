#!/bin/bash
PROJECT_ID=print-482914

echo "Fetching the EXACT error message from the database export function..."
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=db-export AND severity>=ERROR" \
  --project=$PROJECT_ID \
  --limit=5 \
  --format="value(textPayload, jsonPayload.message)"
