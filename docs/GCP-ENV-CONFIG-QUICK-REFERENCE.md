# GCP 环境变量快速配置参考
# [2025-01-29 13:00:00] 基于实际部署地址的快速配置指南

## 🔗 服务地址

- **前端**: https://print-main-frontend-234065158862.us-central1.run.app/
- **后端**: https://print-main-backend-234065158862.us-central1.run.app
- **后端 API**: https://print-main-backend-234065158862.us-central1.run.app/api

---

## 🔴 后端必需环境变量（Backend）

### 在 GCP Cloud Run 后端服务中配置：

```env
# ==========================================
# 数据库配置（已提供）
# ==========================================
DATABASE_URL=postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# ==========================================
# JWT 认证（需要生成）
# ==========================================
JWT_SECRET=<生成一个至少32字符的随机字符串>

# 生成命令：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN=7d

# ==========================================
# 应用配置
# ==========================================
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app
CORS_ORIGINS=https://print-main-frontend-234065158862.us-central1.run.app

# ==========================================
# Stripe 支付
# ==========================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 🔴 前端必需环境变量（Frontend）

### 在 GCP Cloud Run 前端服务中配置：

```env
# ==========================================
# 后端 API 地址
# ==========================================
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api

# ==========================================
# Stripe 公钥（与后端保持一致）
# ==========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## 📝 GCP Cloud Run 配置步骤

### 方式 1：使用 GCP Console（推荐）

#### 后端服务配置：

1. 访问 [GCP Cloud Run Console](https://console.cloud.google.com/run)
2. 选择 `print-main-backend` 服务
3. 点击 **"编辑和部署新版本"**
4. 切换到 **"变量和密钥"** 标签
5. 添加以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `JWT_SECRET` | `<生成的值>` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `FRONTEND_URL` | `https://print-main-frontend-234065158862.us-central1.run.app` |
| `CORS_ORIGINS` | `https://print-main-frontend-234065158862.us-central1.run.app` |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（可选）|

#### 前端服务配置：

1. 选择 `print-main-frontend` 服务
2. 点击 **"编辑和部署新版本"**
3. 切换到 **"变量和密钥"** 标签
4. 添加以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | `https://print-main-backend-234065158862.us-central1.run.app/api` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...`（与后端相同）|

---

### 方式 2：使用 gcloud CLI

#### 更新后端服务：

```bash
# 生成 JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 更新后端环境变量
gcloud run services update print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="PORT=3001" \
  --set-env-vars="DATABASE_URL=postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" \
  --set-env-vars="JWT_SECRET=${JWT_SECRET}" \
  --set-env-vars="JWT_EXPIRES_IN=7d" \
  --set-env-vars="FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app" \
  --set-env-vars="CORS_ORIGINS=https://print-main-frontend-234065158862.us-central1.run.app" \
  --set-env-vars="STRIPE_SECRET_KEY=sk_test_..." \
  --set-env-vars="STRIPE_PUBLISHABLE_KEY=pk_test_..."
```

#### 更新前端服务：

```bash
gcloud run services update print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api" \
  --set-env-vars="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
```

---

### 方式 3：使用 GCP Secret Manager（推荐用于敏感信息）

#### 创建 Secret：

```bash
# 生成 JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 创建 Secrets
echo -n "postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" | \
  gcloud secrets create database-url --data-file=- --project=moonlit-gamma-479502-r6

echo -n "${JWT_SECRET}" | \
  gcloud secrets create jwt-secret --data-file=- --project=moonlit-gamma-479502-r6

echo -n "sk_test_..." | \
  gcloud secrets create stripe-secret-key --data-file=- --project=moonlit-gamma-479502-r6
```

#### 在服务中引用 Secret：

```bash
# 后端服务
gcloud run services update print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --update-secrets=DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest
```

---

## ✅ 配置检查清单

### 后端检查：

- [ ] `DATABASE_URL` 已设置（Neon 连接字符串）
- [ ] `JWT_SECRET` 已设置（至少32字符）
- [ ] `FRONTEND_URL` = `https://print-main-frontend-234065158862.us-central1.run.app`
- [ ] `CORS_ORIGINS` = `https://print-main-frontend-234065158862.us-central1.run.app`
- [ ] `STRIPE_SECRET_KEY` 和 `STRIPE_PUBLISHABLE_KEY` 已设置

### 前端检查：

- [ ] `NEXT_PUBLIC_API_URL` = `https://print-main-backend-234065158862.us-central1.run.app/api`（包含 /api）
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 已设置（与后端相同）

---

## 🧪 验证配置

### 1. 检查后端环境变量：

```bash
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)"
```

### 2. 检查前端环境变量：

```bash
gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --format="value(spec.template.spec.containers[0].env)"
```

### 3. 测试 API 连接：

```bash
# 测试后端健康检查
curl https://print-main-backend-234065158862.us-central1.run.app/api/health

# 测试前端是否连接到正确的后端
curl https://print-main-frontend-234065158862.us-central1.run.app
# 检查浏览器控制台，确认 API 请求指向正确的地址
```

---

## 📚 相关文档

- [完整环境变量配置清单](./ENVIRONMENT-VARIABLES-CHECKLIST.md)
- [GCP 部署指南](./GCP-DEPLOYMENT.md)
- [部署状态](./部署状态.md)

---

**最后更新：** 2025-01-29 13:00:00

