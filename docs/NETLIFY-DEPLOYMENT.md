# Netlify 部署指南
[2025-01-27 12:00:00] Netlify 部署配置和故障排查指南

## 问题诊断：首页消失

如果部署后首页显示空白或 404，请按以下步骤排查：

### 1. 检查 Netlify 构建日志

在 Netlify 控制台的 "Deploys" 页面查看构建日志，确认：
- ✅ 构建是否成功完成
- ✅ 是否有错误或警告
- ✅ 发布目录是否正确（应该是 `out`）

### 2. 检查 Netlify 控制台设置

确保以下设置正确：

**Site settings > Build & deploy > Build settings:**
- **Base directory**: `apps/web`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `out`

**Site settings > Build & deploy > Environment variables:**
- `NETLIFY=true` （必须设置）
- `NEXT_PUBLIC_API_URL=https://your-backend-api.com/api` （根据实际情况设置）

### 3. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- **Console** 标签：是否有 JavaScript 错误
- **Network** 标签：检查资源加载情况
  - `index.html` 是否返回 200
  - CSS/JS 文件是否正常加载
  - 图片资源是否正常加载

### 4. 常见问题及解决方案

#### 问题 1: 构建失败 - "Cannot find module"

**原因**: 依赖未正确安装

**解决方案**:
```bash
# 在本地测试构建
cd apps/web
npm install
npm run build
```

#### 问题 2: 首页返回 404

**原因**: 发布目录配置错误

**解决方案**:
- 确认 Netlify 控制台的 "Publish directory" 设置为 `out`
- 确认 `netlify.toml` 中的 `publish = "out"`

#### 问题 3: 页面空白但无错误

**原因**: 可能是客户端路由问题或 API 连接失败

**解决方案**:
1. 检查 `NEXT_PUBLIC_API_URL` 环境变量是否正确设置
2. 检查后端 API 是否可访问
3. 查看浏览器 Network 标签，确认 API 请求是否成功

#### 问题 4: 静态资源加载失败

**原因**: 路径配置错误

**解决方案**:
- 确认 `netlify.toml` 中的重定向规则正确
- 检查资源路径是否为绝对路径（以 `/` 开头）

### 5. 本地测试静态导出

在部署前，可以在本地测试静态导出：

```bash
cd apps/web
export NETLIFY=true
npm run build
# 构建完成后，检查 out 目录是否存在 index.html
ls -la out/
```

### 6. 验证部署

部署成功后，访问以下 URL 验证：
- 首页: `https://your-site.netlify.app/`
- 产品页: `https://your-site.netlify.app/products`
- 分类页: `https://your-site.netlify.app/collections/t-shirts`

### 7. 回滚方案

如果部署出现问题，可以在 Netlify 控制台：
1. 进入 "Deploys" 页面
2. 找到之前成功的部署
3. 点击 "..." 菜单，选择 "Publish deploy"

## 配置说明

### netlify.toml

当前配置使用 **静态导出模式** (`output: 'export'`)，这意味着：
- ✅ 所有页面都会预渲染为静态 HTML
- ✅ 适合 Netlify 的静态托管
- ❌ 失去服务器端渲染（SSR）功能
- ❌ 失去 API Routes（需要使用外部后端）

### 如果需要 SSR 功能

如果某些页面需要 SSR，可以考虑：
1. 使用 `@netlify/next` 插件（推荐）
2. 或使用 Netlify Functions + standalone 模式
3. 或将这些页面改为客户端渲染

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. Netlify 构建日志（完整输出）
2. 浏览器控制台错误信息
3. Network 标签的请求详情

