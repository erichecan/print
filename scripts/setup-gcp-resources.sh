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
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
DB_INSTANCE=${DB_INSTANCE_NAME:-print-main-db}
DB_NAME=${DB_NAME:-suvernireplus}
DB_USER=${DB_USER:-postgres}

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

# Enable APIs
echo -e "${GREEN}📡 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
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

# Database URL (placeholder - update after getting actual connection string)
if ! gcloud secrets describe database-url &> /dev/null; then
  echo -e "${YELLOW}⚠️  Please create database-url secret manually with Cloud SQL connection string${NC}"
  echo "Format: postgresql://USER:PASSWORD@/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
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
echo "1. Update database-url secret with actual Cloud SQL connection string"
echo "2. Update stripe-secret-key and stripe-publishable-key with your Stripe keys"
echo "3. Run deployment script: ./scripts/deploy-gcp.sh"

