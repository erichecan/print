# GCP SDK 安装和配置指南
# [2025-01-29 14:10:00] 完整的 gcloud CLI 设置步骤

## 📦 安装 Google Cloud SDK

### macOS 安装

```bash
# 使用 Homebrew（推荐）
brew install google-cloud-sdk

# 或下载官方安装程序
# 访问: https://cloud.google.com/sdk/docs/install
```

### 验证安装

```bash
# 检查版本
gcloud --version

# 应该看到类似输出：
# Google Cloud SDK 450.0.0
# ...
```

## 🔐 初始配置步骤

安装后，需要完成以下步骤才能使用所有命令：

### 1. 登录认证

```bash
# 登录到 Google 账户
gcloud auth login

# 这会打开浏览器，要求登录你的 Google 账户
# 登录后，返回到终端即可
```

### 2. 设置默认项目

```bash
# 设置项目 ID
gcloud config set project 234065158862

# 验证设置
gcloud config get-value project
# 应该输出: 234065158862
```

### 3. 设置默认区域（可选）

```bash
# 设置默认区域
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

### 4. 初始化配置（可选）

```bash
# 运行初始化向导（会引导你完成配置）
gcloud init
```

## ✅ 验证配置

运行以下命令验证一切正常：

```bash
# 检查认证状态
gcloud auth list

# 应该看到你的账户，状态为 ACTIVE
# 例如：
# Credentialed Accounts
# ACTIVE  ACCOUNT
# *       your-email@gmail.com
```

```bash
# 检查当前项目
gcloud config get-value project
# 应该输出: 234065158862
```

```bash
# 测试命令（列出 Cloud Run 服务）
gcloud run services list --region=us-central1
```

## 🎯 完整的设置清单

- [ ] 安装 Google Cloud SDK
- [ ] 运行 `gcloud auth login` 登录
- [ ] 运行 `gcloud config set project 234065158862` 设置项目
- [ ] 验证安装：`gcloud --version`
- [ ] 验证认证：`gcloud auth list`
- [ ] 验证项目：`gcloud config get-value project`

## 🔄 使用应用默认凭据（可选）

对于自动化脚本和 CI/CD，可以设置应用默认凭据：

```bash
# 设置应用默认凭据
gcloud auth application-default login
```

## 📚 常用命令

### 查看帮助

```bash
# 查看所有命令
gcloud help

# 查看特定命令帮助
gcloud run services --help
gcloud builds --help
```

### 管理配置

```bash
# 查看当前配置
gcloud config list

# 查看所有配置
gcloud config list --all

# 查看特定配置值
gcloud config get-value project
gcloud config get-value compute/region

# 取消设置
gcloud config unset project
```

### 切换账户/项目

```bash
# 切换账户
gcloud config set account your-email@gmail.com

# 切换项目
gcloud config set project different-project-id
```

## ⚠️ 常见问题

### 1. 命令未找到

**问题**: `bash: gcloud: command not found`

**解决**: 
- 确保安装后重新打开终端
- 或手动添加到 PATH（安装程序会提示）

### 2. 权限错误

**问题**: `ERROR: (gcloud.run.services.list) User [xxx] does not have permission`

**解决**:
- 确保使用正确的 Google 账户
- 确保账户有项目访问权限
- 联系项目管理员授予权限

### 3. 项目不存在

**问题**: `ERROR: (gcloud) Project [xxx] not found`

**解决**:
- 检查项目 ID 是否正确: `234065158862`
- 确保账户有访问该项目的权限
- 列出所有可访问的项目: `gcloud projects list`

### 4. 认证过期

**问题**: 命令返回认证错误

**解决**:
```bash
# 重新登录
gcloud auth login

# 或刷新认证
gcloud auth refresh
```

## 🚀 快速设置脚本

创建并运行以下脚本可以快速完成设置：

```bash
#!/bin/bash
# 快速设置 GCP SDK

echo "=== GCP SDK 快速设置 ==="
echo ""

# 检查是否已安装
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud 未安装"
  echo "请先安装: brew install google-cloud-sdk"
  exit 1
fi

echo "✅ gcloud 已安装: $(gcloud --version | head -1)"
echo ""

# 登录
echo "🔐 步骤 1: 登录..."
gcloud auth login

# 设置项目
echo ""
echo "📌 步骤 2: 设置项目..."
gcloud config set project 234065158862

# 验证
echo ""
echo "✅ 验证配置:"
echo "   项目: $(gcloud config get-value project)"
echo "   账户: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"

echo ""
echo "🎉 设置完成！"
```

## 📖 更多资源

- [官方安装文档](https://cloud.google.com/sdk/docs/install)
- [gcloud 命令参考](https://cloud.google.com/sdk/gcloud/reference)
- [认证指南](https://cloud.google.com/sdk/docs/authorizing)

---

**最后更新**: 2025-01-29 14:10:00

