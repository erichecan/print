# 环境变量配置清单
# [2025-01-29 12:30:00] 完整的环境变量配置指南

## 📋 后端环境变量（Backend）

### 🔴 **必需变量（Required）**

#### 1. 数据库配置（Database）
```env
# Neon 数据库连接字符串（已提供）
DATABASE_URL=postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**说明：**
- 已提供完整的 Neon 数据库连接字符串，可以直接使用
- 系统会自动解析连接字符串，无需单独设置 DB_HOST、DB_USER 等
- Neon 数据库已包含 SSL 配置（sslmode=require）

#### 2. JWT 认证配置（Authentication）
```env
# JWT 密钥（必须修改为强随机字符串）
JWT_SECRET=your_very_long_and_random_secret_key_here_minimum_32_characters

# JWT 过期时间（可选，默认 7d）
JWT_EXPIRES_IN=7d
```

**生成 JWT_SECRET 命令：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. 应用配置（Application）
```env
# 运行环境
NODE_ENV=production

# 服务端口
PORT=3001

# 前端 URL（用于 CORS 和重定向）
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app

# CORS 允许的源（多个用逗号分隔）
CORS_ORIGINS=https://print-main-frontend-234065158862.us-central1.run.app
```

#### 4. Stripe 支付配置（Payment）
```env
# Stripe 密钥（测试或生产）
# 测试密钥已配置（查看 docs/STRIPE-KEYS-CONFIG-GUIDE.md 获取完整密钥）
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe 公钥（前端也需要）
STRIPE_PUBLISHABLE_KEY=pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ

# Stripe Webhook 密钥（可选，用于处理支付事件）
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**快速配置**: 
- 使用脚本: `./scripts/configure-stripe-keys-quick.sh`
- 详细指南: 查看 `docs/STRIPE-KEYS-CONFIG-GUIDE.md`

---

### 🟡 **可选变量（Optional）**

#### 日志和限流（Logging & Rate Limiting）
```env
# 日志级别
LOG_LEVEL=info

# 限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 离线订单配置（Offline Orders）
```env
# 离线订单文件限制
OFFLINE_ORDER_MAX_FILES=10
OFFLINE_ORDER_MAX_FILE_MB=50
```

#### 监控配置（Monitoring - Sentry）
```env
# Sentry DSN（错误追踪）
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### 云存储配置（Cloud Storage - AWS S3 或阿里云 OSS）
```env
# AWS S3（二选一）
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# 或 阿里云 OSS（二选一）
ALIYUN_OSS_REGION=oss-us-east-1
ALIYUN_OSS_ACCESS_KEY_ID=your_aliyun_key
ALIYUN_OSS_ACCESS_KEY_SECRET=your_aliyun_secret
ALIYUN_OSS_BUCKET=your-bucket-name
```

#### Redis 配置（Redis - 可选，用于缓存）
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📋 前端环境变量（Frontend）

### 🔴 **必需变量（Required）**

```env
# 后端 API 地址（必须是完整的 URL，包含 /api 路径）
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api

# Stripe 公钥（与后端保持一致）
# 测试密钥已配置（查看 docs/STRIPE-KEYS-CONFIG-GUIDE.md 获取完整密钥）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXv5iQxgV3jdkSBKxk9QeEvnR5NIgqBCVHdS64rgb4voDhBCmTC6mjkYPQbr9jARQJrrrow2uKdqUwHK8utdDhK00C9ySMWxJ
```

**重要提示：**
- `NEXT_PUBLIC_API_URL` 必须包含 `/api` 路径
- 当前后端地址：`https://print-main-backend-234065158862.us-central1.run.app/api` ✅
- 例如：`https://print-main-backend-234065158862.us-central1.run.app` ❌（缺少 /api）

---

### 🟡 **可选变量（Optional）**

