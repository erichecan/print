# 生产环境服务重启总结
[2025-12-07 18:05:00] 重启生产环境服务以刷新 Prisma Client

## ✅ 执行的操作

### 1. 服务重启
- **命令**: `gcloud run services update print-main-backend --region=us-central1`
- **状态**: ✅ 成功
- **新版本**: `print-main-backend-00151-wv7`
- **服务 URL**: `https://print-main-backend-hsbqzlnkxa-uc.a.run.app`

### 2. 服务状态验证
- **状态**: ✅ 服务正常运行
- **健康检查**: ✅ 通过

## ⚠️ 发现的问题

### API 仍然返回空数据
虽然服务已重启，但 API (`/api/offline-orders/config`) 仍然返回：
```json
{
  "products": [],
  "colors": []
}
```

### 根本原因

**Prisma Client 是在 Docker 镜像构建时生成的，而不是运行时生成的。**

查看 `backend/Dockerfile` 第 22 行：
```dockerfile
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate --schema=./prisma/schema.prisma
```

这意味着：
1. 当前生产环境的 Docker 镜像可能是在添加 `offline_order_products` 和 `offline_order_colors` 表之前构建的
2. Prisma Client 中没有这些新模型的类型定义
3. 仅重启服务不会刷新 Prisma Client，因为它已经在镜像中预编译了

## 🔧 解决方案

### 需要重新构建 Docker 镜像

要刷新 Prisma Client，需要：

1. **重新构建 Docker 镜像**（包含最新的 Prisma schema）
2. **推送镜像到 Artifact Registry**
3. **重新部署服务**

### 执行步骤

```bash
# 1. 设置环境变量
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export REPOSITORY=print-main-repo
export BACKEND_SERVICE=print-main-backend

# 2. 构建并推送后端镜像
cd backend
docker build \
  --platform linux/amd64 \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  -f Dockerfile .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest

# 3. 重新部署服务
gcloud run deploy ${BACKEND_SERVICE} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production
```

或者使用现有的部署脚本：
```bash
./scripts/deploy-gcp-free.sh
```

## 📊 当前状态

- ✅ 数据库中有数据（26 个产品，14 个颜色）
- ✅ 服务已重启
- ❌ API 返回空数据（需要重新构建镜像）

## 🔄 下一步

需要重新构建 Docker 镜像并重新部署服务，才能让 API 正确返回数据。

