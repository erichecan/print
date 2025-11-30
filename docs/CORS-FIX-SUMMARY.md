# CORS 和 API 连接问题修复总结
# [2025-01-29 14:30:00]

## 🔍 发现的问题

### 1. CORS 错误
- **错误信息**: `Access to fetch at 'https://print-main-backend-234065158862.us-central1.run.app/api/...' from origin 'https://print-main-frontend-234065158862.us-central1.run.app' has been blocked by CORS policy`
- **原因**: 后端服务缺少 `FRONTEND_URL` 环境变量，CORS 配置未生效

### 2. 后端服务 500/503 错误
- **错误信息**: `prisma:error Invalid prisma.category.findMany() invocation: Error validating datasource db: the URL must start with the protocol prisma://`
- **原因**: Prisma Client 配置错误，在运行时设置了不应该设置的 `datasources`

### 3. 数据无法加载
- 首页的类目数据无法加载
- 商品列表页的商品数据无法加载

## ✅ 已完成的修复

### 1. 修复 Prisma 配置
**文件**: `backend/src/lib/prisma.js`
- ❌ 移除了错误的 `datasources` 配置
- ✅ Prisma Client 现在直接从环境变量 `DATABASE_URL` 读取配置

### 2. 更新后端服务配置
- ✅ 添加 `FRONTEND_URL` 环境变量到后端服务
- ✅ 更新 `cloudbuild.yaml` 确保部署时包含 `FRONTEND_URL`

### 3. 更新前端 API URL
- ✅ 更新 Secret Manager 中的 `api-url` secret
- ✅ 前端服务已配置使用 `NEXT_PUBLIC_API_URL` secret

## 🔧 配置详情

### 后端服务环境变量
```bash
FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app
NODE_ENV=production
AUTO_MIGRATE=true
```

### 前端服务环境变量
```bash
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api
```

### CORS 配置
后端已配置允许所有 `.run.app` 域名：
```javascript
if (origin.endsWith('.run.app')) {
  callback(null, true); // 允许所有 Cloud Run 域名
}
```

## 📊 当前状态

### 后端服务
- **URL**: `https://print-main-backend-234065158862.us-central1.run.app`
- **CORS**: ✅ 已配置，返回正确的 CORS 头
- **状态**: ⏳ 新部署进行中（修复 Prisma 配置）

### 前端服务
- **URL**: `https://print-main-frontend-234065158862.us-central1.run.app`
- **API URL**: 已配置从 Secret Manager 读取

## 🚀 新部署

**构建 ID**: `0dddc675-a6d5-41f8-88d2-80958f941a31`

**包含的修复**:
- ✅ Prisma 配置修复
- ✅ FRONTEND_URL 环境变量
- ✅ CORS 配置完善

**查看部署状态**:
```bash
gcloud builds describe 0dddc675-a6d5-41f8-88d2-80958f941a31 --project=moonlit-gamma-479502-r6
```

## ⏳ 等待部署完成

部署完成后，应该可以：
- ✅ 前端正常访问后端 API
- ✅ 类目数据正常加载
- ✅ 商品列表数据正常加载
- ✅ CORS 错误消失

---

**修复时间**: 2025-01-29 14:30:00

