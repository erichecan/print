# API 连接错误修复总结
[2025-12-07 13:50:00] 修复本地开发和生产环境的 API 连接错误

## 🔍 发现的问题

### 1. 本地开发环境错误
- **错误信息**: `GET http://localhost:3001/api/content net::ERR_CONNECTION_REFUSED`
- **错误信息**: `GET http://localhost:3001/api/products net::ERR_CONNECTION_REFUSED`
- **原因**: 后端服务器（localhost:3001）没有运行

### 2. 生产环境 API 代理错误
- **错误信息**: `GET https://print-main-frontend-234065158862.us-central1.run.app/api/proxy/cart 500 (Internal Server Error)`
- **原因**: 
  - 后端 API 地址配置不正确（使用了错误的域名）
  - API 代理路由的错误处理不够完善

## ✅ 已完成的修复

### 1. 修复生产环境后端 API 地址配置

**文件**: `apps/web/src/lib/api-route-config.ts`
- ✅ 更新后端 API 地址为正确的域名：`https://print-main-backend-234065158862.us-central1.run.app/api`
- ✅ 之前使用了错误的域名：`https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api`

**文件**: `apps/web/src/lib/api-config.ts`
- ✅ 修复 Cloud Run 生产环境的 API 配置
- ✅ 使用前端代理路由（`/api`）而不是直接连接后端，确保 Cookie 和认证正确传递

### 2. 改进错误处理

**文件**: `apps/web/src/lib/api.ts`
- ✅ 添加更友好的网络错误提示
- ✅ 本地开发环境：提示用户启动后端服务器
- ✅ 生产环境：提供通用的错误提示

**文件**: `apps/web/src/app/api/proxy/[...path]/route.ts`
- ✅ 改进 API 代理路由的错误处理
- ✅ 添加更详细的错误日志（开发环境）
- ✅ 提供中文错误消息，提升用户体验

### 3. 错误处理改进详情

#### 本地开发环境
- 当后端服务器未运行时，显示友好的错误提示：
  ```
  无法连接到后端服务器。请确保后端服务器正在运行（端口 3001）。
  运行命令：cd backend && npm run dev
  ```

#### 生产环境
- API 代理连接失败时，返回清晰的错误信息：
  ```json
  {
    "error": "无法连接到后端服务器",
    "message": "请检查后端服务是否正在运行"
  }
  ```

## 🚀 本地开发环境启动指南

### 方法 1：使用启动脚本（推荐）

```bash
# 在项目根目录运行
./scripts/start-dev.sh
```

这个脚本会：
1. 检查并安装依赖
2. 创建必要的环境变量文件
3. 启动后端服务器（端口 3001）
4. 启动前端服务器（端口 3000）

### 方法 2：手动启动

#### 启动后端服务器

```bash
# 进入后端目录
cd backend

# 安装依赖（如果还没有安装）
npm install

# 启动开发服务器
npm run dev
```

后端服务器将在 `http://localhost:3001` 启动。

#### 启动前端服务器

在另一个终端窗口：

```bash
# 进入前端目录
cd apps/web

# 安装依赖（如果还没有安装）
npm install

# 启动开发服务器
npm run dev
```

前端服务器将在 `http://localhost:3000` 启动。

### 验证启动

1. **后端健康检查**:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **前端访问**:
   打开浏览器访问 `http://localhost:3000`

3. **检查控制台**:
   - 前端控制台应该不再显示 `ERR_CONNECTION_REFUSED` 错误
   - API 请求应该成功返回数据

## 🔧 生产环境配置

### 后端 API 地址

生产环境的后端 API 地址已更新为：
```
https://print-main-backend-234065158862.us-central1.run.app/api
```

### 前端代理配置

前端使用 Next.js API 路由代理所有需要认证的 API 请求：
- `/api/proxy/*` → 代理到后端 API
- `/api/auth/*` → 代理到后端认证 API
- `/api/content` → 代理到后端内容 API
- `/api/products` → 代理到后端产品 API

### 环境变量

确保生产环境设置了以下环境变量：

```bash
NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app
API_BASE_URL=https://print-main-backend-234065158862.us-central1.run.app
```

## 📊 修复后的行为

### 本地开发环境
- ✅ 前端正确连接到 `http://localhost:3001/api`
- ✅ 后端服务器未运行时，显示友好的错误提示
- ✅ 网络错误有清晰的错误消息

### 生产环境
- ✅ 前端使用 `/api/proxy/*` 路由代理请求
- ✅ 后端 API 地址配置正确
- ✅ 错误处理更加完善，提供清晰的错误信息
- ✅ 日志记录更详细，便于调试

## 🧪 测试清单

### 本地开发环境测试
- [ ] 启动后端服务器：`cd backend && npm run dev`
- [ ] 启动前端服务器：`cd apps/web && npm run dev`
- [ ] 访问 `http://localhost:3000`
- [ ] 检查浏览器控制台，确认没有 `ERR_CONNECTION_REFUSED` 错误
- [ ] 测试产品列表加载
- [ ] 测试购物车功能
- [ ] 测试用户认证

### 生产环境测试
- [ ] 访问生产环境前端 URL
- [ ] 检查浏览器控制台，确认 API 请求成功
- [ ] 测试产品列表加载
- [ ] 测试购物车功能
- [ ] 测试用户认证
- [ ] 检查服务器日志，确认 API 代理正常工作

## 📝 相关文件

- `apps/web/src/lib/api-config.ts` - 前端 API 配置
- `apps/web/src/lib/api-route-config.ts` - Next.js API 路由配置
- `apps/web/src/lib/api.ts` - API 客户端
- `apps/web/src/app/api/proxy/[...path]/route.ts` - API 代理路由
- `apps/web/src/app/api/content/route.ts` - 内容 API 代理
- `scripts/start-dev.sh` - 开发环境启动脚本

## 🔄 后续改进建议

1. **添加健康检查**:
   - 前端启动时检查后端服务器是否可用
   - 如果后端不可用，显示友好的提示页面

2. **改进错误重试**:
   - 对于网络错误，自动重试
   - 添加指数退避策略

3. **监控和告警**:
   - 添加 API 请求监控
   - 设置错误率告警

4. **文档完善**:
   - 添加开发环境故障排查指南
   - 添加生产环境部署检查清单

