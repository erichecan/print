# 登录 500 错误修复指南
[2025-12-18 16:20:00] 诊断和修复登录 API 返回 500 错误

## 🔍 问题诊断

### 错误现象
- 前端点击登录按钮后，收到 `POST /api/auth/login 500 (Internal Server Error)`
- 后端返回错误：`{"error": "Database error", "details": "Internal server error"}`

### 诊断结果
1. ✅ 后端服务器健康检查通过（200）
2. ❌ 登录 API 返回 500 错误
3. ❌ 错误原因：数据库连接问题

## 🔧 修复步骤

### 1. 检查后端环境变量配置

在 GCP Cloud Run 后端服务中，确保以下环境变量和 Secrets 已正确配置：

#### 必需的环境变量：
```bash
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app
```

#### 必需的 Secrets（通过 Secret Manager）：
```bash
DATABASE_URL=postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=<至少32字符的随机字符串>
STRIPE_SECRET_KEY=<Stripe密钥>
```

### 2. 验证 Secret Manager 配置

```bash
# 检查 DATABASE_URL secret
gcloud secrets versions access latest --secret=database-url --project=moonlit-gamma-479502-r6

# 检查 JWT_SECRET secret
gcloud secrets versions access latest --secret=jwt-secret --project=moonlit-gamma-479502-r6
```

### 3. 检查后端服务日志

```bash
# 查看后端服务日志
gcloud run services logs read print-main-backend \
  --region us-central1 \
  --project moonlit-gamma-479502-r6 \
  --limit 50
```

查找以下错误信息：
- `DATABASE_URL environment variable is not set`
- `Failed to create Prisma Client`
- `Database connection error`
- `P1001: Can't reach database server`

### 4. 更新后端服务配置

如果发现 Secrets 未正确配置，使用以下命令更新：

```bash
# 更新 DATABASE_URL
echo -n "postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" | \
  gcloud secrets versions add database-url --data-file=- \
  --project=moonlit-gamma-479502-r6

# 更新 JWT_SECRET（如果未设置）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | \
  gcloud secrets versions add jwt-secret --data-file=- \
  --project=moonlit-gamma-479502-r6
```

### 5. 重新部署后端服务

```bash
# 重新部署后端服务以应用新的 Secrets
gcloud run deploy print-main-backend \
  --image us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main-artifacts/backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --project moonlit-gamma-479502-r6
```

### 6. 验证修复

1. 等待后端服务重新部署完成（约 1-2 分钟）
2. 运行诊断脚本：
   ```bash
   node scripts/diagnose-login-500.js
   ```
3. 在前端页面尝试登录，应该不再出现 500 错误

## 📋 常见问题

### Q: 为什么会出现 "Database error"？
A: 这通常是因为：
- `DATABASE_URL` Secret 未正确配置
- 数据库连接字符串格式错误
- 数据库服务器无法访问（网络问题）
- Prisma Client 初始化失败

### Q: 如何确认 DATABASE_URL 是否正确？
A: 使用以下命令测试数据库连接：
```bash
# 从 Secret Manager 读取 DATABASE_URL
DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url --project=moonlit-gamma-479502-r6)

# 使用 psql 测试连接
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Q: 前端环境变量也需要配置吗？
A: 是的，前端也需要配置 `NEXT_PUBLIC_API_URL` 指向后端 API：
```bash
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api
```

## ✅ 验证清单

- [ ] 后端服务健康检查通过（200）
- [ ] DATABASE_URL Secret 已正确配置
- [ ] JWT_SECRET Secret 已正确配置
- [ ] 后端服务日志中没有数据库连接错误
- [ ] 登录 API 不再返回 500 错误
- [ ] 前端可以成功调用登录 API

