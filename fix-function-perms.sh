#!/bin/bash
PROJECT_ID=print-482914

echo "Fetching recent logs for the db-export Cloud Function..."
gcloud functions logs read db-export --region=us-central1 --project=$PROJECT_ID --limit=10

echo "------------------------------------------------------"
echo "Granting Cloud Function SA permission to trigger Cloud SQL..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/cloudsql.admin"

echo "Done! Please try triggering the job one last time:"
echo "gcloud scheduler jobs run daily-db-backup --location=us-central1 --project=print-482914"