```env
# 应用名称
NEXT_PUBLIC_APP_NAME=Print E-commerce

# Sentry 前端监控
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1

# 服务端 Sentry（如果使用）
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 📝 完整配置示例

### 后端 `.env` 文件示例

```env
# ==========================================
# 数据库配置
# ==========================================
DATABASE_URL=postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# ==========================================
# 应用配置
# ==========================================
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app
CORS_ORIGINS=https://print-main-frontend-234065158862.us-central1.run.app

# ==========================================
# JWT 认证
# ==========================================
JWT_SECRET=请生成一个至少32字符的随机字符串
JWT_EXPIRES_IN=7d

# ==========================================
# Stripe 支付
# ==========================================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ==========================================
# 日志和限流
# ==========================================
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# 监控（可选）
# ==========================================
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 前端 `.env.production` 或 Netlify 环境变量示例

```env
# ==========================================
# 后端 API 配置
# ==========================================
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api

# ==========================================
# Stripe 支付
# ==========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

---

## ✅ 配置检查清单

### 后端检查项：
- [ ] `DATABASE_URL` 已设置（Neon 连接字符串）
- [ ] `JWT_SECRET` 已设置（强随机字符串，至少32字符）
- [ ] `FRONTEND_URL` 已设置（前端域名）
- [ ] `CORS_ORIGINS` 已设置（允许的前端域名）
- [ ] `STRIPE_SECRET_KEY` 已设置（测试或生产密钥）
- [ ] `STRIPE_PUBLISHABLE_KEY` 已设置（与前端一致）

### 前端检查项：
- [ ] `NEXT_PUBLIC_API_URL` 已设置（包含 /api 路径）
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 已设置（与后端一致）

---

## 🔧 快速配置步骤

### 1. 生成 JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出结果，设置到后端环境变量 `JWT_SECRET`。

### 2. 配置后端环境变量

根据你的部署平台（Render/Netlify/GCP）设置后端环境变量。

**如果使用 Render：**
1. 进入 Dashboard → 你的服务 → Environment
2. 添加所有必需的环境变量

**如果使用 Netlify（前端）：**
1. 进入 Site settings → Environment variables
2. 添加 `NEXT_PUBLIC_API_URL` 和 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 3. 测试数据库连接

```bash
# 测试连接
psql 'postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

### 4. 运行数据库迁移

```bash
cd backend
# 如果使用 Prisma
npx prisma migrate deploy

# 或者如果使用 Sequelize
npm run db:migrate
```

---

## ⚠️ 常见问题

### 1. 数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- Neon 数据库已启用 SSL，连接字符串包含 `sslmode=require`
- 检查网络防火墙是否允许连接

### 2. CORS 错误
- 确保 `CORS_ORIGINS` 包含所有前端域名
- 确保 `FRONTEND_URL` 设置正确
- 多个域名用逗号分隔

### 3. API 请求失败（ERR_CONNECTION_REFUSED）
- 检查前端 `NEXT_PUBLIC_API_URL` 是否设置
- 确保 URL 包含 `/api` 路径
- 检查后端服务是否运行

### 4. JWT 认证失败
- 确保 `JWT_SECRET` 已设置且足够长（至少32字符）
- 前后端必须使用相同的 JWT_SECRET（如果共享密钥）

---

## 📚 相关文档

- [环境变量说明](./ENVIRONMENT-VARIABLES.md)
- [API 配置修复](./API_CONFIG_FIX.md)
- [部署指南](./DEPLOYMENT-GUIDE.md)
- [Netlify 环境变量配置](./NETLIFY_ENV_VARS_GUIDE.md)
- [Stripe 密钥配置指南](./STRIPE-KEYS-CONFIG-GUIDE.md) - ⭐ **新：包含已提供的 Stripe 密钥**
- [GCP 环境变量快速配置参考](./GCP-ENV-CONFIG-QUICK-REFERENCE.md)

---

**最后更新：** 2025-01-29 12:30:00

