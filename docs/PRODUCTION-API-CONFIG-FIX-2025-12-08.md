# 生产环境 API 配置修复报告

**修复时间**: 2025-12-08 01:30:00  
**问题**: 线上环境首页出现 localhost API 地址警告和 500 错误

## 🔍 问题分析

### 问题现象
1. **API 配置警告**：
   - 生产环境检测到 localhost API 地址
   - 当前 API_BASE_URL: `http://localhost:3001/api`
   - 警告提示需要设置 `NEXT_PUBLIC_API_URL` 环境变量

2. **API 请求失败**：
   - `/api/proxy/cart` 返回 500 错误
   - `localhost:3001/api/categories` 返回 500 错误（直接访问 localhost）
   - `/api/auth/me` 返回 401 错误（正常，未登录）

### 根本原因

1. **`next.config.mjs` 中的 `rewrites()` 配置问题**：
   - 如果 `NEXT_PUBLIC_API_URL` 未设置，会回退到 `http://localhost:3001`
   - 导致 `/api/proxy/*` 路由被重写到 localhost，在生产环境无法连接

2. **`api-config.ts` 中的环境变量读取逻辑问题**：
   - 如果构建时环境变量被设置为 localhost，运行时无法更改（`NEXT_PUBLIC_*` 在构建时内联）
   - 浏览器环境检测逻辑可能没有正确触发

3. **`api-route-config.ts` 中的后端地址不一致**：
   - 使用了不同的后端地址：`print-main-backend-hsbqzlnkxa-uc.a.run.app` 和 `print-main-backend-234065158862.us-central1.run.app`
   - 应该统一使用正确的前端域名对应的后端地址

## 🔧 修复内容

### 1. 修复 `next.config.mjs` 中的 rewrites 配置

**文件**: `apps/web/next.config.mjs`

**修复内容**:
- ✅ 添加生产环境检测，避免回退到 localhost
- ✅ 如果环境变量未设置且是生产环境，使用硬编码的后端地址
- ✅ 检查并替换 localhost 地址
- ✅ 确保 URL 格式正确（移除多余的 `/api` 后缀）

**关键代码**:
```javascript
async rewrites() {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      apiUrl = 'http://localhost:3001';
    } else {
      // 生产环境：使用硬编码的后端地址
      apiUrl = 'https://print-main-backend-234065158862.us-central1.run.app';
    }
  }
  
  // 检查并替换 localhost
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    apiUrl = 'https://print-main-backend-234065158862.us-central1.run.app';
  }
  
  // 确保 URL 不包含 /api 后缀
  apiUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // ... rewrites 配置
}
```

### 2. 修复 `api-config.ts` 中的环境变量读取逻辑

**文件**: `apps/web/src/lib/api-config.ts`

**修复内容**:
- ✅ 优先检查环境变量，如果包含 localhost（生产环境），使用硬编码后端地址
- ✅ 统一使用正确的前端域名对应的后端地址：`print-main-backend-234065158862.us-central1.run.app`
- ✅ 保持浏览器环境的 Cloud Run 检测逻辑（使用相对路径 `/api`）

**关键代码**:
```typescript
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (envUrl) {
    // 生产环境如果检测到 localhost，使用硬编码后端地址
    if (!isDevelopment && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      const backendApiUrl = 'https://print-main-backend-234065158862.us-central1.run.app/api';
      return backendApiUrl;
    }
    return normalizeApiUrl(envUrl);
  }
  
  // ... 其他逻辑
}
```

### 3. 修复 `api-route-config.ts` 中的后端地址

**文件**: `apps/web/src/lib/api-route-config.ts`

**修复内容**:
- ✅ 统一使用正确的前端域名对应的后端地址：`print-main-backend-234065158862.us-central1.run.app`
- ✅ 简化逻辑，统一处理 localhost 检测和替换
- ✅ 增强日志输出，便于调试

**关键代码**:
```typescript
export function getBackendApiBase(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 统一的后端地址
  const productionBackendUrl = 'https://print-main-backend-234065158862.us-central1.run.app/api';
  
  if (publicApiUrl) {
    // 生产环境如果包含 localhost，使用硬编码后端地址替代
    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
      return productionBackendUrl;
    }
    // ... 处理逻辑
  }
  
  // ... 其他逻辑
}
```

## 📋 验证步骤

### 1. 检查构建配置

确保 `cloudbuild.yaml` 中构建时传入正确的环境变量：
```yaml
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api \
  ...
```

### 2. 检查 Secret Manager

确保 Secret Manager 中的 `api-url` secret 包含正确的后端地址：
```bash
gcloud secrets versions access latest --secret=api-url
# 应该输出: https://print-main-backend-234065158862.us-central1.run.app/api
```

### 3. 验证线上环境

访问 https://print-main-frontend-234065158862.us-central1.run.app/ 并检查：
- ✅ 控制台不应该有 localhost API 地址警告
- ✅ `/api/proxy/cart` 应该正常返回（200 或 401，不应该 500）
- ✅ `/api/categories` 应该正常返回（200，不应该 500）
- ✅ 首页分类数据应该正常加载

## 🚀 部署建议

1. **重新构建和部署前端**：
   ```bash
   # 确保构建时传入正确的环境变量
   gcloud builds submit --config=cloudbuild.yaml
   ```

2. **验证环境变量**：
   ```bash
   # 检查 Cloud Run 服务的环境变量
   gcloud run services describe print-main-frontend \
     --region us-central1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```

3. **检查 Secret Manager**：
   ```bash
   # 更新 API URL secret（如果需要）
   echo -n "https://print-main-backend-234065158862.us-central1.run.app/api" | \
     gcloud secrets versions add api-url --data-file=-
   ```

## 📝 注意事项

1. **`NEXT_PUBLIC_*` 变量的特性**：
   - 这些变量在构建时内联到代码中
   - 运行时设置的环境变量不会生效
   - 必须在构建时传入正确的值

2. **浏览器环境的兜底逻辑**：
   - 代码中保留了浏览器环境的 Cloud Run 检测逻辑
   - 如果检测到 `print-main-frontend` 域名，会使用相对路径 `/api`
   - 这样可以利用 Next.js API 路由的代理功能

3. **后端地址一致性**：
   - 所有硬编码的后端地址都统一为：`https://print-main-backend-234065158862.us-central1.run.app`
   - 这个地址对应前端域名：`https://print-main-frontend-234065158862.us-central1.run.app`

## ✅ 修复完成

- [x] 修复 `next.config.mjs` 中的 rewrites 配置
- [x] 修复 `api-config.ts` 中的环境变量读取逻辑
- [x] 修复 `api-route-config.ts` 中的后端地址
- [x] 统一后端地址为正确的前端域名对应的后端地址
- [x] 添加生产环境 localhost 检测和替换逻辑

## 🔄 后续工作

1. 重新构建和部署前端服务
2. 验证线上环境是否正常
3. 如果仍有问题，检查 Secret Manager 中的值是否正确

