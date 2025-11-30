# Stripe 密钥配置指南
# [2025-01-29 13:30:00] 使用提供的 Stripe 密钥配置到 GCP

## 📋 Stripe 密钥信息

- **Publishable Key**: `pk_test_xxxxxxxxxxxxx` (请替换为实际的密钥)
- **Secret Key**: `sk_test_xxxxxxxxxxxxx` (请替换为实际的密钥)

**注意**: 这些是 Stripe 测试密钥，仅用于测试环境。

---

## 🚀 配置方法

### 方法 1: 使用配置脚本（推荐）

#### 步骤 1: 确保已登录 GCP

```bash
# 登录 GCP
gcloud auth login

# 设置项目
gcloud config set project moonlit-gamma-479502-r6

# 验证登录
gcloud auth list
```

#### 步骤 2: 运行配置脚本

```bash
cd /Users/apony-it/Downloads/print-main

# 使用提供的密钥配置
./scripts/configure-stripe-secret.sh \
  sk_test_xxxxxxxxxxxxx \
  pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ
```

脚本将自动：
1. ✅ 创建或更新 GCP Secret Manager 中的密钥
2. ✅ 授予 Cloud Run 服务访问权限
3. ✅ 更新后端服务的环境变量

#### 步骤 3: 配置前端服务

配置前端服务的 Stripe Publishable Key：

```bash
# 方法 A: 使用环境变量（直接设置）
gcloud run services update print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --set-env-vars="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ"

# 方法 B: 使用 Secret Manager（推荐用于生产）
# 先创建 Secret（如果还没有）
echo "pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ" | \
  gcloud secrets create stripe-publishable-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=- 2>/dev/null || \
  echo "pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ" | \
  gcloud secrets versions add stripe-publishable-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=-

# 获取前端服务账号并授予权限
FRONTEND_SERVICE_ACCOUNT=$(gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.serviceAccountName)")

gcloud secrets add-iam-policy-binding stripe-publishable-key \
  --member="serviceAccount:${FRONTEND_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=moonlit-gamma-479502-r6

# 更新前端服务使用 Secret
gcloud run services update print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --update-secrets="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest"
```

---

### 方法 2: 手动配置（如果脚本无法使用）

#### 步骤 1: 创建 GCP Secret Manager Secrets

```bash
# 设置项目
export PROJECT_ID="moonlit-gamma-479502-r6"
export REGION="us-central1"

# 创建 Stripe Secret Key Secret
echo "sk_test_xxxxxxxxxxxxx" | \
  gcloud secrets create stripe-secret-key \
  --project=${PROJECT_ID} \
  --data-file=- 2>/dev/null || \
  echo "sk_test_xxxxxxxxxxxxx" | \
  gcloud secrets versions add stripe-secret-key \
  --project=${PROJECT_ID} \
  --data-file=-

# 创建 Stripe Publishable Key Secret
echo "pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ" | \
  gcloud secrets create stripe-publishable-key \
  --project=${PROJECT_ID} \
  --data-file=- 2>/dev/null || \
  echo "pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ" | \
  gcloud secrets versions add stripe-publishable-key \
  --project=${PROJECT_ID} \
  --data-file=-
```

#### 步骤 2: 授予 Cloud Run 服务访问权限

```bash
# 获取后端服务账号
BACKEND_SERVICE_ACCOUNT=$(gcloud run services describe print-main-backend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)")

# 授予后端服务访问 Secret Key 的权限
gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:${BACKEND_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=${PROJECT_ID}

# 授予后端服务访问 Publishable Key 的权限（如果需要）
gcloud secrets add-iam-policy-binding stripe-publishable-key \
  --member="serviceAccount:${BACKEND_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=${PROJECT_ID}

# 获取前端服务账号
FRONTEND_SERVICE_ACCOUNT=$(gcloud run services describe print-main-frontend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)")

# 授予前端服务访问 Publishable Key 的权限
gcloud secrets add-iam-policy-binding stripe-publishable-key \
  --member="serviceAccount:${FRONTEND_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=${PROJECT_ID}
```

#### 步骤 3: 更新后端服务环境变量

```bash
# 更新后端服务，使用 Secret Manager 中的密钥
gcloud run services update print-main-backend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest"
```

#### 步骤 4: 更新前端服务环境变量

```bash
# 方法 A: 直接设置环境变量（简单快速）
gcloud run services update print-main-frontend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --set-env-vars="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ"

# 方法 B: 使用 Secret Manager（推荐）
gcloud run services update print-main-frontend \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-secrets="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest"
```

---

## ✅ 验证配置

### 检查后端配置

```bash
# 检查后端服务的 Stripe 环境变量
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)" | grep STRIPE
```

应该看到：
- `STRIPE_SECRET_KEY=stripe-secret-key:latest`
- `STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest`（如果配置了）

### 检查前端配置

```bash
# 检查前端服务的 Stripe 环境变量
gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)" | grep STRIPE
```

应该看到：
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ`

### 检查 Secret Manager

```bash
# 列出 Stripe 相关的 Secrets
gcloud secrets list --project=moonlit-gamma-479502-r6 --filter="name:stripe*"
```

应该看到：
- `stripe-secret-key`
- `stripe-publishable-key`

---

## 🧪 测试支付功能

配置完成后，可以测试支付功能：

### 1. 访问前端网站

```
https://print-main-frontend-234065158862.us-central1.run.app
```

### 2. 测试结账流程

1. 添加商品到购物车
2. 进入结账页面
3. 使用 Stripe 测试卡号：
   - **卡号**: `4242 4242 4242 4242`
   - **过期日期**: 任何未来的日期（如 `12/25`）
   - **CVC**: 任意 3 位数字（如 `123`）
   - **邮编**: 任意 5 位数字（如 `12345`）

### 3. 查看后端日志

```bash
# 查看后端日志中的 Stripe 相关日志
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=print-main-backend AND \
  textPayload=~'stripe'" \
  --limit=50 \
  --project=moonlit-gamma-479502-r6 \
  --format=json
```

---

## 📝 配置完成后的检查清单

### 后端检查：
- [ ] `STRIPE_SECRET_KEY` 已配置到 Secret Manager
- [ ] 后端服务可以访问 Secret Manager
- [ ] 后端服务环境变量已更新

### 前端检查：
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 已配置
- [ ] 前端服务环境变量已更新

### 功能检查：
- [ ] 前端可以加载 Stripe Elements
- [ ] 可以创建支付 Intent
- [ ] 支付流程可以完成

---

## 🔒 安全提示

1. ✅ **使用测试密钥**: 当前配置使用的是测试密钥（`sk_test_*` 和 `pk_test_*`）
2. ✅ **密钥存储在 Secret Manager**: 密钥已安全存储在 GCP Secret Manager
3. ⚠️ **生产环境**: 上线前需要替换为生产密钥（`sk_live_*` 和 `pk_live_*`）

---

## 📚 相关文档

- [Stripe 配置状态](./Stripe配置状态.md)
- [Stripe 密钥配置完整指南](./Stripe密钥配置完整指南.md)
- [环境变量配置清单](./ENVIRONMENT-VARIABLES-CHECKLIST.md)
- [GCP 环境变量快速配置参考](./GCP-ENV-CONFIG-QUICK-REFERENCE.md)

---

**配置完成后，请删除或保护此文档，因为它包含真实的 Stripe 密钥。**

**最后更新：** 2025-01-29 13:30:00

