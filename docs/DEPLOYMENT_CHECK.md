# 部署状态检查指南

## 快速检查

使用提供的检查脚本：

```bash
# 使用环境变量
FRONTEND_URL=https://your-site.netlify.app \
BACKEND_URL=https://your-backend.onrender.com \
node scripts/check-deployment.js

# 或直接传递参数
node scripts/check-deployment.js \
  https://your-site.netlify.app \
  https://your-backend.onrender.com
```

## 手动检查步骤

### 1. 检查前端 (Netlify)

1. 访问你的 Netlify 站点 URL
2. 检查页面是否正常加载
3. 打开浏览器开发者工具，查看 Network 标签
4. 检查是否有 API 请求失败

### 2. 检查后端 (Render)

1. 访问后端健康检查端点：
   ```
   https://your-backend.onrender.com/health
   ```
2. 应该返回 JSON 响应：
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-15T...",
     "uptime": 12345,
     "services": {
       "database": "connected",
       "redis": "not_configured"
     }
   }
   ```

### 3. 检查数据库 (Neon)

数据库连接状态会显示在后端健康检查响应中：
- `"database": "connected"` - ✅ 数据库连接正常
- `"database": "disconnected"` - ❌ 数据库连接失败

### 4. 检查前后端连接

1. 在 Netlify Dashboard 中检查环境变量：
   - 进入你的站点设置
   - 查看 Environment variables
   - 确认 `NEXT_PUBLIC_API_URL` 已设置
   - 值应该是：`https://your-backend.onrender.com/api`

2. 测试 API 连接：
   - 访问前端网站
   - 打开浏览器控制台
   - 查看是否有 API 请求错误
   - 尝试访问产品列表页面，检查是否能正常加载数据

## 常见问题

### 前端无法连接后端

**症状**：前端页面加载，但数据无法显示，控制台有 CORS 或网络错误

**解决方案**：
1. 确认 `NEXT_PUBLIC_API_URL` 环境变量已设置
2. 确认后端 URL 正确（包含 `/api` 后缀）
3. 检查后端 CORS 配置是否允许 Netlify 域名

### 后端无法连接数据库

**症状**：后端健康检查返回 `"database": "disconnected"`

**解决方案**：
1. 检查 Render 环境变量中的 `DATABASE_URL`
2. 确认 Neon 数据库正在运行
3. 检查数据库连接字符串格式是否正确

### Redis 连接错误

**症状**：日志中有 Redis 连接错误（但应用仍可运行）

**解决方案**：
- Redis 是可选的，不影响核心功能
- 如果需要缓存，可以在 Render 上创建 Redis 服务
- 或者忽略这些错误（应用会在没有 Redis 的情况下运行）

## 验证清单

- [ ] 前端网站可以访问
- [ ] 后端健康检查返回 `status: "ok"`
- [ ] 数据库状态为 `"connected"`
- [ ] Netlify 环境变量 `NEXT_PUBLIC_API_URL` 已设置
- [ ] 前端可以成功调用后端 API
- [ ] 管理员登录功能正常
- [ ] 产品列表可以正常显示

## 获取部署 URL

### Netlify 前端 URL
1. 登录 Netlify Dashboard
2. 选择你的站点
3. 在 Overview 页面可以看到站点 URL

### Render 后端 URL
1. 登录 Render Dashboard
2. 选择你的 Web Service
3. 在 Overview 页面可以看到服务 URL

### Neon 数据库 URL
1. 登录 Neon Dashboard
2. 选择你的数据库
3. 在 Connection Details 可以看到连接字符串

