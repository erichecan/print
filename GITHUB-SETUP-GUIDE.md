# GitHub 最佳实践指南
**项目**: suvernire plus E-commerce Platform  
**日期**: 2025-11-01

---

## 📚 Git 和 GitHub 最佳实践

### **1. 仓库初始化**

#### 检查 Git 安装
```bash
# 检查 Git 是否已安装
git --version

# 如果未安装，下载安装：
# https://git-scm.com/download/win
```

#### 配置 Git 用户信息（首次使用）
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### 初始化仓库
```bash
# 在项目根目录执行
git init

# 创建 .gitignore 文件（见下文）
# 首次提交
git add .
git commit -m "feat: Initial commit - Phase 1 complete"
```

---

## 📝 .gitignore 配置

### **标准 Node.js/Web 项目**

```gitignore
# 操作系统文件
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# IDE 和编辑器
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# 依赖和构建文件
node_modules/
package-lock.json
yarn.lock
dist/
build/
.next/
out/

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 日志
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 缓存
.cache/
.parcel-cache/
.npm/
.eslintcache

# 临时文件
tmp/
temp/
*.tmp

# 备份文件
*.bak
*.backup
*.old

# 数据库文件（本地）
*.db
*.sqlite
*.sqlite3

# 可选：Python（如果使用）
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# 可选：测试覆盖率
coverage/
.nyc_output/
.istanbul/

# 可选：文档构建
docs/_build/
site/

# 本地服务器文件
.python-http-server-port

# 许可证冲突文件
LICENSE-*
```

---

## 🌿 Git 分支策略

### **推荐分支模型**

```
main (或 master)
  ├── develop (开发主分支)
  │   ├── feature/design-lab-enhancements
  │   ├── feature/product-catalog
  │   ├── feature/admin-panel
  │   └── feature/checkout-flow
  │
  ├── release/v1.0.0 (发布前测试)
  │
  ├── hotfix/critical-bug-fix
  │
  └── bugfix/minor-issues
```

### **分支命名规范**

```
feature/    - 新功能
bugfix/     - Bug 修复
hotfix/     - 紧急修复
release/    - 发布版本
refactor/   - 代码重构
docs/       - 文档更新
test/       - 测试相关
chore/      - 构建/工具/杂项
```

---

## ✍️ 提交信息规范（Conventional Commits）

### **格式**
```
<type>(<scope>): <subject>

<body>

<footer>
```

### **Type 类型**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/依赖
- `ci`: CI/CD 配置
- `build`: 构建系统变更
- `revert`: 回滚

### **示例**
```bash
# 新功能
git commit -m "feat(design-lab): Add layers panel with reorder and delete"

# Bug 修复
git commit -m "fix(cart): Fix quantity update calculation"

# 文档
git commit -m "docs: Add API integration guide"

# 样式
git commit -m "style(home): Improve hero section spacing"

# 重构
git commit -m "refactor(admin): Simplify i18n implementation"

# 性能
git commit -m "perf(images): Optimize product thumbnails"

# 多个文件
git commit -m "feat: Complete shopping flow pages

- Add product listing with filters
- Implement cart management
- Create checkout process
- Add order confirmation

Closes #12"
```

---

## 🚀 GitHub 工作流程

### **1. 创建功能分支**
```bash
# 从 develop 创建新功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name
```

### **2. 开发并提交**
```bash
# 修改文件
# ...

# 查看变更
git status
git diff

# 暂存文件
git add <file>
# 或
git add .  # 暂存所有变更（注意检查）

# 提交
git commit -m "feat: description"

# 继续开发...
git add .
git commit -m "fix: minor adjustments"
```

### **3. 推送分支**
```bash
# 首次推送
git push -u origin feature/new-feature-name

# 后续推送
git push
```

### **4. 创建 Pull Request**
1. 在 GitHub 网页点击 "Compare & pull request"
2. 填写 PR 描述
3. 添加 reviewer
4. 链接相关 Issue
5. 等待 review 和 approval
6. Merge PR

### **5. 保持分支同步**
```bash
# 更新 develop
git checkout develop
git pull origin develop

# 合并到功能分支
git checkout feature/new-feature-name
git merge develop

# 或 rebase（保持历史干净）
git rebase develop
```

---

## 📋 Pull Request 模板

### **创建 `.github/pull_request_template.md`**

```markdown
## 📝 变更摘要
<!-- 简要描述本次 PR 的内容 -->

## 🎯 关联 Issue
Closes #<issue-number>

## 🔍 变更类型
<!-- 选择一项 -->
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 样式调整
- [ ] 测试相关

## 🧪 测试说明
<!-- 描述如何测试本次变更 -->

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成
- [ ] 响应式测试完成

## 📸 截图/演示
<!-- 如果有 UI 变更，请添加截图 -->

## ✅ 检查清单
- [ ] 代码遵循项目规范
- [ ] 已添加必要注释
- [ ] 已更新相关文档
- [ ] 已添加/更新测试
- [ ] 提交信息符合规范
- [ ] 无 console.log 调试代码
- [ ] 无敏感信息泄露

## 🎨 设计审查
<!-- 如果有 UI 变更 -->
- [ ] 设计符合规范
- [ ] 移动端适配正常
- [ ] 无障碍性考虑

## 📝 额外说明
<!-- 其他需要说明的内容 -->
```

