# Netlify 部署问题修复总结
[2025-01-27 12:00:00]

## 问题分析

首页消失的可能原因：

1. **发布目录配置错误** - Netlify 可能指向了错误的目录
2. **构建模式不匹配** - Next.js 14 App Router 需要正确的输出配置
3. **路由重定向配置错误** - 所有路由需要正确回退到 index.html
4. **环境变量缺失** - `NETLIFY=true` 未设置导致未启用静态导出

## 已完成的修复

### 1. 创建了 `netlify.toml` 配置文件
- 配置了静态导出模式 (`output: 'export'`)
- 设置了正确的发布目录 (`out`)
- 配置了路由重定向规则
- 添加了静态资源缓存头

### 2. 更新了 `next.config.mjs`
- 添加了 Netlify 环境检测
- 配置了静态导出模式
- 禁用了图片优化（静态导出需要）

### 3. 创建了部署文档
- `docs/NETLIFY-DEPLOYMENT.md` - 详细的部署和故障排查指南

## 立即需要执行的步骤

### 步骤 1: 更新 Netlify 控制台设置

1. 登录 Netlify 控制台
2. 进入你的站点设置
3. 前往 **Site settings > Build & deploy > Build settings**
4. 更新以下设置：
   - **Base directory**: `apps/web` ⚠️ **重要：必须设置**
   - **Build command**: `npm install && npm run build`（或留空，使用 netlify.toml 中的配置）
   - **Publish directory**: `out` ⚠️ **重要：必须是 `out`**

**注意**：`netlify.toml` 现在位于 `apps/web` 目录下，Netlify 会自动检测并使用它。

### 步骤 2: 设置环境变量

1. 在 Netlify 控制台，前往 **Site settings > Build & deploy > Environment variables**
2. 添加以下环境变量：
   - `NETLIFY` = `true` ⚠️ **必须设置**
   - `NEXT_PUBLIC_API_URL` = `你的后端API地址`（例如：`https://api.your-domain.com/api`）

### 步骤 3: 触发重新部署

1. 在 Netlify 控制台，前往 **Deploys** 页面
2. 点击 **Trigger deploy** > **Deploy site**
3. 等待构建完成
4. 检查构建日志，确认：
   - ✅ 构建成功
   - ✅ 发布目录是 `out`
   - ✅ 没有错误

### 步骤 4: 验证部署

访问 `https://souvenirplus.netlify.app/`，应该能看到首页。

如果仍然有问题，检查：
1. 浏览器控制台（F12）是否有错误
2. Network 标签中 `index.html` 是否返回 200
3. Netlify 构建日志中的完整错误信息

## 注意事项

### 静态导出模式的限制

使用静态导出模式 (`output: 'export'`) 后：
- ✅ 所有页面都会预渲染为静态 HTML
- ✅ 适合 Netlify 的静态托管
- ❌ **失去服务器端渲染（SSR）功能**
- ❌ **动态路由页面需要在构建时预生成**

### 动态路由页面

以下页面使用了动态路由，在静态导出模式下需要特殊处理：
- `/products/[slug]` - 产品详情页
- `/collections/[slug]` - 分类页
- `/orders/[orderNumber]` - 订单详情页
- `/admin/orders/[id]` - 管理员订单详情页

**当前状态**: 这些页面会在客户端运行时动态加载，但如果构建时 API 不可用，可能会显示错误。

**建议**: 如果这些页面需要 SEO，考虑：
1. 使用 `generateStaticParams` 预生成常用页面
2. 或使用 Netlify Functions + SSR 模式

## 如果问题仍然存在

### 替代方案：不使用 Base Directory

如果使用 base directory 仍然有问题，可以尝试以下方案：

1. **移除 Base Directory 设置**：
   - 在 Netlify 控制台，将 Base directory 留空
   - 在根目录创建 `netlify.toml`（如果还没有）
   - 设置构建命令为：`cd apps/web && npm install && npm run build`
   - 设置发布目录为：`apps/web/out`

2. **检查构建日志**：
   - 查看构建日志中是否有 `out` 目录生成的确认信息
   - 检查是否有依赖安装错误
   - 确认 `NETLIFY=true` 环境变量已设置

### 需要提供的信息

如果问题仍然存在，请提供以下信息以便进一步诊断：
1. Netlify 构建日志（完整输出）
2. 浏览器控制台错误信息（F12 > Console）
3. Network 标签中的请求详情（F12 > Network，刷新页面）
4. Netlify 控制台的 Build settings 截图

## 相关文件

- `netlify.toml` - Netlify 配置文件
- `apps/web/next.config.mjs` - Next.js 配置
- `docs/NETLIFY-DEPLOYMENT.md` - 详细部署指南

