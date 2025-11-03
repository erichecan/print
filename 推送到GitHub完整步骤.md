# 推送到 GitHub - 完整步骤
**项目**: suvernire plus  
**日期**: 2025-11-01

---

## ⚠️ 重要：需要先安装 Git

您的系统中尚未安装 Git。我已为您打开下载页面。

### 下载和安装 Git

1. **下载 Git**
   - 网页已自动打开：https://git-scm.com/download/win
   - 如果没有，请访问上面的网址
   - 点击 "Download for Windows" 按钮

2. **安装 Git**
   - 运行下载的 `.exe` 文件
   - **推荐使用默认设置**（直接点击 Next）
   - 安装时间：约 2-3 分钟

3. **验证安装**
   - 关闭当前 PowerShell
   - 重新打开 PowerShell
   - 运行命令：`git --version`
   - 应该显示版本号（如 `git version 2.41.0.windows.1`）

---

## 📝 安装 Git 后的完整流程

### **步骤 1: 配置 Git 用户信息（首次使用）**

在 PowerShell 中运行：

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**说明**：
- 将 `"Your Name"` 替换为您的姓名
- 将 `"your.email@example.com"` 替换为您的邮箱

---

### **步骤 2: 创建 GitHub 仓库**

1. 访问：https://github.com/new
2. 填写信息：
   - **Repository name**: `suvernire-plus`
   - **Description**: Custom merchandise e-commerce platform
   - **Visibility**: 选择 Public 或 Private（根据需求）
   - **⚠️ 重要**：不要勾选任何初始化选项（README、.gitignore、LICENSE 都不要选）
3. 点击 "Create repository"

**原因**：我们的项目已经有这些文件了，如果勾选会冲突。

---

### **步骤 3: 初始化本地仓库**

在项目目录 `C:\Users\eric\Desktop\print` 的 PowerShell 中运行：

```powershell
# 1. 初始化仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建首次提交
git commit -m "feat: Initial commit - Phase 1 complete

- Complete frontend development (33 HTML pages)
- Add Design Lab with layers, text, art library
- Implement admin panel with i18n (EN/CN)
- Add API-ready data attributes
- Complete SEO optimization
- Add comprehensive documentation
- Ready for client review"
```

---

### **步骤 4: 添加远程仓库**

**⚠️ 替换 `YOUR_USERNAME` 为您的 GitHub 用户名**

```powershell
git remote add origin https://github.com/YOUR_USERNAME/suvernire-plus.git
```

**示例**（如果用户名是 `john-doe`）：
```powershell
git remote add origin https://github.com/john-doe/suvernire-plus.git
```

---

### **步骤 5: 推送到 GitHub**

```powershell
# 重命名分支为 main（如果需要）
git branch -M main

# 推送代码
git push -u origin main
```

**注意事项**：
- 如果是第一次推送到 GitHub，可能会要求您登录
- 推荐使用 GitHub 个人访问令牌（Personal Access Token）
- 或者使用 GitHub Desktop（图形界面方式）

---

### **步骤 6: 创建 develop 分支**

```powershell
# 创建并切换到 develop 分支
git checkout -b develop

# 推送到远程
git push -u origin develop
```

---

## 🔐 如果推送时要求认证

### **方法 A: 使用个人访问令牌（推荐）**

1. **创建令牌**：
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Note: 填写 "git-cli" 或任何描述
   - Expiration: 选择过期时间（推荐 90 days 或 No expiration）
   - 勾选权限：
     - ✅ `repo`（完整权限）
   - Generate token
   - **⚠️ 复制令牌**（只显示一次！）

2. **推送时使用令牌**：
   - 用户名：您的 GitHub 用户名
   - 密码：粘贴刚刚复制的令牌

---

### **方法 B: 使用 SSH Key（高级）**

1. **生成 SSH Key**：
```powershell
ssh-keygen -t ed25519 -C "your.email@example.com"
```

2. **添加到 SSH Agent**：
```powershell
# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加 SSH Key
ssh-add ~/.ssh/id_ed25519
```

3. **添加到 GitHub**：
   - 复制公钥：`cat ~/.ssh/id_ed25519.pub`
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 粘贴公钥，保存

4. **修改远程 URL**：
```powershell
git remote set-url origin git@github.com:YOUR_USERNAME/suvernire-plus.git
```

---

### **方法 C: 使用 GitHub Desktop（最简单）**

1. **下载 GitHub Desktop**：
   - https://desktop.github.com/
   - 安装并登录

2. **添加仓库**：
   - File → Add local repository
   - 选择 `C:\Users\eric\Desktop\print`
   - Publish repository

3. **在网页上完成**：
   - 返回 GitHub 网页
   - 继续后续设置

---

## ✅ 验证推送成功

访问您的仓库（替换 YOUR_USERNAME）：
```
https://github.com/YOUR_USERNAME/suvernire-plus
```

应该看到：
- ✅ 所有文件已上传
- ✅ README.md 正确显示
- ✅ `.github` 文件夹存在
- ✅ `.gitignore` 文件存在
- ✅ 文件结构完整

---

## 📋 推送后的建议设置

### **1. 配置仓库设置**

在 GitHub 网页上：

#### **添加描述和 Topics**
- 点击仓库右上角设置图标
- 添加描述："Custom merchandise e-commerce platform"
- 添加 Topics：
  - `ecommerce`
  - `custom-printing`
  - `design-lab`
  - `html-css-javascript`

#### **设置默认分支**
- Settings → Branches → Default branch
- 选择 `main`

#### **启用分支保护**
- Settings → Branches → Add branch protection rule
- Branch name: `main`
- 启用选项：
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass before merging
  - ✅ Include administrators
- Create

### **2. 查看文件**

确认以下文件已正确上传：

- ✅ `README.md` - 项目说明
- ✅ `.gitignore` - Git 配置
- ✅ `.github/` - GitHub 模板文件夹
- ✅ `admin/` - 管理后台文件夹
- ✅ `*.html` - 所有 HTML 页面
- ✅ `styles.css` - 样式文件
- ✅ `*.md` - 所有文档文件

### **3. 完成！**

🎉 **恭喜！您的项目已成功推送到 GitHub！**

---

## 📞 需要帮助？

### **遇到的问题**

**Q: "git: command not found"**  
A: Git 未正确安装。重新安装并重启 PowerShell。

**Q: "fatal: not a git repository"**  
A: 未运行 `git init`。先执行初始化。

**Q: "fatal: remote origin already exists"**  
A: 运行 `git remote remove origin` 然后重新添加。

**Q: "error: failed to push"**  
A: 检查认证信息，或使用 GitHub Desktop。

**Q: "SSL certificate problem"**  
A: 运行 `git config --global http.sslVerify false`（不推荐用于生产环境）

### **查看完整指南**

- `GIT-SETUP-QUICKSTART.md` - 快速开始
- `GITHUB-INITIALIZATION.md` - 详细步骤
- `GITHUB-SETUP-GUIDE.md` - 最佳实践

---

## 🎯 总结

**安装 Git** → **配置用户** → **创建仓库** → **推送代码** → **创建 develop** → **完成！**

**预计总时间**：~15 分钟

---

**现在开始安装 Git 吧！安装完成后告诉我，我会帮您继续！** 🚀

