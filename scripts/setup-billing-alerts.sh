#!/bin/bash
# Setup GCP Billing Alerts Script
# Automatically set up billing alerts to prevent unexpected charges
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
BUDGET_AMOUNT=${BUDGET_AMOUNT:-5}  # Default $5/month

echo -e "${GREEN}🔔 Setting up GCP billing alerts...${NC}"
echo -e "Project: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Budget: ${YELLOW}$${BUDGET_AMOUNT}/month${NC}"
echo ""

# Get billing account
BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" --limit=1)

if [ -z "$BILLING_ACCOUNT" ]; then
    echo -e "${RED}❌ No billing account found. Please set up billing first.${NC}"
    echo -e "Visit: https://console.cloud.google.com/billing"
    exit 1
fi

echo -e "${GREEN}Found billing account: ${YELLOW}${BILLING_ACCOUNT}${NC}"

# Check if billing is linked to project
BILLING_LINKED=$(gcloud billing projects describe ${PROJECT_ID} --format="value(billingAccountName)" 2>/dev/null || echo "")

if [ -z "$BILLING_LINKED" ]; then
    echo -e "${YELLOW}⚠️  Linking billing account to project...${NC}"
    gcloud billing projects link ${PROJECT_ID} --billing-account=${BILLING_ACCOUNT}
fi

# Create budget
echo -e "${GREEN}Creating budget alert...${NC}"

# Try to create budget (may fail if exists)
gcloud billing budgets create \
  --billing-account=${BILLING_ACCOUNT} \
  --display-name="Print Main - Budget Alert" \
  --budget-amount=${BUDGET_AMOUNT}USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --filter-projects=projects/${PROJECT_ID} || \
  echo -e "${YELLOW}⚠️  Budget may already exist${NC}"

echo ""
echo -e "${GREEN}✅ Billing alerts configured!${NC}"
echo -e "${YELLOW}You will receive email notifications at:${NC}"
echo -e "  - 50% of budget ($$(echo "scale=2; $BUDGET_AMOUNT * 0.5" | bc))"
echo -e "  - 90% of budget ($$(echo "scale=2; $BUDGET_AMOUNT * 0.9" | bc))"
echo -e "  - 100% of budget ($${BUDGET_AMOUNT})"
echo ""
echo -e "${YELLOW}View budgets at:${NC}"
echo -e "  https://console.cloud.google.com/billing/budgets"
echo ""

