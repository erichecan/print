# GCP Windows 部署指南

[2025-01-27] 在 Windows 11 上部署到 GCP 的完整指南

---

## 📋 前置要求

### 1. 安装必要工具

#### Google Cloud SDK (gcloud)

1. 下载安装程序：https://cloud.google.com/sdk/docs/install
2. 运行安装程序，选择所有组件
3. 验证安装：
   ```powershell
   gcloud --version
   ```

#### Docker Desktop

1. 下载 Docker Desktop：https://www.docker.com/products/docker-desktop
2. 安装并启动 Docker Desktop
3. 验证安装：
   ```powershell
   docker --version
   ```

#### PowerShell（已内置）

Windows 11 已包含 PowerShell，无需额外安装。

---

## 🚀 快速部署步骤

### 步骤 1：克隆仓库

```powershell
# 在 PowerShell 中执行
git clone https://github.com/erichecan/print.git
cd print
```

### 步骤 2：配置 GCP 项目

```powershell
# 登录 GCP
gcloud auth login

# 设置项目 ID
gcloud config set project YOUR_PROJECT_ID

# 或者设置环境变量
$env:GCP_PROJECT_ID = "YOUR_PROJECT_ID"
```

### 步骤 3：设置费用预算告警（必须！）

```powershell
# 运行 PowerShell 脚本
.\scripts\setup-billing-alerts.ps1

# 或者手动设置预算金额
$env:BUDGET_AMOUNT = "10"
.\scripts\setup-billing-alerts.ps1
```

### 步骤 4：创建免费数据库

**推荐使用 Supabase（免费 500MB）：**

1. 访问：https://supabase.com
2. 注册并创建新项目
3. 获取连接字符串（格式：`postgresql://user:pass@host:5432/dbname`）
4. 保存到 GCP Secret Manager：

```powershell
# 创建数据库 URL secret
$DB_URL = Read-Host "Enter database URL"
echo $DB_URL | gcloud secrets create database-url --data-file=-

# 创建其他必要的 secrets
$JWT_SECRET = Read-Host "Enter JWT secret (press Enter to generate)"
if (-not $JWT_SECRET) {
    $JWT_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
}
echo $JWT_SECRET | gcloud secrets create jwt-secret --data-file=-

$STRIPE_SECRET = Read-Host "Enter Stripe secret key"
echo $STRIPE_SECRET | gcloud secrets create stripe-secret-key --data-file=-

$STRIPE_PUB = Read-Host "Enter Stripe publishable key"
echo $STRIPE_PUB | gcloud secrets create stripe-publishable-key --data-file=-
```

### 步骤 5：部署应用

```powershell
# 运行免费部署脚本
.\scripts\deploy-gcp-free.ps1
```

---

## 📁 脚本位置

所有脚本都在 `scripts/` 目录下：

### Windows PowerShell 脚本

- `scripts/deploy-gcp-free.ps1` - 免费部署脚本（主要）
- `scripts/setup-billing-alerts.ps1` - 设置费用预算告警

### Linux/Mac Bash 脚本

- `scripts/deploy-gcp-free.sh` - 免费部署脚本
- `scripts/setup-billing-alerts.sh` - 设置费用预算告警

---

## 🔧 使用方法

### 在 PowerShell 中执行脚本

**方法 1：直接运行（推荐）**

```powershell
# 打开 PowerShell（以管理员身份运行）
cd C:\path\to\print-main

# 执行脚本
.\scripts\deploy-gcp-free.ps1
```

**方法 2：设置执行策略后运行**

如果遇到执行策略错误：

```powershell
# 临时允许脚本执行（当前会话）
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# 然后运行脚本
.\scripts\deploy-gcp-free.ps1
```

**方法 3：直接执行**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-gcp-free.ps1
```

---

## ⚙️ 配置环境变量

### 方法 1：在 PowerShell 中设置

```powershell
# 当前会话有效
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"
$env:BUDGET_AMOUNT = "5"
```

### 方法 2：永久设置（系统环境变量）

1. 打开"系统属性" → "高级" → "环境变量"
2. 添加新的系统变量：
   - `GCP_PROJECT_ID` = `your-project-id`
   - `GCP_REGION` = `us-central1`
   - `BUDGET_AMOUNT` = `5`

### 方法 3：在脚本中直接修改

编辑脚本文件，修改默认值：

```powershell
$PROJECT_ID = "your-project-id"  # 直接设置
```

---

## 📝 完整部署流程

### 第一次部署

```powershell
# 1. 打开 PowerShell（管理员模式）
# 2. 导航到项目目录
cd C:\path\to\print-main

# 3. 配置 GCP
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 4. 设置预算告警（必须！）
.\scripts\setup-billing-alerts.ps1

# 5. 配置数据库和密钥
# （按照上面的步骤创建 secrets）

# 6. 部署应用
.\scripts\deploy-gcp-free.ps1
```

### 后续更新部署

```powershell
# 只需要运行部署脚本
.\scripts\deploy-gcp-free.ps1
```

---

## 🐛 常见问题

### 问题 1: 执行策略错误

**错误：**
```
无法加载文件，因为在此系统上禁止运行脚本
```

**解决方法：**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题 2: Docker 未运行

**错误：**
```
Cannot connect to the Docker daemon
```

**解决方法：**
1. 启动 Docker Desktop
2. 等待 Docker 完全启动（系统托盘图标不再转动）
3. 验证：`docker ps`

### 问题 3: gcloud 未找到

**错误：**
```
gcloud: command not found
```

**解决方法：**
1. 重新安装 Google Cloud SDK
2. 或者添加到 PATH：
   ```powershell
   $env:PATH += ";C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin"
   ```

### 问题 4: 权限错误

**错误：**
```
Permission denied
```

**解决方法：**
1. 以管理员身份运行 PowerShell
2. 或者检查 GCP 项目权限

---

## ✅ 部署后验证

### 1. 检查服务状态

```powershell
# 列出所有 Cloud Run 服务
gcloud run services list --region us-central1

# 查看后端服务详情
gcloud run services describe print-main-backend --region us-central1

# 查看前端服务详情
gcloud run services describe print-main-frontend --region us-central1
```

### 2. 验证 minScale = 0

```powershell
# 检查后端
gcloud run services describe print-main-backend --region us-central1 --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# 应该显示：0

# 检查前端
gcloud run services describe print-main-frontend --region us-central1 --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# 应该显示：0
```

### 3. 测试访问

```powershell
# 获取后端 URL
$BACKEND_URL = gcloud run services describe print-main-backend --region us-central1 --format 'value(status.url)'
Write-Host "Backend URL: $BACKEND_URL"

# 获取前端 URL
$FRONTEND_URL = gcloud run services describe print-main-frontend --region us-central1 --format 'value(status.url)'
Write-Host "Frontend URL: $FRONTEND_URL"

# 测试访问（在浏览器中打开）
Start-Process $FRONTEND_URL
```

---

## 📚 相关文档

- [GCP 免费部署关键要点](../GCP-FREE-DEPLOYMENT-KEY-POINTS.md)
- [成本优化指南](./GCP-COST-OPTIMIZATION.md)
- [部署检查清单](./GCP-FREE-DEPLOYMENT-CHECKLIST.md)
- [完整部署指南](./GCP-DEPLOYMENT.md)

---

**最后更新**: [2025-01-27]

