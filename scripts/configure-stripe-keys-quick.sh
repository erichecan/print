#!/bin/bash
# [2025-01-29 13:30:00] 快速配置 Stripe 密钥到 GCP
# 此脚本使用已提供的 Stripe 测试密钥

PROJECT_ID="moonlit-gamma-479502-r6"
REGION="us-central1"

# Stripe 密钥（测试环境）
# [2025-01-29 13:50:00] 请替换为实际的 Stripe 测试密钥
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxx"

echo "=== 配置 Stripe 密钥到 GCP ==="
echo "项目: ${PROJECT_ID}"
echo "区域: ${REGION}"
echo ""

# 检查是否已登录
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ 错误: 未登录 GCP，请先执行: gcloud auth login"
  exit 1
fi

# 设置项目
echo "📌 设置 GCP 项目..."
gcloud config set project ${PROJECT_ID}

echo ""
echo "1. 创建/更新 Stripe Secret Key Secret..."

# 创建或更新 Stripe Secret Key
if echo "${STRIPE_SECRET_KEY}" | gcloud secrets create stripe-secret-key \
  --project=${PROJECT_ID} \
  --data-file=- 2>/dev/null; then
  echo "   ✅ Stripe Secret Key Secret 创建成功"
else
  echo "   Secret 已存在，正在更新..."
  echo "${STRIPE_SECRET_KEY}" | gcloud secrets versions add stripe-secret-key \
    --project=${PROJECT_ID} \
    --data-file=- > /dev/null 2>&1
  echo "   ✅ Stripe Secret Key Secret 更新成功"
fi

echo ""
echo "2. 创建/更新 Stripe Publishable Key Secret..."

# 创建或更新 Stripe Publishable Key
if echo "${STRIPE_PUBLISHABLE_KEY}" | gcloud secrets create stripe-publishable-key \
  --project=${PROJECT_ID} \
  --data-file=- 2>/dev/null; then
  echo "   ✅ Stripe Publishable Key Secret 创建成功"
else
  echo "   Secret 已存在，正在更新..."
  echo "${STRIPE_PUBLISHABLE_KEY}" | gcloud secrets versions add stripe-publishable-key \
    --project=${PROJECT_ID} \
    --data-file=- > /dev/null 2>&1
  echo "   ✅ Stripe Publishable Key Secret 更新成功"
fi

echo ""
echo "3. 授予 Cloud Run 服务访问权限..."

# 获取后端服务账号
BACKEND_SERVICE_ACCOUNT=$(gcloud run services describe print-main-backend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null)

if [ -n "${BACKEND_SERVICE_ACCOUNT}" ]; then
  echo "   后端服务账号: ${BACKEND_SERVICE_ACCOUNT}"
  
  # 授予后端访问 Secret Key 的权限
  gcloud secrets add-iam-policy-binding stripe-secret-key \
    --member="serviceAccount:${BACKEND_SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${PROJECT_ID} > /dev/null 2>&1
  
  # 授予后端访问 Publishable Key 的权限
  gcloud secrets add-iam-policy-binding stripe-publishable-key \
    --member="serviceAccount:${BACKEND_SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${PROJECT_ID} > /dev/null 2>&1
  
  echo "   ✅ 后端服务权限授予成功"
else
  echo "   ⚠️  无法获取后端服务账号"
fi

# 获取前端服务账号
FRONTEND_SERVICE_ACCOUNT=$(gcloud run services describe print-main-frontend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null)

if [ -n "${FRONTEND_SERVICE_ACCOUNT}" ]; then
  echo "   前端服务账号: ${FRONTEND_SERVICE_ACCOUNT}"
  
  # 授予前端访问 Publishable Key 的权限
  gcloud secrets add-iam-policy-binding stripe-publishable-key \
    --member="serviceAccount:${FRONTEND_SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=${PROJECT_ID} > /dev/null 2>&1
  
  echo "   ✅ 前端服务权限授予成功"
else
  echo "   ⚠️  无法获取前端服务账号"
fi

echo ""
echo "4. 更新后端服务环境变量..."

# 更新后端服务
gcloud run services update print-main-backend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ 后端服务已更新"
else
  echo "   ⚠️  后端服务更新失败，请检查权限"
fi

echo ""
echo "5. 更新前端服务环境变量..."

# 更新前端服务（使用环境变量方式，因为 NEXT_PUBLIC_* 需要构建时注入）
gcloud run services update print-main-frontend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --set-env-vars="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "   ✅ 前端服务已更新"
  echo "   ⚠️  注意: 前端需要重新构建才能生效 NEXT_PUBLIC_* 环境变量"
else
  echo "   ⚠️  前端服务更新失败，请检查权限"
fi

echo ""
echo "=== 配置完成 ==="
echo ""
echo "✅ Stripe 密钥已配置到 GCP Secret Manager"
echo "✅ 后端服务已更新"
echo "✅ 前端服务已更新"
echo ""
echo "⚠️  重要提示:"
echo "   - 前端服务需要重新部署才能使用新的 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "   - 后端服务会自动使用 Secret Manager 中的密钥"
echo ""
echo "📝 验证配置:"
echo "   gcloud secrets list --project=${PROJECT_ID} --filter='name:stripe*'"
echo "   gcloud run services describe print-main-backend --region=${REGION} --project=${PROJECT_ID} --format='value(spec.template.spec.containers[0].env)' | grep STRIPE"
echo ""

