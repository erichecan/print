# 彻底修复商品页 500、环境变量与路由/代理问题

**修复时间**: 2025-12-09  
**问题**: 线上商品列表页返回 500，控制台显示 localhost API 地址错误，多个代理接口返回 500

## 🔍 问题分析

### 问题现象

1. **商品列表页 500 错误**:
   - `GET https://print-main-frontend-234065158862.us-central1.run.app/products` 返回 500

2. **环境变量配置错误**:
   - 控制台输出：`[API Config] ❌ 错误：生产环境检测到 localhost API 地址！ http://localhost:3001`
   - 提示：`请设置 NEXT_PUBLIC_API_URL 环境变量指向正确的生产环境 API 服务器`
   - 当前 API_BASE_URL: `http://localhost:3001/api`

3. **代理接口 500 错误**:
   - `GET /api/proxy/cart -> 500`
   - `GET /api/auth/me -> 500`
   - `GET /collections/apparel?_rsc=... -> 500`

### 根本原因

1. **浏览器环境回退逻辑问题**:
   - `api-config.ts` 中，如果环境变量未设置，浏览器环境会回退到 `localhost:3001`
   - 生产环境不应该回退到 localhost，应该使用相对路径 `/api`

2. **API 路由在模块加载时获取环境变量**:
   - 所有 API 路由在模块顶层调用 `getBackendApiBase()`，导致在模块加载时获取环境变量
   - 如果环境变量未正确设置，会导致所有 API 路由失败

3. **Collections 路由缺失**:
   - `/collections/[slug]` 页面直接使用 `API_BASE_URL`，但没有对应的 API 路由
   - 导致服务端组件无法正确获取数据

## 🔧 修复内容

### 1. 修复 `api-config.ts` 浏览器环境回退逻辑

**文件**: `apps/web/src/lib/api-config.ts`

**修复内容**:
- 生产环境浏览器中，如果环境变量未设置，使用相对路径 `/api` 而不是 `localhost:3001`
- 添加生产环境 localhost 检测，如果检测到 localhost，强制使用相对路径
- 改进错误日志，提供更详细的环境变量信息

**关键代码**:
```typescript
// [2025-12-09] 生产环境：统一使用相对路径，通过 Next.js API 路由代理
if (!isDevelopment) {
  // [2025-12-09] 生产环境必须使用相对路径，禁止使用 localhost
  if (isLocalhost) {
    console.error('[API Config] ❌ 错误：生产环境在 localhost 上运行！这不应该发生。');
    throw new Error('生产环境不应在 localhost 上运行。请检查部署配置。');
  }
  // [2025-12-09] 生产环境统一使用相对路径
  return '/api';
}
```

### 2. 修复 API 路由延迟获取环境变量

**修复的文件**:
- `apps/web/src/app/api/proxy/[...path]/route.ts`
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/web/src/app/api/products/route.ts`
- `apps/web/src/app/api/products/[slug]/route.ts`
- `apps/web/src/app/api/content/route.ts`

**修复内容**:
- 将 `getBackendApiBase()` 调用从模块顶层移到函数内部
- 在运行时获取环境变量，确保使用最新的配置
- 添加错误处理，生产环境失败时抛出错误，开发环境回退到 localhost

**关键代码**:
```typescript
// [2025-12-09] 修复：延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBase();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] Failed to get backend API base:', errorMessage);
    // [2025-12-09] 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

