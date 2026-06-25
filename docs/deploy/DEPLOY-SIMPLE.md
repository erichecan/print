# 超简单部署指南

在客户 Mac 笔记本上快速部署的完整指南

---

## 📋 回答你的问题

### 1. GitHub 代码包含什么？
✅ **包含**：前后端代码、数据库结构定义（Prisma schema）  
❌ **不包含**：数据库实例本身（需要外部数据库）

### 2. 需要安装什么？
只需要安装 2 个工具：
- **Google Cloud SDK** (gcloud)
- **Docker Desktop**

### 3. 命令在哪里执行？
✅ 全部在 **Terminal**（终端）里执行

### 4. 数据库用 Cloud SQL？
❌ **不用 Cloud SQL**（需要付费）  
✅ **用外部免费数据库**：
  - Supabase (https://supabase.com) - 免费 500MB
  - Neon (https://neon.tech) - 免费 PostgreSQL

### 5. 可以全自动部署吗？
✅ **可以！** 现在有一个全自动脚本

---

## 🚀 超简单 3 步部署

### 步骤 1: 安装必要工具

#### 1.1 安装 Google Cloud SDK

```bash
# 使用 Homebrew（推荐）
brew install google-cloud-sdk

# 或者下载安装器
# https://cloud.google.com/sdk/docs/install
```

#### 1.2 安装 Docker Desktop

```bash
# 使用 Homebrew
brew install --cask docker

# 或者下载安装器
# https://www.docker.com/products/docker-desktop
```

安装后启动 Docker Desktop（在应用程序里打开）

---

### 步骤 2: 从 GitHub 拉取代码

```bash
# 打开 Terminal，执行：
git clone https://github.com/erichecan/print.git
cd print
```

---

### 步骤 3: 运行全自动部署脚本

```bash
# 给脚本执行权限
chmod +x scripts/deploy-auto.sh

# 运行全自动部署（一键完成所有步骤）
./scripts/deploy-auto.sh
```

**脚本会自动：**
- ✅ 检查依赖（gcloud, docker）
- ✅ 启用所有必要的 GCP API
- ✅ 创建 Artifact Registry 仓库
- ✅ 配置 Docker 认证
- ✅ 创建 Secret Manager 密钥（会提示你输入数据库 URL 和 Stripe 密钥）
- ✅ 构建 Docker 镜像
- ✅ 部署到 Cloud Run（前后端）
- ✅ 提示设置预算告警

**脚本会提示你输入：**
1. GCP 项目 ID
2. 数据库 URL（从 Supabase/Neon 获取）
3. Stripe Secret Key
4. Stripe Publishable Key

---

## 📝 准备数据库 URL

### 使用 Supabase（推荐）

1. 访问 https://supabase.com
2. 注册账号，创建新项目
3. 等待项目创建完成（约 1 分钟）
4. 在项目设置 → Database 找到连接字符串
5. 格式类似：`postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres`

### 使用 Neon

1. 访问 https://neon.tech
2. 注册账号，创建新项目
3. 复制连接字符串
4. 格式类似：`postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

---

## ✅ 部署后验证

部署完成后，脚本会显示前端和后端 URL，例如：

```
访问地址:
  前端: https://print-main-frontend-xxxxx.run.app
  后端: https://print-main-backend-xxxxx.run.app
```

在浏览器打开前端 URL 测试！

---

## 🔧 如果遇到问题

### 问题 1: gcloud 未安装

```bash
# 检查是否安装
gcloud --version

# 如果未安装，使用 Homebrew 安装
brew install google-cloud-sdk

# 初始化
gcloud init
```

### 问题 2: Docker 未运行

1. 打开 Docker Desktop 应用
2. 等待 Docker 启动完成（系统托盘图标不再转动）
3. 验证：
   ```bash
   docker ps
   ```

### 问题 3: 需要登录 GCP

脚本会自动提示登录，或手动执行：
```bash
gcloud auth login
```

### 问题 4: 权限错误

确保你对该 GCP 项目有以下权限：
- Cloud Run Admin
- Artifact Registry Writer
- Secret Manager Admin
- Service Account User

---

## 💰 费用说明

使用自动脚本部署的配置：
- ✅ `minScale: 0` - 无请求时自动停止 = **免费**
- ✅ 外部免费数据库 = **免费**
- ✅ Artifact Registry < 0.5GB = **免费**
- ✅ Secret Manager < 10,000 版本 = **免费**

**预期费用：$0/月**（如果 < 200万请求/月）

---

## 📚 相关文档

- [免费部署快速指南](./README-GCP-FREE.md)
- [成本优化指南](./docs/GCP-COST-OPTIMIZATION.md)

---

**就是这么简单！3 步完成部署！** 🎉

