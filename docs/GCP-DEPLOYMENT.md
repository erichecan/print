# GCP Deployment Guide

本文档详细说明如何在 Google Cloud Platform (GCP) 上部署本项目。

**最后更新**: [2025-01-27]

---

## 📋 目录

1. [前置要求](#前置要求)
2. [GCP 资源准备](#gcp-资源准备)
3. [部署步骤](#部署步骤)
4. [环境变量配置](#环境变量配置)
5. [数据库配置](#数据库配置)
6. [监控和维护](#监控和维护)
7. [故障排查](#故障排查)

---

## 前置要求

### 1. GCP 账户和项目

- [ ] 创建 GCP 账户
- [ ] 创建新项目或选择现有项目
- [ ] 启用计费账户（Cloud Run 需要）

### 2. 安装工具

```bash
# 安装 Google Cloud SDK
# macOS
brew install google-cloud-sdk

# 或从官网下载: https://cloud.google.com/sdk/docs/install

# 验证安装
gcloud --version

# 登录并设置项目
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. 启用必要的 API

```bash
# 启用 Cloud Run API
gcloud services enable run.googleapis.com

# 启用 Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# 启用 Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# 启用 Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com

# 启用 Secret Manager API
gcloud services enable secretmanager.googleapis.com
```

---

## GCP 资源准备

### 1. 创建 Artifact Registry 仓库

```bash
# 设置变量
export REGION=us-central1
export REPOSITORY=print-main

# 创建 Docker 仓库
gcloud artifacts repositories create $REPOSITORY \
  --repository-format=docker \
  --location=$REGION \
  --description="Print Main application Docker images"
```

### 2. 配置 Docker 认证

```bash
# 配置 Docker 以使用 Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 3. 创建 Cloud SQL PostgreSQL 实例

```bash
# 设置变量
export DB_INSTANCE_NAME=print-main-db
export DB_NAME=suvernireplus
export DB_USER=postgres
export DB_PASSWORD=your_strong_password_here

# 创建 PostgreSQL 实例（推荐使用生产级配置）
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=$DB_PASSWORD \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase

# 创建数据库
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

# 创建数据库用户（如果不同）
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password=$DB_PASSWORD
```

### 4. 创建 Secret Manager 密钥

```bash
# 生成 JWT Secret
export JWT_SECRET=$(openssl rand -hex 32)

# 创建数据库连接字符串
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/PROJECT_ID:${REGION}:${DB_INSTANCE_NAME}"

# 创建 Secret Manager 密钥
gcloud secrets create database-url --data-file=- <<< "$DATABASE_URL"
gcloud secrets create jwt-secret --data-file=- <<< "$JWT_SECRET"
gcloud secrets create stripe-secret-key --data-file=- <<< "your_stripe_secret_key"
gcloud secrets create stripe-publishable-key --data-file=- <<< "your_stripe_publishable_key"
gcloud secrets create api-url --data-file=- <<< "https://YOUR_BACKEND_URL/api"

# 授予 Cloud Run 服务账户访问权限
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-secret-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding stripe-publishable-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding api-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 部署步骤

### 方法 1: 使用 Cloud Build（推荐）

#### 1. 配置 Cloud Build 触发器

```bash
# 从 GitHub 创建触发器
gcloud builds triggers create github \
  --name="print-main-deploy" \
  --repo-name="YOUR_REPO_NAME" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_REGION=${REGION},_ARTIFACT_REGISTRY=${REPOSITORY},_BACKEND_SERVICE_NAME=print-main-backend,_FRONTEND_SERVICE_NAME=print-main-frontend,_DB_INSTANCE_NAME=${DB_INSTANCE_NAME}"
```

#### 2. 手动触发构建

```bash
# 提交代码后，触发器会自动运行
# 或手动触发
gcloud builds submit --config=cloudbuild.yaml
```

### 方法 2: 手动部署

#### 1. 构建并推送 Docker 镜像

```bash
# 构建后端镜像
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest -f backend/Dockerfile .

# 构建前端镜像
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest -f apps/web/Dockerfile apps/web

# 推送镜像
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest
```

#### 2. 部署到 Cloud Run

```bash
# 部署后端
gcloud run deploy print-main-backend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME} \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10

# 获取后端 URL
export BACKEND_URL=$(gcloud run services describe print-main-backend --region ${REGION} --format 'value(status.url)')

# 更新 API URL secret
echo "https://${BACKEND_URL#https://}/api" | gcloud secrets versions add api-url --data-file=-

# 部署前端
gcloud run deploy print-main-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets NEXT_PUBLIC_API_URL=api-url:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest \
  --set-env-vars NODE_ENV=production \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

---

## 环境变量配置

### 后端环境变量

通过 Secret Manager 和环境变量配置：

```bash
# 使用 Secret Manager（敏感信息）
- DATABASE_URL (Secret Manager)
- JWT_SECRET (Secret Manager)
- STRIPE_SECRET_KEY (Secret Manager)

# 使用环境变量（非敏感信息）
- NODE_ENV=production
- PORT=8080
- FRONTEND_URL=https://YOUR_FRONTEND_URL
- CORS_ORIGINS=https://YOUR_FRONTEND_URL
```

### 前端环境变量

```bash
# 使用 Secret Manager
- NEXT_PUBLIC_API_URL (Secret Manager)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (Secret Manager)

# 使用环境变量
- NODE_ENV=production
```

---

## 数据库配置

### 1. 运行数据库迁移

```bash
# 通过 Cloud SQL Proxy 连接到数据库
cloud_sql_proxy -instances=${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}=tcp:5432

# 在另一个终端运行迁移
cd backend
npm run migrate:deploy
```

### 2. 或从 Cloud Run 容器内运行

```bash
# 创建一个临时 Cloud Run job 来运行迁移
gcloud run jobs create migrate-db \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest \
  --region ${REGION} \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME} \
  --set-secrets DATABASE_URL=database-url:latest \
  --command="npm" \
  --args="run,migrate:deploy" \
  --max-retries 3

# 执行迁移
gcloud run jobs execute migrate-db --region ${REGION}
```

---

## 监控和维护

### 1. 查看日志

```bash
# 后端日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend" --limit 50

# 前端日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-frontend" --limit 50
```

### 2. 监控服务状态

```bash
# 查看服务列表
gcloud run services list

# 查看服务详情
gcloud run services describe print-main-backend --region ${REGION}
gcloud run services describe print-main-frontend --region ${REGION}
```

### 3. 更新服务

```bash
# 更新后端
gcloud run services update print-main-backend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:NEW_TAG \
  --region ${REGION}

# 更新前端
gcloud run services update print-main-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/frontend:NEW_TAG \
  --region ${REGION}
```

---

## 故障排查

### 常见问题

1. **服务启动失败**
   - 检查日志: `gcloud logging read ...`
   - 验证 Secret Manager 密钥是否正确配置
   - 检查 Cloud SQL 连接配置

2. **数据库连接失败**
   - 确保 Cloud SQL 实例正在运行
   - 检查 Cloud SQL 连接配置（`--add-cloudsql-instances`）
   - 验证数据库用户权限

3. **构建失败**
   - 检查 Dockerfile 是否正确
   - 验证 Artifact Registry 权限
   - 查看 Cloud Build 日志

### 获取帮助

- [Cloud Run 文档](https://cloud.google.com/run/docs)
- [Cloud Build 文档](https://cloud.google.com/build/docs)
- [Cloud SQL 文档](https://cloud.google.com/sql/docs)

---

**最后更新**: [2025-01-27]

