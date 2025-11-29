#!/bin/bash
# [2025-11-28 17:25:00] 配置 Stripe 密钥到 GCP Secret Manager

PROJECT_ID="moonlit-gamma-479502-r6"
REGION="us-central1"

echo "=== 配置 Stripe 密钥到 GCP Secret Manager ==="
echo ""

# 检查是否提供了密钥
if [ -z "$1" ]; then
  echo "用法: ./scripts/configure-stripe-secret.sh <STRIPE_SECRET_KEY> [STRIPE_PUBLISHABLE_KEY]"
  echo ""
  echo "示例:"
  echo "  ./scripts/configure-stripe-secret.sh sk_test_xxxxx pk_test_xxxxx"
  echo ""
  echo "或者您可以手动执行以下命令："
  echo ""
  echo "# 创建 Stripe Secret Key Secret"
  echo "echo 'your_stripe_secret_key' | \\"
  echo "  gcloud secrets create stripe-secret-key \\"
  echo "  --project=${PROJECT_ID} \\"
  echo "  --data-file=-"
  echo ""
  echo "# 创建 Stripe Publishable Key Secret"
  echo "echo 'your_stripe_publishable_key' | \\"
  echo "  gcloud secrets create stripe-publishable-key \\"
  echo "  --project=${PROJECT_ID} \\"
  echo "  --data-file=-"
  exit 1
fi

STRIPE_SECRET_KEY="$1"
STRIPE_PUBLISHABLE_KEY="$2"

# 创建 Stripe Secret Key
echo "1. 创建 Stripe Secret Key Secret..."
if echo "$STRIPE_SECRET_KEY" | gcloud secrets create stripe-secret-key \
  --project=${PROJECT_ID} \
  --data-file=- 2>&1; then
  echo "   ✅ Stripe Secret Key Secret 创建成功"
else
  # 如果已存在，更新它
  echo "   Secret 已存在，正在更新..."
  echo "$STRIPE_SECRET_KEY" | gcloud secrets versions add stripe-secret-key \
    --project=${PROJECT_ID} \
    --data-file=- 2>&1
  echo "   ✅ Stripe Secret Key Secret 更新成功"
fi

# 如果提供了 Publishable Key，也创建它
if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
  echo ""
  echo "2. 创建 Stripe Publishable Key Secret..."
  if echo "$STRIPE_PUBLISHABLE_KEY" | gcloud secrets create stripe-publishable-key \
    --project=${PROJECT_ID} \
    --data-file=- 2>&1; then
    echo "   ✅ Stripe Publishable Key Secret 创建成功"
  else
    echo "   Secret 已存在，正在更新..."
    echo "$STRIPE_PUBLISHABLE_KEY" | gcloud secrets versions add stripe-publishable-key \
      --project=${PROJECT_ID} \
      --data-file=- 2>&1
    echo "   ✅ Stripe Publishable Key Secret 更新成功"
  fi
fi

echo ""
echo "3. 授予 Cloud Run 服务访问权限..."
SERVICE_ACCOUNT=$(gcloud run services describe print-main-backend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null)

if [ -n "$SERVICE_ACCOUNT" ]; then
  echo "   服务账号: ${SERVICE_ACCOUNT}"
  
  gcloud secrets add-iam-policy-binding stripe-secret-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${PROJECT_ID} 2>&1
  
  if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
    gcloud secrets add-iam-policy-binding stripe-publishable-key \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --project=${PROJECT_ID} 2>&1
  fi
  
  echo "   ✅ 权限授予成功"
else
  echo "   ⚠️  无法获取服务账号，请手动授予权限"
fi

echo ""
echo "4. 更新 Cloud Run 服务环境变量..."
UPDATE_SECRETS="STRIPE_SECRET_KEY=stripe-secret-key:latest"
if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
  UPDATE_SECRETS="${UPDATE_SECRETS},STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest"
fi

gcloud run services update print-main-backend \
  --update-secrets="${UPDATE_SECRETS}" \
  --region=${REGION} \
  --project=${PROJECT_ID} 2>&1

echo ""
echo "=== 配置完成 ==="
echo ""
echo "Stripe 密钥已配置到 GCP Secret Manager 并关联到 Cloud Run 服务。"
echo "服务将在下次部署或重启后生效。"

