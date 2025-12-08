# Docker 镜像重建和部署总结
[2025-12-08 00:37:00] 重新构建 Docker 镜像并重新部署生产环境

## ✅ 执行的操作

### 1. 构建 Docker 镜像
- **镜像名称**: `us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest`
- **平台**: `linux/amd64`
- **构建参数**:
  - `APP_BUILD_SHA`: `eda826b`
  - `APP_BUILD_TIME`: `2025-12-08T00:36:56Z`
- **状态**: ✅ 成功构建
- **镜像大小**: 592MB

### 2. 推送镜像到 Artifact Registry
- **Registry**: `us-central1-docker.pkg.dev`
- **Repository**: `print-main`
- **状态**: ✅ 成功推送
- **Digest**: `sha256:e1b66991552c057b0b3e5170cfcf7b01b758e71f3e1474aea559ef400e7f8614`

### 3. 重新部署服务
- **服务名称**: `print-main-backend`
- **区域**: `us-central1`
- **新版本**: `print-main-backend-00151-wv7`
- **服务 URL**: `https://print-main-backend-234065158862.us-central1.run.app`
- **状态**: ✅ 成功部署

## 📊 关键改进

### Prisma Client 更新
新的 Docker 镜像包含了最新的 Prisma schema，包括：
- `offline_order_products` 模型
- `offline_order_colors` 模型
- `offline_order_size_fees` 模型
- `offline_order_product_color_sizes` 模型

这些模型在构建时通过 `npx prisma generate` 生成，确保生产环境可以正确查询这些表。

## 🔍 验证步骤

### 1. 检查服务状态
```bash
gcloud run services describe print-main-backend --region=us-central1
```

### 2. 验证 API 响应
```bash
curl https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api/offline-orders/config
```

## 📝 执行的命令

```bash
# 1. 构建镜像
docker build --platform linux/amd64 \
  --build-arg APP_BUILD_SHA="eda826b" \
  --build-arg APP_BUILD_TIME="2025-12-08T00:36:56Z" \
  -t us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest \
  -f backend/Dockerfile .

# 2. 推送镜像
docker push us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest

# 3. 部署服务
gcloud run deploy print-main-backend \
  --image us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 600
```

## ✅ 完成状态

- ✅ Docker 镜像已重新构建（包含最新的 Prisma schema）
- ✅ 镜像已推送到 Artifact Registry
- ✅ 服务已重新部署
- ⏳ 等待验证 API 是否返回数据

