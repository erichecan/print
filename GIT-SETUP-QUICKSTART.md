# Git 快速设置指南
**项目**: suvernire plus E-commerce Platform  
**日期**: 2025-11-01

---

## 🚀 3步完成 GitHub 设置

### **前提条件**

1. **安装 Git**（如果未安装）
   - 下载: https://git-scm.com/download/win
   - 运行安装程序（使用默认设置）
   - 重启 PowerShell

2. **创建 GitHub 仓库**
   - 访问: https://github.com/new
   - 仓库名称: `suvernire-plus`
   - 描述: Custom merchandise e-commerce platform
   - 不要勾选任何初始化选项
   - 点击 "Create repository"

---

## 📝 手动执行命令

### **打开 PowerShell**
在项目目录 `C:\Users\eric\Desktop\print` 中打开 PowerShell

### **步骤 1: 配置 Git（首次使用）**

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### **步骤 2: 初始化仓库**

```powershell
git init
```

### **步骤 3: 添加所有文件**

```powershell
git add .
```

### **步骤 4: 创建提交**

```powershell
git commit -m "feat: Initial commit - Phase 1 complete"
```

### **步骤 5: 添加远程仓库**

**替换 YOUR_USERNAME 为您的 GitHub 用户名**

```powershell
git remote add origin https://github.com/YOUR_USERNAME/suvernire-plus.git
```

### **步骤 6: 推送到 GitHub**

```powershell
git branch -M main
git push -u origin main
```

---

## ✅ 验证成功

访问您的仓库：
```
https://github.com/YOUR_USERNAME/suvernire-plus
```

应该看到所有文件已上传。

---

## 📦 后续工作流程

### **日常开发**

```powershell
# 1. 创建功能分支
git checkout -b feature/new-feature-name

# 2. 修改文件
# ... 编辑代码 ...

# 3. 提交变更
git add .
git commit -m "feat: description of changes"

# 4. 推送到 GitHub
git push -u origin feature/new-feature-name
```

### **更新主分支**

```powershell
# 切换到 main
git checkout main

# 拉取最新代码
git pull origin main
```

---

## 🐛 常见问题

### "git command not found"
**解决**: 安装 Git 并重启 PowerShell

### "fatal: not a git repository"
**解决**: 在项目目录执行 `git init`

### "fatal: remote origin already exists"
**解决**: 
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/suvernire-plus.git
```

### "error: failed to push"
**解决**: 
```powershell
git pull origin main --rebase
git push origin main
```

---

## 📚 完整文档

- `GITHUB-SETUP-GUIDE.md` - 详细的最佳实践
- `GITHUB-INITIALIZATION.md` - 完整的初始化流程

---

**就这么简单！** 🎉

