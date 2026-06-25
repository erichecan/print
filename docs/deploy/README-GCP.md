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

## 🔧 故障排查：Product Management / Suppliers 返回 500

若管理后台「产品管理」无数据或「保存供应商失败」、接口 `/api/proxy/admin/offline-order-products` 或 `/api/proxy/admin/suppliers` 返回 500，多为生产库未同步最新 schema（缺 `suppliers` 表或 `offline_order_products` 新列）。处理方式：

1. 在 Cloud Run 后端服务中临时添加环境变量 `AUTO_MIGRATE=true`
2. 重新部署或重启该服务一次（启动时会执行 `prisma db push` 同步 schema）
3. 同步完成后将 `AUTO_MIGRATE` 改回 `false` 或删除，避免每次启动都执行迁移

或本地对生产库执行一次：`npx prisma db push --schema=prisma/schema.prisma`（需配置生产 `DATABASE_URL`）。

## 📖 更多信息

- [GCP 部署文档](./docs/GCP-DEPLOYMENT.md)
- [环境变量配置](./docs/ENVIRONMENT-VARIABLES.md)

