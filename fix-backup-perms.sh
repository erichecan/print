#!/bin/bash
PROJECT_ID=print-482914
INSTANCE=print1600
BUCKET=print-482914-db-backups

echo "Getting Cloud SQL service account..."
# We have to get the service account email for the Cloud SQL instance
SQL_SA=$(curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://sqladmin.googleapis.com/sql/v1beta4/projects/${PROJECT_ID}/instances/${INSTANCE}" \
  | grep serviceAccountEmailAddress | awk -F'"' '{print $4}')

if [ -z "$SQL_SA" ]; then
  echo "Failed to get Cloud SQL Service Account!"
  exit 1
fi

echo "Cloud SQL SA: $SQL_SA"
echo "Granting storage.objectAdmin to $SQL_SA on gs://$BUCKET..."

gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member="serviceAccount:$SQL_SA" \
  --role="roles/storage.objectAdmin"

echo "Done! Try running the backup job again:"
echo "gcloud scheduler jobs run daily-db-backup --location=us-central1 --project=print-482914"
