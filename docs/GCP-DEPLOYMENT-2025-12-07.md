# GCP 部署完成报告
[2025-12-07 13:45:00] 部署到 Google Cloud Platform Cloud Run

## ✅ 部署状态

### 部署信息
- **项目 ID**: `moonlit-gamma-479502-r6`
- **区域**: `us-central1`
- **构建 ID**: `b5d8a549-dc56-4f0e-9556-cc23a87bd849`
- **构建状态**: ✅ SUCCESS
- **构建时间**: 3分38秒

### 服务 URL

#### 后端服务
- **服务名称**: `print-main-backend`
- **主要 URL**: `https://print-main-backend-234065158862.us-central1.run.app`
- **实际 URL**: `https://print-main-backend-hsbqzlnkxa-uc.a.run.app`
- **API 端点**: `https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api`
- **状态**: ✅ Ready

#### 前端服务
- **服务名称**: `print-main-frontend`
- **主要 URL**: `https://print-main-frontend-234065158862.us-central1.run.app`
- **实际 URL**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`
- **状态**: ✅ Ready (HTTP 200)

### 部署配置

#### 后端配置
- **内存**: 512Mi
- **CPU**: 1
- **最小实例数**: 0 (免费层)
- **最大实例数**: 5
- **超时**: 300秒
- **平台**: Cloud Run (managed)

#### 前端配置
- **内存**: 1Gi
- **CPU**: 1
- **最小实例数**: 0 (免费层)
- **最大实例数**: 5
- **超时**: 600秒
- **平台**: Cloud Run (managed)

## 🔧 环境变量配置

### 后端环境变量
- `NODE_ENV=production`
- `AUTO_MIGRATE=true`
- `FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app`
- `GCP_IMAGE_BUCKET=print-main-product-images`
- `GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images`
- `APP_BUILD_SHA` (构建时注入)
- `APP_BUILD_TIME` (构建时注入)

### 后端 Secrets
- `DATABASE_URL` (从 Secret Manager)
- `JWT_SECRET` (从 Secret Manager)
- `STRIPE_SECRET_KEY` (从 Secret Manager)

### 前端环境变量
- `NODE_ENV=production`

### 前端 Secrets
- `NEXT_PUBLIC_API_URL` (从 Secret Manager，应指向后端 API)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (从 Secret Manager)

## 📊 构建信息

### 构建版本
- **Git SHA**: 构建时自动注入
- **构建时间**: 构建时自动注入

### Docker 镜像
- **后端镜像**: `us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest`
- **前端镜像**: `us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/frontend:latest`

## 🔍 验证步骤

### 1. 前端访问
```bash
curl https://print-main-frontend-hsbqzlnkxa-uc.a.run.app
```
✅ 状态: HTTP 200

### 2. 后端 API 测试
```bash
# 测试产品 API
curl https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/products?limit=1

# 测试健康检查（如果存在）
curl https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/health
```

### 3. 前端 API 代理测试
访问前端后，检查浏览器控制台，确认：
- ✅ API 请求成功
- ✅ 没有 CORS 错误
- ✅ 没有连接错误

## ⚠️ 重要注意事项

### API URL 配置
前端服务使用 Secret Manager 中的 `api-url` secret 来配置 `NEXT_PUBLIC_API_URL`。

**确保 Secret 已更新**：
```bash
# 检查当前 API URL secret
gcloud secrets versions access latest --secret=api-url

# 如果需要更新
echo -n "https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api" | \
  gcloud secrets versions add api-url --data-file=-
```

### 服务 URL 说明
Cloud Run 服务有两个 URL：
1. **自定义域名**: `https://print-main-backend-234065158862.us-central1.run.app`
2. **自动生成域名**: `https://print-main-backend-hsbqzlnkxa-uc.a.run.app`

两个 URL 都可以使用，但建议使用自定义域名（更稳定）。

## 🔄 后续操作

### 1. 更新 API URL Secret（如果需要）
如果前端无法正确连接到后端，需要更新 `api-url` secret：

```bash
BACKEND_URL=$(gcloud run services describe print-main-backend \
  --region=us-central1 \
  --format='value(status.url)')

echo -n "${BACKEND_URL}/api" | \
  gcloud secrets versions add api-url --data-file=-
```

### 2. 验证前端配置
访问前端 URL，检查：
- 页面是否正常加载
- API 请求是否成功
- 控制台是否有错误

### 3. 监控和日志
```bash
# 查看后端日志
gcloud run services logs read print-main-backend --region=us-central1 --limit=50

# 查看前端日志
gcloud run services logs read print-main-frontend --region=us-central1 --limit=50
```

## 📝 部署命令

本次部署使用的命令：
```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_ARTIFACT_REGISTRY=print-main,_BACKEND_SERVICE_NAME=print-main-backend,_FRONTEND_SERVICE_NAME=print-main-frontend
```

## 💰 成本信息

### 免费层配置
- ✅ `minScale: 0` - 空闲时缩放到零（免费）
- ✅ 预期成本: $0/月（如果 < 200万请求/月）

### 资源使用
- **Cloud Run**: 按请求计费（免费层）
- **Artifact Registry**: 存储 Docker 镜像（< 0.5GB 免费）
- **Secret Manager**: 存储密钥（< 10,000 版本免费）

## 🎉 部署完成

部署已成功完成！服务现在可以在以下 URL 访问：

- **前端**: https://print-main-frontend-hsbqzlnkxa-uc.a.run.app
- **后端 API**: https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api

