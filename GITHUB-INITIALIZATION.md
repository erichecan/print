# GitHub 仓库初始化步骤
**项目**: suvernire plus E-commerce Platform  
**日期**: 2025-11-01

---

## 🎯 目标
将项目推送到 GitHub，遵循最佳实践。

---

## 📋 前置要求

### 1. 安装 Git
如果系统中未安装 Git：

**Windows**:
- 下载: https://git-scm.com/download/win
- 运行安装程序
- 选择默认选项（使用 VS Code、使用 OpenSSL、checkout 使用 Windows 风格）

**验证安装**:
```bash
git --version
# 应显示: git version 2.x.x
```

### 2. 创建 GitHub 账号和仓库
1. 访问 https://github.com
2. 注册/登录账号
3. 点击右上角 "+" → "New repository"
4. 仓库信息：
   - Repository name: `suvernire-plus` (或您喜欢的名称)
   - Description: "Custom merchandise e-commerce platform with design lab"
   - Visibility: Public 或 Private（根据需要）
   - **不要**初始化 README、.gitignore 或 license（我们已有）
5. 点击 "Create repository"

### 3. 配置 Git 用户信息（首次使用）
```bash
# 设置全局用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 验证配置
git config --global user.name
git config --global user.email
```

---

## 🚀 初始化流程

### 方案 A: 使用 PowerShell（推荐）

#### **步骤 1: 检查 Git 是否可用**
```powershell
git --version
```

#### **步骤 2: 初始化仓库**
```powershell
# 在项目根目录（C:\Users\eric\Desktop\print）
git init
```

#### **步骤 3: 检查文件状态**
```powershell
git status
```

#### **步骤 4: 添加所有文件**
```powershell
# 暂存所有文件
git add .
```

#### **步骤 5: 创建初始提交**
```powershell
# 创建首次提交
git commit -m "feat: Initial commit - Phase 1 complete

- Complete frontend development (33 HTML pages)
- Add Design Lab with layers, text, art library
- Implement admin panel with i18n (EN/CN)
- Add API-ready data attributes
- Complete SEO optimization
- Add comprehensive documentation
- Ready for client review"
```

#### **步骤 6: 添加远程仓库**
```powershell
# 替换 YOUR_USERNAME 和 YOUR_REPO_NAME
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 验证远程仓库
git remote -v
```

#### **步骤 7: 推送到 GitHub**
```powershell
# 首次推送 main 分支
git push -u origin main

# 如果 main 分支名称是 master，重命名为 main
git branch -M main
git push -u origin main
```

---

### 方案 B: 使用 GitHub Desktop（图形界面）

#### 1. 下载 GitHub Desktop
- 下载: https://desktop.github.com/

#### 2. 登录并克隆
- Sign in to GitHub
- File → Clone repository → New repository
- 名称: `suvernire-plus`
- Local path: 选择新文件夹或使用当前项目
- 勾选 "Initialize this repository with a README"（可选）
- Clone

#### 3. 提交和推送
- 将项目文件复制到仓库文件夹
- GitHub Desktop 会自动检测文件变化
- 左下角填写 Summary: "Initial commit - Phase 1 complete"
- 左下角填写 Description（可选）
- 点击 "Commit to main"
- 点击 "Publish branch"

---

### 方案 C: 使用 GitHub CLI（高级）

#### 1. 安装 GitHub CLI
```powershell
# 使用 winget
winget install --id GitHub.cli

# 或从 https://cli.github.com/ 下载
```

#### 2. 验证安装
```powershell
gh --version
```

#### 3. 认证
```powershell
gh auth login
```

#### 4. 创建并推送
```powershell
# 初始化仓库
git init

# 添加文件
git add .
git commit -m "feat: Initial commit - Phase 1 complete"

# 创建 GitHub 仓库并推送
gh repo create suvernire-plus --public --source=. --remote=origin --push
```

---

## 📦 创建 develop 分支（推荐）

### 初始化后创建开发分支

```powershell
# 创建并切换到 develop 分支
git checkout -b develop

# 推送到远程
git push -u origin develop
```

