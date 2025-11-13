# Netlify 部署问题诊断
[2025-01-27 12:30:00]

## 当前目录结构

```
print/
├── apps/
│   └── web/                    # Next.js 前端应用
│       ├── netlify.toml        # ✅ Netlify 配置文件（在这里）
│       ├── next.config.mjs     # Next.js 配置
│       ├── package.json
│       ├── src/
│       │   └── app/
│       │       └── page.tsx    # ✅ 首页存在
│       └── public/             # 静态资源
├── backend/                    # Express 后端
└── package.json                # Monorepo 根配置
```

## 问题：所有页面显示 404

### 可能的原因

1. **Netlify 没有正确读取 `apps/web/netlify.toml`**
   - 如果 base directory 设置为 `apps/web`，Netlify 应该在该目录查找 `netlify.toml`
   - 但可能 Netlify 控制台的设置覆盖了配置文件

2. **构建没有生成 `out` 目录**
   - 需要确认构建是否成功
   - 需要确认 `NETLIFY=true` 环境变量是否设置

3. **路由重定向规则不正确**
   - Next.js App Router 静态导出需要特殊处理

4. **发布目录路径错误**
   - 如果 base directory 是 `apps/web`，publish 应该是 `out`（相对路径）

## 解决方案

### 方案 1: 确保 Netlify 控制台设置正确

在 Netlify 控制台：
- **Base directory**: `apps/web`
- **Build command**: （留空，使用 netlify.toml 中的配置）
- **Publish directory**: `out`

### 方案 2: 将 netlify.toml 移到根目录

如果方案 1 不行，将 `netlify.toml` 移到根目录，并更新配置：

```toml
[build]
  base = "apps/web"
  command = "npm install && npm run build"
  publish = "apps/web/out"
```

### 方案 3: 不使用 base directory

在根目录创建 `netlify.toml`：

```toml
[build]
  command = "cd apps/web && npm install && npm run build"
  publish = "apps/web/out"
```

## 检查清单

- [ ] Netlify 控制台的 Base directory 设置为 `apps/web`
- [ ] Netlify 控制台的 Publish directory 设置为 `out`
- [ ] 环境变量 `NETLIFY=true` 已设置
- [ ] 构建日志显示构建成功
- [ ] 构建日志显示 `out` 目录已生成
- [ ] 浏览器访问 `https://your-site.netlify.app/` 返回 200（不是 404）

