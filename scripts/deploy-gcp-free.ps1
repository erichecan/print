# GCP FREE TIER Deployment Script for Windows
# [2025-01-27] PowerShell version for Windows 11
# Usage: .\scripts\deploy-gcp-free.ps1

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Configuration
$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { (gcloud config get-value project 2>$null) }
$REGION = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$REPOSITORY = if ($env:ARTIFACT_REGISTRY) { $env:ARTIFACT_REGISTRY } else { "print-main" }
$BACKEND_SERVICE = if ($env:BACKEND_SERVICE_NAME) { $env:BACKEND_SERVICE_NAME } else { "print-main-backend" }
$FRONTEND_SERVICE = if ($env:FRONTEND_SERVICE_NAME) { $env:FRONTEND_SERVICE_NAME } else { "print-main-frontend" }

Write-ColorOutput "🚀 Starting GCP FREE TIER deployment..." "Green"
Write-ColorOutput "Project ID: $PROJECT_ID" "Yellow"
Write-ColorOutput "Region: $REGION" "Yellow"
Write-ColorOutput "⚠️  This configuration uses minScale: 0 for FREE tier (scales to zero when idle)" "Yellow"
Write-Host ""

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-ColorOutput "❌ gcloud CLI is not installed. Please install it first." "Red"
    Write-ColorOutput "Download from: https://cloud.google.com/sdk/docs/install" "Yellow"
    exit 1
}

# Check if Docker is installed
try {
    $null = Get-Command docker -ErrorAction Stop
} catch {
    Write-ColorOutput "❌ Docker is not installed. Please install Docker Desktop first." "Red"
    Write-ColorOutput "Download from: https://www.docker.com/products/docker-desktop" "Yellow"
    exit 1
}

# Set project
Write-ColorOutput "📌 Setting GCP project..." "Green"
gcloud config set project $PROJECT_ID

# Authenticate Docker
Write-ColorOutput "🔐 Configuring Docker authentication..." "Green"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Build and push backend
Write-ColorOutput "🏗️  Building backend Docker image..." "Green"
docker build -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest" -f backend/Dockerfile .

Write-ColorOutput "📤 Pushing backend image..." "Green"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

# Build and push frontend
Write-ColorOutput "🏗️  Building frontend Docker image..." "Green"
docker build -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest" -f apps/web/Dockerfile apps/web

Write-ColorOutput "📤 Pushing frontend image..." "Green"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest"

# Deploy backend - FREE TIER CONFIGURATION
Write-ColorOutput "🚀 Deploying backend to Cloud Run (FREE TIER)..." "Green"
Write-ColorOutput "⚠️  Using minScale: 0 (scales to zero when idle = FREE)" "Yellow"
Write-ColorOutput "⚠️  ⚠️  ⚠️  REMOVING Cloud SQL connection - use external free database!" "Yellow"

# Check if DATABASE_URL secret exists
$secretExists = gcloud secrets describe database-url 2>$null
if (-not $secretExists) {
    Write-ColorOutput "⚠️  database-url secret not found. Please create it with your external database URL." "Yellow"
    Write-ColorOutput "   Example: postgresql://user:pass@host:5432/dbname" "Yellow"
    $DB_URL = Read-Host "Enter database URL (or press Enter to skip)"
    if ($DB_URL) {
        $DB_URL | gcloud secrets create database-url --data-file=-
        Write-ColorOutput "✅ Created database-url secret" "Green"
    }
}

gcloud run deploy $BACKEND_SERVICE `
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest" `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --min-instances 0 `
  --max-instances 5 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --set-secrets "DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest" `
  --set-env-vars "NODE_ENV=production,PORT=8080"

# Get backend URL
$BACKEND_URL = gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)'
Write-ColorOutput "✅ Backend deployed: $BACKEND_URL" "Green"

# Update API URL secret
$API_URL = "${BACKEND_URL}/api"
Write-ColorOutput "🔐 Updating API URL secret..." "Green"
$API_URL | gcloud secrets versions add api-url --data-file=- 2>$null
if ($LASTEXITCODE -ne 0) {
    $API_URL | gcloud secrets create api-url --data-file=-
}

# Deploy frontend - FREE TIER CONFIGURATION
Write-ColorOutput "🚀 Deploying frontend to Cloud Run (FREE TIER)..." "Green"
Write-ColorOutput "⚠️  Using minScale: 0 (scales to zero when idle = FREE)" "Yellow"

gcloud run deploy $FRONTEND_SERVICE `
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest" `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --min-instances 0 `
  --max-instances 5 `
  --memory 1Gi `
  --cpu 1 `
  --timeout 300 `
  --set-secrets "NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest" `
  --set-env-vars "NODE_ENV=production"

# Get frontend URL
$FRONTEND_URL = gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)'
Write-ColorOutput "✅ Frontend deployed: $FRONTEND_URL" "Green"

Write-Host ""
Write-ColorOutput "🎉 FREE TIER deployment completed!" "Green"
Write-ColorOutput "Backend URL: $BACKEND_URL" "Yellow"
Write-ColorOutput "Frontend URL: $FRONTEND_URL" "Yellow"
Write-Host ""
Write-ColorOutput "💰 Cost Information:" "Yellow"
Write-ColorOutput "  - Cloud Run: FREE (minScale: 0, scales to zero when idle)" "Green"
Write-ColorOutput "  - Artifact Registry: FREE (< 0.5GB)" "Green"
Write-ColorOutput "  - Secret Manager: FREE (< 10,000 versions)" "Green"
Write-ColorOutput "  - Expected monthly cost: `$0 (if < 2M requests/month)" "Green"
Write-Host ""
Write-ColorOutput "⚠️  Important:" "Yellow"
Write-ColorOutput "  1. Set up billing alerts at: https://console.cloud.google.com/billing" "White"
Write-ColorOutput "  2. First request will have cold start (2-5 seconds)" "White"
Write-ColorOutput "  3. Make sure DATABASE_URL points to external free database (Supabase/Neon)" "White"