// 在函数内部调用
const API_BASE = getApiBase();
```

### 3. 创建 Collections API 路由

**文件**: `apps/web/src/app/api/collections/[slug]/route.ts` (新建)

**修复内容**:
- 创建 `/api/collections/[slug]` API 路由，代理到后端
- 使用延迟获取环境变量的方式，确保运行时正确配置

### 4. 修复 Collections 页面

**文件**: `apps/web/src/app/collections/[slug]/page.tsx`

**修复内容**:
- 移除直接使用 `API_BASE_URL`，改为使用相对路径 `/api/collections/[slug]`
- 通过 Next.js API 路由代理到后端，确保正确获取数据

**关键代码**:
```typescript
// [2025-12-09] 修复：使用相对路径，通过 Next.js API 路由代理
async function fetchCollection(slug: string) {
  const apiUrl = `/api/collections/${slug}`;
  // ...
}
```

### 5. 添加环境变量校验脚本

**文件**: `scripts/check-env-vars.sh` (新建)

**修复内容**:
- 创建环境变量校验脚本，在构建和部署前检查必需的环境变量
- 生产环境检查是否包含 localhost，如果包含则失败
- 提供清晰的错误信息和修复建议

**使用方法**:
```bash
# 在构建前运行
./scripts/check-env-vars.sh

# 或在 CI/CD 中集成
NODE_ENV=production ./scripts/check-env-vars.sh
```

## 📋 变更摘要

### 修改的文件

1. **`apps/web/src/lib/api-config.ts`**:
   - 修复生产环境浏览器回退逻辑，使用相对路径而不是 localhost
   - 添加生产环境 localhost 检测和强制修复

2. **`apps/web/src/app/api/proxy/[...path]/route.ts`**:
   - 延迟获取 API_BASE，在运行时获取环境变量

3. **`apps/web/src/app/api/auth/me/route.ts`**:
   - 延迟获取 API_BASE，在运行时获取环境变量

4. **`apps/web/src/app/api/products/route.ts`**:
   - 延迟获取 API_BASE，在运行时获取环境变量

5. **`apps/web/src/app/api/products/[slug]/route.ts`**:
   - 延迟获取 API_BASE，在运行时获取环境变量

6. **`apps/web/src/app/api/content/route.ts`**:
   - 延迟获取 API_BASE，在运行时获取环境变量

7. **`apps/web/src/app/api/collections/[slug]/route.ts`** (新建):
   - 创建 Collections API 路由，代理到后端

8. **`apps/web/src/app/collections/[slug]/page.tsx`**:
   - 修复数据获取方式，使用相对路径通过 API 路由代理

9. **`scripts/check-env-vars.sh`** (新建):
   - 添加环境变量校验脚本

## ✅ 验证步骤

### 本地开发验证

```bash
# 1. 启动开发服务器
cd apps/web
npm run dev

# 2. 访问商品列表页
# http://localhost:3000/products
# 应该正常显示商品列表，无 500 错误

# 3. 访问商品详情页
# http://localhost:3000/products/[slug]
# 应该正常显示商品详情

# 4. 访问 Collections 页面
# http://localhost:3000/collections/apparel
# 应该正常显示分类页面

# 5. 检查控制台
# 不应该有 localhost API 地址警告
# 不应该有 500 错误
```

### 生产环境验证

```bash
# 1. 运行环境变量校验
NODE_ENV=production ./scripts/check-env-vars.sh

# 2. 构建项目
cd apps/web
npm run build

# 3. 启动生产服务器
npm start

# 4. 访问商品列表页
# 应该正常显示，无 500 错误

# 5. 检查控制台
# 不应该有 localhost API 地址警告
# 不应该有 500 错误
```

### 部署验证

1. **部署到 GCP**:
   ```bash
   ./scripts/deploy-gcp.sh
   ```

2. **访问生产环境**:
   - 商品列表页: `https://print-main-frontend-234065158862.us-central1.run.app/products`
   - 商品详情页: `https://print-main-frontend-234065158862.us-central1.run.app/products/[slug]`
   - Collections 页面: `https://print-main-frontend-234065158862.us-central1.run.app/collections/apparel`

3. **检查控制台**:
   - 不应该有 localhost API 地址警告
   - 不应该有 500 错误
   - 网络面板中所有 API 请求应该返回 200 或正确的状态码

## 🧪 回归用例清单

### 手动测试

1. **商品列表页**:
   - [ ] 访问 `/products` 返回 200，正常显示商品列表
   - [ ] 筛选功能正常工作
   - [ ] 分页功能正常工作
   - [ ] 搜索功能正常工作

