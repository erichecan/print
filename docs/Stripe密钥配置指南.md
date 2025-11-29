# Stripe 密钥配置指南

**更新时间**: 2025-11-28 17:15:00

---

## 配置 Stripe 密钥用于支付测试

### 方法 1: 本地测试环境变量（推荐用于本地测试）

创建或编辑 `.env.test` 文件（在项目根目录）：

```bash
# Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 方法 2: GCP Secret Manager（用于生产/测试环境）

1. **创建 Secret**:
```bash
# 设置 Stripe 密钥到 GCP Secret Manager
gcloud secrets create stripe-secret-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=- <<< "sk_test_your_stripe_secret_key_here"

gcloud secrets create stripe-publishable-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=- <<< "pk_test_your_stripe_publishable_key_here"
```

2. **授予 Cloud Run 服务访问权限**:
```bash
gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@moonlit-gamma-479502-r6.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=moonlit-gamma-479502-r6
```

3. **在 Cloud Run 服务中配置环境变量**:
```bash
gcloud run services update print-main-backend \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest" \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

### 方法 3: 直接在 Cloud Run 环境变量中设置（临时测试）

```bash
gcloud run services update print-main-backend \
  --set-env-vars="STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here" \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

## 配置测试环境变量文件

### 对于 Playwright 测试

创建或编辑 `apps/web/.env.test` 文件：

```bash
# Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

或者使用环境变量：

```bash
export STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
export STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# 然后运行测试
cd apps/web
npm run test:gcp
```

---

## 安全建议

⚠️ **重要**: 
- **不要**将 Stripe 密钥提交到 Git 仓库
- **不要**在代码中硬编码密钥
- 使用 **测试密钥** (`sk_test_*`) 进行测试，不要使用生产密钥
- 将 `.env` 和 `.env.test` 添加到 `.gitignore`

---

## 验证配置

运行以下命令验证 Stripe 密钥是否配置正确：

```bash
# 检查后端服务环境变量
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)"

# 或者运行测试检查
cd apps/web
STRIPE_SECRET_KEY=sk_test_your_key npm run test:gcp -- checkout-payment.spec.ts
```

---

## 支付测试重点

配置好 Stripe 密钥后，以下测试将重点验证：

1. ✅ 创建支付 Intent
2. ✅ 处理 Stripe 支付表单
3. ✅ 验证支付成功后的订单创建
4. ✅ 检查后台订单显示

---

**最后更新**: 2025-11-28 17:15:00

