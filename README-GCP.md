# GCP Deployment Quick Start

快速开始：在 Google Cloud Platform 上部署本项目。

## 🚀 快速部署

### 1. 前置要求

- GCP 账户和项目
- Google Cloud SDK 已安装
- Docker 已安装

### 2. 一键设置资源

```bash
# 设置环境变量
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1

# 运行设置脚本
./scripts/setup-gcp-resources.sh
```

### 3. 部署应用

```bash
# 部署到 Cloud Run
./scripts/deploy-gcp.sh
```

## 📚 详细文档

请参考 [docs/GCP-DEPLOYMENT.md](./docs/GCP-DEPLOYMENT.md) 获取完整部署指南。

## 📝 配置文件说明

- `cloudbuild.yaml` - Cloud Build CI/CD 配置
- `.gcloudignore` - GCP 部署忽略文件
- `backend/cloud-run.yaml` - 后端服务配置
- `apps/web/cloud-run.yaml` - 前端服务配置
- `.cloudbuild.env.example` - 环境变量模板

## 🔐 环境变量

通过 GCP Secret Manager 管理敏感信息：
- `database-url` - 数据库连接字符串
- `jwt-secret` - JWT 密钥
- `stripe-secret-key` - Stripe 密钥
- `stripe-publishable-key` - Stripe 公钥
- `api-url` - 后端 API URL

## 📖 更多信息

- [GCP 部署文档](./docs/GCP-DEPLOYMENT.md)
- [环境变量配置](./docs/ENVIRONMENT-VARIABLES.md)

