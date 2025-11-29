# Stripe 密钥配置完整指南

**更新时间**: 2025-11-28 17:25:00

---

## 关于 Stripe 密钥

⚠️ **安全提示**: 请**不要**在聊天或公开场合直接发送 Stripe 密钥。应该通过以下安全方式配置。

---

## 配置方法

### 方法 1: 使用提供的脚本（推荐）

如果您有 Stripe 密钥，可以使用我们提供的脚本快速配置：

```bash
# 配置 Stripe Secret Key 和 Publishable Key
./scripts/configure-stripe-secret.sh sk_test_your_secret_key pk_test_your_publishable_key

# 或者只配置 Secret Key
./scripts/configure-stripe-secret.sh sk_test_your_secret_key
```

脚本会自动：
1. 创建 GCP Secret Manager 中的密钥
2. 授予 Cloud Run 服务访问权限
3. 更新 Cloud Run 服务环境变量

---

### 方法 2: 手动配置 GCP Secret Manager

#### 步骤 1: 创建 Secret

```bash
# 创建 Stripe Secret Key
echo "sk_test_your_stripe_secret_key_here" | \
  gcloud secrets create stripe-secret-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=-

# 创建 Stripe Publishable Key（可选）
echo "pk_test_your_stripe_publishable_key_here" | \
  gcloud secrets create stripe-publishable-key \
  --project=moonlit-gamma-479502-r6 \
  --data-file=-
```

#### 步骤 2: 授予访问权限

```bash
# 获取服务账号
SERVICE_ACCOUNT=$(gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.serviceAccountName)")

# 授予访问权限
gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=moonlit-gamma-479502-r6

gcloud secrets add-iam-policy-binding stripe-publishable-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=moonlit-gamma-479502-r6
```

#### 步骤 3: 更新 Cloud Run 服务

```bash
gcloud run services update print-main-backend \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest" \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

### 方法 3: 直接在环境变量中设置（临时测试，不推荐生产环境）

```bash
gcloud run services update print-main-backend \
  --set-env-vars="STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here,STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here" \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6
```

---

## 配置本地测试环境

### 创建 `.env.test` 文件

在项目根目录创建 `apps/web/.env.test`：

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 或者在运行测试时传递环境变量

```bash
cd apps/web
STRIPE_SECRET_KEY=sk_test_your_key STRIPE_PUBLISHABLE_KEY=pk_test_your_key npm run test:gcp -- checkout-payment.spec.ts
```

---

## 验证配置

### 检查 GCP Secret Manager

```bash
# 列出所有 Stripe 相关的 Secret
gcloud secrets list --project=moonlit-gamma-479502-r6 --filter="name:stripe*"
```

### 检查 Cloud Run 服务环境变量

```bash
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)" | grep STRIPE
```

### 测试支付功能

运行支付测试：

```bash
cd apps/web
npm run test:gcp -- checkout-payment.spec.ts
```

---

## 支付测试重点

配置好 Stripe 密钥后，以下测试将重点验证：

1. ✅ **创建支付 Intent** - 验证后端 API 正常工作
2. ✅ **处理 Stripe 支付表单** - 验证前端支付表单集成
3. ✅ **验证支付成功后的订单创建** - 验证完整支付流程
4. ✅ **检查后台订单显示** - 验证订单管理功能

---

## 安全最佳实践

1. ✅ **使用测试密钥** - 确保使用 `sk_test_*` 和 `pk_test_*` 格式的测试密钥
2. ✅ **不要提交到 Git** - 确保 `.env` 和 `.env.test` 在 `.gitignore` 中
3. ✅ **使用 Secret Manager** - 生产环境应该使用 GCP Secret Manager，而不是环境变量
4. ✅ **定期轮换密钥** - 定期更新密钥以提高安全性

---

## 如果您有 Stripe 密钥

请按以下方式提供：

1. **使用脚本配置**（推荐）:
   ```bash
   ./scripts/configure-stripe-secret.sh sk_test_xxxxx pk_test_xxxxx
   ```

2. **或者告诉我您希望我帮您配置**，我可以指导您完成每一步

3. **不要直接在聊天中发送密钥**，避免安全风险

---

**最后更新**: 2025-11-28 17:25:00