---

## 🐛 Issue 模板

### **`.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
## 🐛 Bug 描述
<!-- 清晰描述 bug -->

## 🔄 复现步骤
1. 访问 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## ✅ 预期行为
<!-- 应该发生什么 -->

## 🖥️ 环境信息
- **OS**: Windows 10 / macOS / Linux
- **Browser**: Chrome / Firefox / Safari
- **Version**: 1.0.0
- **Device**: Desktop / Mobile

## 📸 截图
<!-- 如果有 -->

## 📝 额外信息
<!-- 其他有用信息 -->
```

### **`.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
## 💡 功能建议
<!-- 清晰描述想要的功能 -->

## 🎯 使用场景
<!-- 这个功能解决什么问题 -->

## 📝 详细描述
<!-- 详细说明功能需求 -->

## 💼 业务价值
<!-- 功能带来的价值 -->

## 🎨 设计参考
<!-- 如果有设计稿或参考 -->

## ✅ 验收标准
- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3
```

---

## 📊 README.md 模板

### **项目 README 应该包含**

```markdown
# Project Name

## 📝 简介
项目介绍...

## ✨ 功能
- 功能 1
- 功能 2
- 功能 3

## 🚀 快速开始

### 前置要求
- Node.js 16+
- Python 3.9+（用于本地服务器）

### 安装
\`\`\`bash
# 克隆仓库
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# 启动本地服务器
python -m http.server 8080
\`\`\`

### 访问
打开浏览器访问：http://localhost:8080

## 📁 项目结构
\`\`\`
project/
├── frontend/          # 前端页面
├── admin/            # 管理后台
├── assets/           # 静态资源
├── docs/             # 文档
└── README.md
\`\`\`

## 🛠️ 技术栈
- HTML5
- CSS3
- Vanilla JavaScript
- Python HTTP Server

## 📚 文档
- [API 规范](docs/API-SPEC.md)
- [数据库设计](docs/DATABASE-SCHEMA.md)
- [UI 指南](docs/style-guide.md)

## 🤝 贡献
欢迎提交 PR 和 Issue！

## 📄 许可证
MIT License

## 👤 作者
Your Name
```

---

## 🔒 安全最佳实践

### **1. 敏感信息保护**
```gitignore
# 永远不要提交
.env
.env.local
*.key
*.pem
config/secrets.json
```

### **2. 使用环境变量**
```javascript
// 正确
const API_KEY = process.env.API_KEY;

// 错误
const API_KEY = "sk_1234567890abcdef";
```

### **3. GitHub Secrets**
- Settings → Secrets → Actions
- 存储 API Keys、Tokens
- 在 CI/CD 中使用

### **4. 分支保护规则**
- Settings → Branches
- 启用 "Require pull request reviews"
- 启用 "Require status checks to pass"
- 启用 "Require linear history"

---

## 📈 项目管理

### **Labels 标签**
```
bug           - Bug 相关
enhancement   - 功能增强
documentation - 文档
question      - 问题
help wanted   - 需要帮助
good first issue - 新手友好
priority:high - 高优先级
priority:medium - 中优先级
priority:low  - 低优先级
```

### **Milestones 里程碑**
```
Phase 1: Frontend Development
Phase 2: Backend Development
Phase 3: Deployment
v1.0.0: First Release
```

### **Projects（看板）**
```
To Do     - 待开发
In Progress - 进行中
Review    - 代码审查
Done      - 已完成
```

---

## 🎯 针对本项目的工作流程

### **Phase 1: Frontend 分支**
```bash
# 初始化
git init
git add .
git commit -m "feat: Phase 1 - Complete frontend development"

# 创建 develop 分支
git checkout -b develop

# 推送
git remote add origin https://github.com/yourusername/suvernire-plus.git
git push -u origin main
git push -u origin develop
```

### **Phase 2: Backend 开发**
```bash
# 从 develop 创建功能分支
git checkout -b feature/api-integration

# 开发...
git commit -m "feat(api): Add product CRUD endpoints"

# 推送并创建 PR
git push -u origin feature/api-integration
# 在 GitHub 上创建 PR 到 develop
```

### **发布流程**
```bash
# 创建 release 分支
git checkout -b release/v1.0.0

# 测试和修复
git commit -m "fix: critical bug fixes"

# 合并到 main 和 develop
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin main --tags

git checkout develop
git merge release/v1.0.0
git push origin develop
```

---

## ✅ 检查清单

### **提交前检查**
- [ ] 代码通过 linting
- [ ] 无 console.log 调试代码
- [ ] 无敏感信息
- [ ] 已添加必要注释
- [ ] 提交信息符合规范
- [ ] 变更已测试

### **创建 PR 前检查**
- [ ] 分支已同步 develop
- [ ] 代码已自检
- [ ] 已添加测试
- [ ] PR 描述完整
- [ ] 已关联 Issue（如有）

### **合并前检查**
- [ ] CI 通过
- [ ] 代码审查通过
- [ ] 无冲突
- [ ] 已更新文档
- [ ] 已添加测试

---

## 📞 资源链接

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow 指南](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**遵循这些最佳实践，让项目更专业、更易维护！** 🚀

