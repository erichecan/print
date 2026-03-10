#!/bin/bash
# GCP Resources Setup Script
# Script to set up all necessary GCP resources
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# 2026-03-05: Cloud SQL 应用用户 + GCS 备份桶与生命周期（计划：本地 DB + 每日快照冷备份）
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
DB_INSTANCE=${DB_INSTANCE_NAME:-print-main-db}
DB_NAME=${DB_NAME:-suvernireplus}
DB_USER=${DB_USER:-postgres}
# 应用连接 Cloud SQL 使用的数据库用户（非 root）
APP_DB_USER=${APP_DB_USER:-app}
BACKUP_BUCKET=${BACKUP_BUCKET:-${PROJECT_ID}-db-backups}

echo -e "${GREEN}🔧 Setting up GCP resources...${NC}"
echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID}

# Enable APIs (含 Cloud Functions / Scheduler / Storage 用于每日备份)
echo -e "${GREEN}📡 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  --quiet

# Create Artifact Registry repository
echo -e "${GREEN}📦 Creating Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe ${REPOSITORY} --location=${REGION} &> /dev/null; then
  gcloud artifacts repositories create ${REPOSITORY} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Print Main application Docker images"
  echo -e "${GREEN}✅ Artifact Registry repository created${NC}"
else
  echo -e "${YELLOW}⚠️  Artifact Registry repository already exists${NC}"
fi

# Create Cloud SQL instance
echo -e "${GREEN}🗄️  Creating Cloud SQL instance...${NC}"
if ! gcloud sql instances describe ${DB_INSTANCE} &> /dev/null; then
  read -sp "Enter database root password: " DB_PASSWORD
  echo ""
  
  gcloud sql instances create ${DB_INSTANCE} \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=${REGION} \
    --root-password=${DB_PASSWORD} \
    --storage-type=SSD \
    --storage-size=20GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-bin-log
  
  echo -e "${GREEN}✅ Cloud SQL instance created${NC}"
else
  echo -e "${YELLOW}⚠️  Cloud SQL instance already exists${NC}"
fi

# Create database
echo -e "${GREEN}📊 Creating database...${NC}"
if ! gcloud sql databases describe ${DB_NAME} --instance=${DB_INSTANCE} &> /dev/null; then
  gcloud sql databases create ${DB_NAME} --instance=${DB_INSTANCE}
  echo -e "${GREEN}✅ Database created${NC}"
else
  echo -e "${YELLOW}⚠️  Database already exists${NC}"
fi

# Create application DB user for Cloud Run (non-root, full access to DB_NAME)
# 2026-03-05: 应用使用专用用户连接 Cloud SQL，Secret database-url 格式见下方
echo -e "${GREEN}👤 Creating application database user (if not exists)...${NC}"
if ! gcloud sql users list --instance=${DB_INSTANCE} --format='value(name)' 2>/dev/null | grep -qx "${APP_DB_USER}"; then
  read -sp "Enter password for DB user '${APP_DB_USER}': " APP_DB_PASSWORD
  echo ""
  gcloud sql users create ${APP_DB_USER} --instance=${DB_INSTANCE} --password="${APP_DB_PASSWORD}"
  echo -e "${GREEN}✅ Application user ${APP_DB_USER} created. Save the password to Secret Manager:${NC}"
  echo -e "   echo -n 'postgresql://${APP_DB_USER}:YOUR_PASSWORD@localhost/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}' | gcloud secrets create database-url --data-file=-"
  echo -e "   or: gcloud secrets versions add database-url --data-file=-  (to update existing)"
else
  echo -e "${YELLOW}⚠️  User ${APP_DB_USER} already exists${NC}"
fi

