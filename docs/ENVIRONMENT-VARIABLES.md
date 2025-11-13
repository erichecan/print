# Environment Variables Configuration Guide

本文档详细说明项目所需的所有环境变量及其配置方法。

**最后更新**: [2025-11-05 01:20:00]

---

## 📋 目录

1. [后端环境变量 (Backend)](#后端环境变量-backend)
2. [前端环境变量 (Frontend)](#前端环境变量-frontend)
3. [快速配置指南](#快速配置指南)
4. [生产环境配置](#生产环境配置)
5. [安全最佳实践](#安全最佳实践)

---

## 后端环境变量 (Backend)

后端环境变量应配置在 `backend/.env` 文件中。

### 🔴 必需变量 (Required)

#### 数据库配置 (Database)

```env
# PostgreSQL 数据库连接 URL
# 格式: postgresql://用户名:密码@主机:端口/数据库名
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/suvernireplus

# 或者单独配置各个部分（用于 Sequelize CLI）
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=suvernireplus
```

**说明**:
- `DATABASE_URL` 是 Prisma 使用的连接字符串（优先级最高）
- 如果使用 Sequelize，可以使用单独的 `DB_*` 变量
- **⚠️ 生产环境**: 密码应使用强密码，且不应提交到版本控制

**获取方式**:
- 本地开发: 在安装 PostgreSQL 时设置的密码
- 生产环境: 使用数据库提供商（如 AWS RDS, Heroku Postgres）提供的连接字符串

---

#### JWT 认证配置 (Authentication)

```env
# JWT 密钥（用于签名和验证 token）
# ⚠️ 必须使用强随机字符串（至少 32 字符）
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# JWT Token 过期时间（可选，默认 7d）
JWT_EXPIRES_IN=7d
```

**说明**:
- `JWT_SECRET`: 用于签名 JWT token，**必须保密**
- 生成强密钥的方法:
  ```bash
  # 使用 Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # 或使用 openssl
  openssl rand -hex 32
  ```

---

#### Stripe 支付配置 (Payment)

```env
# Stripe API 密钥（Secret Key）
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz...

# Stripe 公钥（Publishable Key，用于前端）
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz...

# Stripe Webhook 密钥（用于验证 webhook 请求）
STRIPE_WEBHOOK_SECRET=whsec_...
```

**说明**:
- **测试环境**: 使用 `sk_test_...` 和 `pk_test_...` 前缀的密钥
- **生产环境**: 使用 `sk_live_...` 和 `pk_live_...` 前缀的密钥
- **获取方式**:
  1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
  2. 进入 **Developers** → **API keys**
  3. 复制相应的密钥
- **Webhook Secret**:
  1. 在 Stripe Dashboard 中创建 Webhook 端点
  2. 配置 URL: `https://yourdomain.com/api/webhooks/stripe`
  3. 复制 Webhook signing secret (`whsec_...`)

---

#### 应用配置 (Application)

```env
# 应用运行端口（默认 3000）
PORT=3000

# 运行环境
NODE_ENV=development  # development | production | test

# 前端 URL（用于 CORS 配置）
FRONTEND_URL=http://localhost:8080
```

**说明**:
- `NODE_ENV`: 
  - `development`: 开发环境（启用详细日志、热重载等）
  - `production`: 生产环境（优化性能、最小化日志）
  - `test`: 测试环境

---

### 🟡 可选变量 (Optional)

#### CORS 配置

```env
# CORS 允许的来源（多个用逗号分隔）
CORS_ORIGINS=http://localhost:8080,https://yourdomain.com
```

---

#### 速率限制 (Rate Limiting)

```env
# 速率限制窗口时间（毫秒，默认 60000 = 1 分钟）
RATE_LIMIT_WINDOW_MS=60000

# 每个窗口允许的最大请求数（默认 100）
RATE_LIMIT_MAX_REQUESTS=100
```

---

#### 日志配置 (Logging)

```env
# 日志级别
LOG_LEVEL=info  # error | warn | info | debug

# 日志文件路径（可选）
LOG_FILE=logs/app.log
```

---

#### 会话配置 (Session)

```env
# Session 密钥（用于签名 session cookie）
# 如果未设置，将使用 JWT_SECRET
SESSION_SECRET=your_session_secret_key
```

---

#### 邮件服务配置 (Email - 可选，Phase 2)

```env
# 邮件服务提供商（例如: sendgrid, resend, nodemailer）
EMAIL_PROVIDER=sendgrid

# SendGrid API Key
SENDGRID_API_KEY=SG.xxxxx

# 或使用 Resend
RESEND_API_KEY=re_xxxxx

# 发件人邮箱
EMAIL_FROM=noreply@yourdomain.com
```

---

## 前端环境变量 (Frontend)

前端环境变量应配置在 `apps/web/.env.local` 文件中。

### 🔴 必需变量 (Required)

```env
# 后端 API 基础 URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Stripe 公钥（用于前端 Stripe Elements）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz...
```

**说明**:
- `NEXT_PUBLIC_*` 前缀的变量会暴露给浏览器，**不要**在其中存储敏感信息
- 生产环境应使用 HTTPS URL

---

### 🟡 可选变量 (Optional)

```env
# 应用名称
NEXT_PUBLIC_APP_NAME=Suvernire Plus

# 应用 URL（用于生成链接）
NEXT_PUBLIC_APP_URL=http://localhost:8080
```

---

## 快速配置指南

### 1. 开发环境设置

#### 步骤 1: 创建后端 `.env` 文件

```bash
cd backend
cp .env.example .env  # 如果存在
```

#### 步骤 2: 配置数据库连接

编辑 `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/suvernireplus
DB_PASSWORD=你的密码
```

#### 步骤 3: 生成 JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将输出复制到 `JWT_SECRET`:

```env
JWT_SECRET=<生成的密钥>
```

#### 步骤 4: 配置 Stripe 密钥

1. 在 [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) 获取测试密钥
2. 添加到 `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 步骤 5: 创建前端 `.env.local` 文件

```bash
cd apps/web
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOF
```

---

### 2. 完整的 `.env.example` 模板

**`backend/.env.example`**:

```env
# ============================================
# 数据库配置
# ============================================
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/suvernireplus
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=suvernireplus

# ============================================
# JWT 认证配置
# ============================================
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d

# ============================================
# Stripe 支付配置
# ============================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# 应用配置
# ============================================
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

# ============================================
# 可选配置
# ============================================
# CORS_ORIGINS=http://localhost:8080
# RATE_LIMIT_WINDOW_MS=60000
# RATE_LIMIT_MAX_REQUESTS=100
# LOG_LEVEL=info
# SESSION_SECRET=your_session_secret
```

**`apps/web/.env.local.example`**:

```env
# ============================================
# API 配置
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ============================================
# Stripe 配置（前端）
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ============================================
# 应用配置（可选）
# ============================================
# NEXT_PUBLIC_APP_NAME=Suvernire Plus
# NEXT_PUBLIC_APP_URL=http://localhost:8080
```

---

## 生产环境配置

### 安全清单

- [ ] ✅ 使用强随机密码（数据库、JWT）
- [ ] ✅ 使用 Stripe 生产密钥（`sk_live_...`）
- [ ] ✅ 启用 HTTPS
- [ ] ✅ 设置 `NODE_ENV=production`
- [ ] ✅ 配置正确的 `FRONTEND_URL` 和 `CORS_ORIGINS`
- [ ] ✅ 不要在代码中硬编码密钥
- [ ] ✅ 使用环境变量管理工具（如 Vercel、Heroku、AWS Secrets Manager）
- [ ] ✅ 定期轮换密钥
- [ ] ✅ 启用数据库 SSL 连接
- [ ] ✅ 配置 Webhook URL 为生产域名

### 生产环境示例配置

```env
# 生产环境 .env
NODE_ENV=production
PORT=3000

# 数据库（使用生产数据库）
DATABASE_URL=postgresql://user:strong_password@prod-db.example.com:5432/suvernireplus?sslmode=require

# JWT（使用强随机密钥）
JWT_SECRET=<强随机生成的密钥>

# Stripe（生产密钥）
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS（仅允许生产域名）
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# 日志
LOG_LEVEL=warn
```

---

## 安全最佳实践

### 1. 密钥管理

❌ **不要**:
- 将 `.env` 文件提交到 Git
- 在代码中硬编码密钥
- 在公开的聊天/邮件中分享密钥
- 使用弱密码或默认密码

✅ **应该**:
- 使用 `.env.example` 作为模板（不含真实密钥）
- 使用密钥管理服务（AWS Secrets Manager, HashiCorp Vault）
- 定期轮换密钥
- 为不同环境使用不同密钥

### 2. `.gitignore` 配置

确保以下文件在 `.gitignore` 中:

```
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

### 3. 密钥生成

使用以下方法生成强密钥:

```bash
# 生成 32 字节的随机密钥（用于 JWT_SECRET）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 64 字节的随机密钥（用于更强的安全性）
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 使用 openssl
openssl rand -hex 32
```

---

## 验证配置

### 检查后端配置

```bash
cd backend

# 检查 .env 文件是否存在
ls -la .env

# 检查数据库连接（需要 Node.js）
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ 已设置' : '✗ 未设置')"

# 检查 JWT Secret
node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ 已设置 (' + process.env.JWT_SECRET.length + ' 字符)' : '✗ 未设置')"
```

### 检查前端配置

```bash
cd apps/web

# 检查 .env.local 文件
ls -la .env.local

# 检查 API URL
node -e "console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || '未设置')"
```

---

## 常见问题 (FAQ)

### Q: 如何重置忘记的数据库密码？

A: 
1. 编辑 `backend/.env` 中的 `DB_PASSWORD`
2. 更新 `DATABASE_URL` 中的密码（需要 URL 编码）
3. 重启后端服务

### Q: Stripe Webhook 本地测试如何配置？

A: 使用 Stripe CLI:

```bash
# 安装 Stripe CLI
# https://stripe.com/docs/stripe-cli

# 转发 webhook 到本地服务器
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 复制输出的 webhook secret 到 .env
```

### Q: 如何在不同环境使用不同的配置？

A: 
- 使用 `.env.development`, `.env.production`, `.env.test`
- 或使用环境变量管理工具（如 Vercel、Heroku）
- 确保 `.env.example` 包含所有必需变量

### Q: JWT_SECRET 泄露了怎么办？

A: 
1. **立即** 生成新的 JWT_SECRET
2. 更新所有环境（开发、测试、生产）
3. 强制所有用户重新登录（现有 token 将失效）
4. 检查是否有异常活动

---

## 相关文档

- [Prisma 配置文档](https://www.prisma.io/docs/reference/api-reference/environment-variables-reference)
- [Stripe API 密钥文档](https://stripe.com/docs/keys)
- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
- [项目安装指南](./INSTALLATION-STEPS.md)

---

**最后更新**: [2025-11-05 01:20:00]
