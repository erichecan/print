# Setup GCP Billing Alerts Script for Windows
# [2025-01-27] PowerShell version for Windows 11
# Usage: .\scripts\setup-billing-alerts.ps1

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { (gcloud config get-value project 2>$null) }
$BUDGET_AMOUNT = if ($env:BUDGET_AMOUNT) { $env:BUDGET_AMOUNT } else { 5 }

Write-ColorOutput "🔔 Setting up GCP billing alerts..." "Green"
Write-ColorOutput "Project: $PROJECT_ID" "Yellow"
Write-ColorOutput "Budget: `$$BUDGET_AMOUNT/month" "Yellow"
Write-Host ""

# Get billing account
$BILLING_ACCOUNT = gcloud billing accounts list --format="value(name)" --limit=1

if (-not $BILLING_ACCOUNT) {
    Write-ColorOutput "❌ No billing account found. Please set up billing first." "Red"
    Write-ColorOutput "Visit: https://console.cloud.google.com/billing" "Yellow"
    exit 1
}

Write-ColorOutput "Found billing account: $BILLING_ACCOUNT" "Green"

# Check if billing is linked to project
$BILLING_LINKED = gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)" 2>$null

if (-not $BILLING_LINKED) {
    Write-ColorOutput "⚠️  Linking billing account to project..." "Yellow"
    gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
}

# Create budget
Write-ColorOutput "Creating budget alert..." "Green"

gcloud billing budgets create `
  --billing-account=$BILLING_ACCOUNT `
  --display-name="Print Main - Budget Alert" `
  --budget-amount="${BUDGET_AMOUNT}USD" `
  --threshold-rule="percent=50" `
  --threshold-rule="percent=90" `
  --threshold-rule="percent=100" `
  --filter-projects="projects/${PROJECT_ID}" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "✅ Budget created successfully!" "Green"
} else {
    Write-ColorOutput "⚠️  Budget may already exist or error occurred" "Yellow"
}

Write-Host ""
Write-ColorOutput "✅ Billing alerts configured!" "Green"
Write-ColorOutput "You will receive email notifications at:" "Yellow"
Write-ColorOutput "  - 50% of budget (`$$([math]::Round($BUDGET_AMOUNT * 0.5, 2)))" "White"
Write-ColorOutput "  - 90% of budget (`$$([math]::Round($BUDGET_AMOUNT * 0.9, 2)))" "White"
Write-ColorOutput "  - 100% of budget (`$$BUDGET_AMOUNT)" "White"
Write-Host ""
Write-ColorOutput "View budgets at:" "Yellow"
Write-ColorOutput "  https://console.cloud.google.com/billing/budgets" "White"
Write-Host ""

