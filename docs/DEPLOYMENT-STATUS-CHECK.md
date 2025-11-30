# 部署状态检查指南
# [2025-01-29 14:00:00] 如何检查 GCP 部署状态

## 📋 项目信息

- **项目 ID**: `234065158862`
- **区域**: `us-central1`
- **后端服务**: `print-main-backend`
- **前端服务**: `print-main-frontend`
- **Artifact Registry**: `print-main`

## 🔍 检查步骤

### 1. 登录并设置项目

```bash
# 登录 GCP
gcloud auth login

# 设置项目
gcloud config set project 234065158862
```

### 2. 检查 Cloud Build 构建状态

```bash
# 查看最近的构建
gcloud builds list --limit=10 \
  --format="table(id,status,createTime,source.repoSource.branchName,logUrl)"

# 查看正在进行的构建
gcloud builds list --ongoing \
  --format="table(id,status,createTime,logUrl)"
```

### 3. 检查 Cloud Run 服务状态

```bash
# 查看所有服务
gcloud run services list \
  --region=us-central1 \
  --format="table(metadata.name,status.url,status.conditions[0].status,status.latestReadyRevisionName)"

# 检查后端服务
gcloud run services describe print-main-backend \
  --region=us-central1 \
  --format="yaml(status)"

# 检查前端服务
gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --format="yaml(status)"
```

### 4. 检查服务 URL

```bash
# 获取后端 URL
BACKEND_URL=$(gcloud run services describe print-main-backend \
  --region=us-central1 \
  --format="value(status.url)")
echo "后端 URL: $BACKEND_URL"

# 获取前端 URL
FRONTEND_URL=$(gcloud run services describe print-main-frontend \
  --region=us-central1 \
  --format="value(status.url)")
echo "前端 URL: $FRONTEND_URL"
```

### 5. 检查服务日志

```bash
# 查看后端日志
gcloud run services logs read print-main-backend \
  --region=us-central1 \
  --limit=50

# 查看前端日志
gcloud run services logs read print-main-frontend \
  --region=us-central1 \
  --limit=50
```

## 🌐 Web Console 检查

### Cloud Build 控制台
- URL: https://console.cloud.google.com/cloud-build/builds?project=234065158862
- 查看构建历史和状态

### Cloud Run 控制台
- URL: https://console.cloud.google.com/run?project=234065158862
- 查看服务状态、日志和指标

### Artifact Registry
- URL: https://console.cloud.google.com/artifacts?project=234065158862
- 查看 Docker 镜像

## ✅ 部署成功标志

1. **Cloud Build**: 构建状态为 `SUCCESS`
2. **Cloud Run**: 服务状态为 `Ready`
3. **服务 URL**: 可以正常访问
   - 后端: `https://print-main-backend-234065158862.us-central1.run.app`
   - 前端: `https://print-main-frontend-234065158862.us-central1.run.app`

## 🔄 手动触发部署

如果自动部署未触发，可以手动触发：

```bash
# 设置项目
gcloud config set project 234065158862

# 触发 Cloud Build
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_ARTIFACT_REGISTRY=print-main
```

## 📊 快速状态检查脚本

```bash
#!/bin/bash
# 快速检查部署状态

PROJECT_ID="234065158862"
REGION="us-central1"

echo "=== GCP 部署状态检查 ==="
echo "项目: $PROJECT_ID"
echo "区域: $REGION"
echo ""

# 检查最近的构建
echo "📦 最近的构建："
gcloud builds list --limit=3 \
  --format="table(id,status,createTime)" \
  --project=$PROJECT_ID

echo ""
echo "🚀 Cloud Run 服务："
gcloud run services list \
  --region=$REGION \
  --format="table(metadata.name,status.url,status.conditions[0].status)" \
  --project=$PROJECT_ID
```

---

**最后更新**: 2025-01-29 14:00:00

