# GCP 配置总结

[2025-01-27] 本文档总结所有为 GCP 部署创建的配置文件和修改。

## 📁 新增文件

### 核心配置文件

1. **`cloudbuild.yaml`**
   - Cloud Build CI/CD 配置
   - 自动化构建和部署流程
   - 支持多服务并行构建

2. **`.gcloudignore`**
   - 部署时忽略的文件和目录
   - 减少构建上下文大小

3. **`.cloudbuild.env.example`**
   - Cloud Build 替换变量模板
   - 环境变量配置示例

### 服务配置文件

4. **`backend/cloud-run.yaml`**
   - 后端 Cloud Run 服务定义
   - 资源配置和健康检查

5. **`apps/web/cloud-run.yaml`**
   - 前端 Cloud Run 服务定义
   - 资源配置和健康检查

### 部署脚本

6. **`scripts/deploy-gcp.sh`**
   - 自动化部署脚本
   - 构建、推送和部署 Docker 镜像

7. **`scripts/setup-gcp-resources.sh`**
   - GCP 资源初始化脚本
   - 创建 Artifact Registry、Cloud SQL、Secret Manager

### 文档

8. **`docs/GCP-DEPLOYMENT.md`**
   - 完整的 GCP 部署指南
   - 详细步骤和故障排查

9. **`README-GCP.md`**
   - GCP 部署快速开始
   - 快速参考指南

## 🔧 修改的文件

### Dockerfile 更新

1. **`backend/Dockerfile`**
   - 更新端口为 8080（Cloud Run 标准）
   - 添加 PORT 环境变量支持

## 🎯 GCP 服务架构

```
┌─────────────────┐
│  Cloud Build    │ ← CI/CD 构建和部署
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Artifact        │ ← Docker 镜像仓库
│ Registry        │
└────────┬────────┘
         │
         ├──────────┬──────────┐
         ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Cloud Run   │ │ Cloud Run   │ │ Cloud SQL   │
│ (Frontend)  │ │ (Backend)   │ │ (PostgreSQL)│
└─────────────┘ └──────┬──────┘ └──────┬──────┘
                       │               │
                       └───────┬───────┘
                               ▼
                    ┌──────────────────┐
                    │ Secret Manager   │ ← 密钥管理
                    └──────────────────┘
```

## 🔐 安全配置

- 使用 Secret Manager 存储敏感信息
- Cloud SQL 私有 IP 连接
- Cloud Run 最小权限原则
- 自动 HTTPS 证书

## 📊 资源配置

### 后端 (Backend)
- **CPU**: 1 vCPU
- **内存**: 1 GiB
- **最小实例**: 1
- **最大实例**: 10
- **超时**: 300 秒

### 前端 (Frontend)
- **CPU**: 1 vCPU
- **内存**: 2 GiB
- **最小实例**: 1
- **最大实例**: 10
- **超时**: 300 秒

### 数据库 (Cloud SQL)
- **版本**: PostgreSQL 15
- **实例类型**: db-f1-micro (可调整)
- **存储**: 20GB SSD (自动扩展)
- **备份**: 每日自动备份

## 🚀 部署流程

1. **初始化资源** → `scripts/setup-gcp-resources.sh`
2. **配置密钥** → Secret Manager
3. **部署服务** → `scripts/deploy-gcp.sh` 或 Cloud Build
4. **运行迁移** → 数据库迁移脚本
5. **验证部署** → 健康检查端点

## 📝 环境变量清单

### 后端环境变量

**Secret Manager:**
- `database-url` - PostgreSQL 连接字符串
- `jwt-secret` - JWT 签名密钥
- `stripe-secret-key` - Stripe API 密钥

**环境变量:**
- `NODE_ENV=production`
- `PORT=8080`
- `FRONTEND_URL` - 前端 URL（用于 CORS）
- `CORS_ORIGINS` - CORS 允许的来源

### 前端环境变量

**Secret Manager:**
- `api-url` - 后端 API URL
- `stripe-publishable-key` - Stripe 公钥

**环境变量:**
- `NODE_ENV=production`

## ✅ 检查清单

部署前检查：

- [ ] GCP 项目已创建
- [ ] 已安装 Google Cloud SDK
- [ ] 已启用必要的 API
- [ ] Artifact Registry 仓库已创建
- [ ] Cloud SQL 实例已创建
- [ ] Secret Manager 密钥已配置
- [ ] 服务账户权限已配置
- [ ] 数据库迁移脚本已准备

## 🔗 相关文档

- [完整部署指南](./docs/GCP-DEPLOYMENT.md)
- [环境变量配置](./docs/ENVIRONMENT-VARIABLES.md)
- [快速开始](./README-GCP.md)

---

**创建日期**: [2025-01-27]