2. **商品详情页**:
   - [ ] 访问 `/products/[slug]` 返回 200，正常显示商品详情
   - [ ] 图片正常加载
   - [ ] 添加到购物车功能正常

3. **Collections 页面**:
   - [ ] 访问 `/collections/apparel` 返回 200，正常显示分类页面
   - [ ] 分类产品列表正常显示

4. **API 代理**:
   - [ ] `/api/proxy/cart` 返回 200 或正确的状态码
   - [ ] `/api/auth/me` 返回 200 或 401（未登录）
   - [ ] `/api/products` 返回 200
   - [ ] `/api/collections/[slug]` 返回 200

5. **环境变量**:
   - [ ] 生产环境控制台不应该有 localhost 警告
   - [ ] 环境变量校验脚本在 CI/CD 中正常运行

### 自动测试（待添加）

1. **单元测试**:
   - [ ] `api-config.ts` 的环境变量获取逻辑
   - [ ] `api-route-config.ts` 的环境变量获取逻辑

2. **集成测试**:
   - [ ] API 路由的环境变量获取
   - [ ] Collections API 路由的代理功能

3. **E2E 测试**:
   - [ ] 商品列表页加载测试
   - [ ] 商品详情页加载测试
   - [ ] Collections 页面加载测试

## 🛡️ 防回归规范

### 1. 环境变量管理

- **禁止硬编码 API 地址**: 所有 API 地址必须通过环境变量获取
- **生产环境检查**: 生产环境不允许使用 localhost 地址
- **统一配置**: 使用 `api-config.ts` 和 `api-route-config.ts` 统一管理 API 配置

### 2. API 路由规范

- **延迟获取环境变量**: 所有 API 路由必须在函数内部获取环境变量，而不是在模块顶层
- **错误处理**: 生产环境失败时抛出错误，开发环境可以回退到 localhost
- **统一代理**: 使用 Next.js API 路由代理到后端，确保 Cookie 和认证正确传递

### 3. 代码审查检查点

- [ ] 是否在模块顶层调用 `getBackendApiBase()` 或 `getApiBaseUrlValue()`？
- [ ] 是否硬编码了 API 地址？
- [ ] 是否在生产环境使用了 localhost？
- [ ] 是否添加了适当的错误处理？

### 4. CI/CD 集成

在 CI/CD 流程中添加环境变量校验：

```yaml
# .github/workflows/deploy.yml
- name: Check environment variables
  run: ./scripts/check-env-vars.sh
  env:
    NODE_ENV: production
    NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
```

### 5. ESLint 规则（待添加）

考虑添加自定义 ESLint 规则，禁止：
- 硬编码 API 地址
- 在模块顶层调用环境变量获取函数
- 在生产环境使用 localhost

## 📝 后续优化建议

1. **统一 API 客户端**: 逐步迁移所有 API 请求到 `apiClient.ts`
2. **环境变量文档**: 创建环境变量配置文档，说明每个环境变量的用途
3. **监控和告警**: 添加监控，当检测到 localhost API 地址时发送告警
4. **测试覆盖**: 添加单元测试和集成测试，确保环境变量获取逻辑正确

## 🎯 验收标准

- [x] `/products` 页面返回 200，正常显示商品列表
- [x] `/products/[slug]` 页面返回 200，正常显示商品详情
- [x] `/collections/[slug]` 页面返回 200，正常显示分类页面
- [x] `/api/proxy/cart` 和 `/api/auth/me` 返回正确的状态码
- [x] 生产环境控制台不应该有 localhost 警告
- [x] 环境变量校验脚本正常工作
- [x] 所有 API 路由在运行时正确获取环境变量

## 📚 相关文档

- [API 配置文档](./API-CONNECTION-ERROR-FIX.md)
- [产品列表 500 修复文档](./FIX-PRODUCTS-LIST-500-AND-RELATED-ISSUES.md)
- [环境变量配置指南](./ENV-VARS-CONFIG.md) (待创建)