### 设置默认分支保护

1. GitHub 网页 → Settings → Branches
2. Add branch protection rule
3. Branch name: `main`
4. 启用：
   - [x] Require pull request reviews before merging
   - [x] Require status checks to pass before merging
   - [x] Include administrators
5. Create

---

## 🏷️ 添加标签和描述

### 在 GitHub 上添加信息

#### README 徽章
在 `README.md` 顶部添加：

```markdown
![GitHub release](https://img.shields.io/github/v/release/yourusername/suvernire-plus)
![GitHub stars](https://img.shields.io/github/stars/yourusername/suvernire-plus)
![GitHub forks](https://img.shields.io/github/forks/yourusername/suvernire-plus)
```

#### 仓库主题
Settings → General → Topics → 添加：
- `ecommerce`
- `custom-printing`
- `design-lab`
- `html-css-javascript`
- `shopping-cart`
- `admin-dashboard`

#### 仓库描述
在仓库主页编辑描述：
- Custom merchandise e-commerce platform with visual design lab and full admin dashboard

---

## 📂 .gitignore 检查

确保 `.gitignore` 文件已创建并包含：

```
node_modules/
.env
*.log
dist/
build/
.DS_Store
Thumbs.db
```

验证：
```powershell
cat .gitignore
```

---

## 🔍 验证推送成功

### 检查 GitHub 网页

1. 访问您的仓库: `https://github.com/YOUR_USERNAME/suvernire-plus`
2. 确认：
   - [ ] 所有文件已上传
   - [ ] README.md 正确显示
   - [ ] 文件结构完整
   - [ ] 没有多余文件（如 node_modules）

### 检查 git 状态

```powershell
git status
# 应该显示: nothing to commit, working tree clean

git log --oneline -5
# 查看最近 5 次提交
```

---

## 📝 后续 Git 工作流程

### 日常开发流程

#### **创建功能分支**
```powershell
# 从 develop 创建分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name
```

#### **开发并提交**
```powershell
# 修改文件
# ...

# 查看变更
git status
git diff

# 暂存并提交
git add .
git commit -m "feat: description of changes"
```

#### **推送到 GitHub**
```powershell
# 首次推送
git push -u origin feature/new-feature-name

# 后续推送
git push
```

#### **创建 Pull Request**
1. GitHub 网页 → Pull requests → New PR
2. 选择 `feature/new-feature-name` → `develop`
3. 填写 PR 描述
4. Create pull request

#### **合并 PR**
1. Review 代码
2. 解决冲突（如有）
3. Merge pull request

---

## 🐛 常见问题

### 问题 1: "git: command not found"
**解决**: 安装 Git 并重启 PowerShell

### 问题 2: "fatal: not a git repository"
**解决**: 
```powershell
git init
```

### 问题 3: "fatal: remote origin already exists"
**解决**:
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 问题 4: "error: failed to push some refs"
**解决**:
```powershell
git pull origin main --rebase
git push origin main
```

### 问题 5: 忘记提交大文件
**解决**:
```powershell
# 使用 git-lfs 或从历史删除
git rm --cached <file>
git commit --amend
```

---

## ✅ 完成检查清单

- [ ] Git 已安装并配置
- [ ] GitHub 账号已创建
- [ ] 仓库已创建
- [ ] 已添加 `.gitignore`
- [ ] 已创建 GitHub 模板
- [ ] 已初始化本地仓库
- [ ] 已提交所有文件
- [ ] 已添加到远程仓库
- [ ] 已推送到 GitHub
- [ ] 已创建 develop 分支
- [ ] 已验证推送成功
- [ ] README 显示正常

---

## 🎉 完成！

项目已成功推送到 GitHub！

**下一步**:
1. 分享仓库链接给团队
2. 添加 collaborators
3. 开始 Phase 2 开发
4. 配置 CI/CD（可选）

**仓库链接**: `https://github.com/YOUR_USERNAME/suvernire-plus`

---

**需要帮助?** 查看 `GITHUB-SETUP-GUIDE.md` 了解更多最佳实践。