# Create GCS bucket for daily DB backups (30-day hot, then Coldline)
# 2026-03-05: 每日快照保留 30 天，30 天后转为冷存储
echo -e "${GREEN}🪣 Creating backup bucket (if not exists)...${NC}"
if ! gsutil ls -b "gs://${BACKUP_BUCKET}" &> /dev/null; then
  gsutil mb -p ${PROJECT_ID} -l ${REGION} "gs://${BACKUP_BUCKET}"
  echo -e "${GREEN}✅ Bucket gs://${BACKUP_BUCKET} created${NC}"
else
  echo -e "${YELLOW}⚠️  Bucket gs://${BACKUP_BUCKET} already exists${NC}"
fi

# Lifecycle: daily/ prefix — after 30 days transition to Coldline, optional delete after 365 days
LIFECYCLE_FILE=$(mktemp)
cat <<EOF > "${LIFECYCLE_FILE}"
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 30, "matchesPrefix": ["daily/"]}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 365, "matchesPrefix": ["daily/"]}
    }
  ]
}
EOF
gsutil lifecycle set "${LIFECYCLE_FILE}" "gs://${BACKUP_BUCKET}" 2>/dev/null && echo -e "${GREEN}✅ Lifecycle set: 30d→Coldline, 365d→Delete for daily/${NC}" || echo -e "${YELLOW}⚠️  Set lifecycle manually or bucket already has config${NC}"
rm -f "${LIFECYCLE_FILE}"

# Create secrets
echo -e "${GREEN}🔐 Creating Secret Manager secrets...${NC}"

# Get project number for service account
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# JWT Secret
if ! gcloud secrets describe jwt-secret &> /dev/null; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo -n "${JWT_SECRET}" | gcloud secrets create jwt-secret --data-file=-
  echo -e "${GREEN}✅ Created jwt-secret${NC}"
else
  echo -e "${YELLOW}⚠️  jwt-secret already exists${NC}"
fi

# Database URL (Cloud SQL Unix socket for Cloud Run)
# Format: postgresql://APP_USER:PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
if ! gcloud secrets describe database-url &> /dev/null; then
  echo -e "${YELLOW}⚠️  Create database-url with Cloud SQL connection string:${NC}"
  echo "  postgresql://${APP_DB_USER}:PASSWORD@localhost/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
else
  echo -e "${YELLOW}⚠️  database-url already exists${NC}"
fi

# Stripe secrets (placeholders)
if ! gcloud secrets describe stripe-secret-key &> /dev/null; then
  echo -e "${YELLOW}⚠️  Please create stripe-secret-key secret manually${NC}"
else
  echo -e "${YELLOW}⚠️  stripe-secret-key already exists${NC}"
fi

if ! gcloud secrets describe stripe-publishable-key &> /dev/null; then
  echo -e "${YELLOW}⚠️  Please create stripe-publishable-key secret manually${NC}"
else
  echo -e "${YELLOW}⚠️  stripe-publishable-key already exists${NC}"
fi

if ! gcloud secrets describe api-url &> /dev/null; then
  echo -e "${YELLOW}⚠️  api-url will be created after backend deployment${NC}"
else
  echo -e "${YELLOW}⚠️  api-url already exists${NC}"
fi

# Grant service account access to secrets
echo -e "${GREEN}🔑 Granting service account access to secrets...${NC}"
for SECRET in jwt-secret database-url stripe-secret-key stripe-publishable-key api-url; do
  if gcloud secrets describe ${SECRET} &> /dev/null; then
    gcloud secrets add-iam-policy-binding ${SECRET} \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet
    echo -e "${GREEN}✅ Granted access to ${SECRET}${NC}"
  fi
done

echo ""
echo -e "${GREEN}🎉 GCP resources setup completed!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "1. Ensure database-url secret contains: postgresql://${APP_DB_USER}:PASSWORD@localhost/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
echo "2. Update stripe-secret-key and stripe-publishable-key with your Stripe keys"
echo "3. Deploy backend with Cloud SQL: cloudbuild or ./scripts/deploy-gcp.sh (--add-cloudsql-instances)"
echo "4. Optional: deploy daily backup Cloud Function + Scheduler (see docs/backup-restore.md)"

