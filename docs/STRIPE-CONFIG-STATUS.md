# Stripe 配置状态和快速配置指南
# [2025-01-29 13:30:00] 当前配置状态

## 📋 Stripe 密钥信息

### 测试密钥（已提供）

- **Publishable Key**: `pk_test_xxxxxxxxxxxxx` (请使用实际的密钥)
- **Secret Key**: `sk_test_xxxxxxxxxxxxx` (请使用实际的密钥)

**状态**: ⚠️ 待配置到 GCP

---

## 🚀 快速配置

### 步骤 1: 登录 GCP

```bash
gcloud auth login
gcloud config set project moonlit-gamma-479502-r6
```

### 步骤 2: 运行配置脚本

```bash
cd /Users/apony-it/Downloads/print-main
./scripts/configure-stripe-keys-quick.sh
```

脚本将自动：
1. ✅ 创建/更新 GCP Secret Manager 中的 Stripe 密钥
2. ✅ 授予 Cloud Run 服务访问权限
3. ✅ 更新后端和前端服务的环境变量

### 步骤 3: 验证配置

```bash
# 检查 Secret Manager
gcloud secrets list --project=moonlit-gamma-479502-r6 --filter="name:stripe*"

# 检查后端服务配置
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)" | grep STRIPE

# 检查前端服务配置
gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)" | grep STRIPE
```

---

## 📝 手动配置（如果脚本无法使用）

详细的手动配置步骤请参考: [Stripe 密钥配置指南](./STRIPE-KEYS-CONFIG-GUIDE.md)

---

## ✅ 配置完成后的检查清单

### 后端服务 (`print-main-backend`)
- [ ] `STRIPE_SECRET_KEY` 已配置到 Secret Manager
- [ ] 后端服务可以访问 Secret Manager
- [ ] 后端服务环境变量已更新

### 前端服务 (`print-main-frontend`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 已配置
- [ ] 前端服务环境变量已更新
- [ ] ⚠️ 前端需要重新部署才能生效（NEXT_PUBLIC_* 变量在构建时注入）

---

## 🧪 测试支付功能

### 使用 Stripe 测试卡

配置完成后，可以使用以下测试卡号测试支付：

- **卡号**: `4242 4242 4242 4242`
- **过期日期**: 任何未来的日期（如 `12/25`）
- **CVC**: 任意 3 位数字（如 `123`）
- **邮编**: 任意 5 位数字（如 `12345`）

### 测试步骤

1. 访问前端网站: https://print-main-frontend-234065158862.us-central1.run.app
2. 添加商品到购物车
3. 进入结账页面
4. 使用上述测试卡号完成支付

---

## 📚 相关文档

- [Stripe 密钥配置指南](./STRIPE-KEYS-CONFIG-GUIDE.md) - 完整配置步骤
- [环境变量配置清单](./ENVIRONMENT-VARIABLES-CHECKLIST.md)
- [GCP 环境变量快速配置参考](./GCP-ENV-CONFIG-QUICK-REFERENCE.md)

---

**最后更新：** 2025-01-29 13:30:00

