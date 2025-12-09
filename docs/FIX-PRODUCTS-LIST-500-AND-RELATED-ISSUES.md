# 彻底修复商品列表 500 与路由/图片/环境配置问题

**修复时间**: 2025-12-09  
**问题**: 商品列表页返回 500 错误，以及相关的路由、图片、环境配置问题

## 🔍 问题分析

### 问题现象

1. **商品列表页 500 错误**：
   - `GET https://print-main-frontend-234065158862.us-central1.run.app/products` 返回 500 (Internal Server Error)
   - 服务端组件中 `buildApiUrl` 函数使用 `new URL(path, API_BASE_URL)` 时，如果 `API_BASE_URL` 是相对路径（如 `/api`），会导致错误

2. **API URL 构建问题**：
   - 服务端组件中直接使用 `API_BASE_URL`（模块顶层导入），可能触发构建时检查
   - `new URL` 不支持相对路径作为 base URL

3. **错误处理不足**：
   - 缺少友好的错误状态显示
   - 缺少超时控制
   - 错误信息不够详细

### 根本原因

1. **服务端组件 API 调用问题**：
   - `buildApiUrl` 函数使用 `new URL(path, API_BASE_URL)`，当 `API_BASE_URL` 是相对路径时会失败
   - 服务端组件应该使用相对路径 `/api/products`，通过 Next.js API 路由代理

2. **客户端组件 API URL 构建**：
   - `ProductsClient.tsx` 中同样的问题，需要支持相对路径和绝对路径

3. **错误处理不完善**：
   - 缺少超时控制
   - 错误状态显示不够友好
   - 缺少重试机制

## 🔧 修复内容

### 1. 修复服务端组件 API URL 构建

**文件**: `apps/web/src/app/products/page.tsx`

**修复内容**:
- ✅ 移除模块顶层 `API_BASE_URL` 导入
- ✅ `buildApiUrl` 函数改为使用相对路径 `/api/...`，通过 Next.js API 路由代理
- ✅ 添加超时控制（使用 `AbortController` 而不是 `AbortSignal.timeout` 以确保兼容性）
- ✅ 改进错误处理和日志记录

**关键代码**:
```typescript
// [2025-12-09] 修复：在服务端组件中使用相对路径，通过 Next.js API 路由代理
function buildApiUrl(path: string, params: Record<string, string | undefined>) {
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(apiPath, 'http://localhost'); // 临时 base 用于构建 URL 和查询参数
  
  Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  
  // 返回相对路径格式：/api/products?page=1&limit=12
  const queryString = url.search;
  return `/api${apiPath}${queryString}`;
}
```

### 2. 修复客户端组件 API URL 构建

**文件**: `apps/web/src/app/products/ProductsClient.tsx`

**修复内容**:
- ✅ 支持相对路径和绝对路径
- ✅ 改进错误状态显示（添加重试按钮）
- ✅ 改进空状态显示

**关键代码**:
```typescript
// [2025-12-09] 修复：构建 API URL，支持相对路径和绝对路径
let apiUrl: string;
if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
  // 绝对 URL：使用 new URL
  const url = new URL('/products', API_BASE_URL);
  // ... 设置查询参数
  apiUrl = url.toString();
} else {
  // 相对路径：直接拼接
  const searchParams = new URLSearchParams();
  // ... 设置查询参数
  apiUrl = `${API_BASE_URL}/products?${searchParams.toString()}`;
}
```

### 3. 添加错误状态显示

**文件**: `apps/web/src/app/products/page.tsx`

**修复内容**:
- ✅ 添加友好的错误状态显示
- ✅ 提供重试和返回首页按钮
- ✅ 改进错误日志记录

**关键代码**:
```typescript
// [2025-12-09] 错误状态：如果获取产品失败，显示友好的错误提示
if (fetchError && !productsResponse) {
  return (
    <div className="catalog-page">
      <section className="plp-new">
        <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h1>无法加载商品列表</h1>
          <p>{fetchError}</p>
          <div>
            <Link href="/products">重试</Link>
            <Link href="/">返回首页</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
```

### 4. 改进超时控制

**文件**: `apps/web/src/app/products/page.tsx`

**修复内容**:
- ✅ 使用 `AbortController` 而不是 `AbortSignal.timeout`（确保兼容性）
- ✅ 添加超时错误处理
- ✅ 产品列表请求：10 秒超时
- ✅ 集合请求：5 秒超时

**关键代码**:
```typescript
// [2025-12-09] 创建超时控制器（兼容性处理）
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时

const response = await fetch(url, {
  cache: 'no-store',
  signal: controller.signal,
});

clearTimeout(timeoutId);
```

### 5. 创建统一的 API 客户端

**文件**: `apps/web/src/lib/apiClient.ts` (新建)

**修复内容**:
- ✅ 创建统一的 API 客户端，禁止硬编码 URL
- ✅ 支持相对路径和绝对路径
- ✅ 提供统一的错误处理和超时控制
- ✅ 提供 GET、POST、PUT、PATCH、DELETE 方法

**关键代码**:
```typescript
export async function apiClient<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    params?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    timeout?: number;
    credentials?: RequestCredentials;
  } = {}
): Promise<T> {
  // ... 实现
}
```

### 6. 修复 api-route-config.ts 语法错误

**文件**: `apps/web/src/lib/api-route-config.ts`

**修复内容**:
- ✅ 修复第 40 行的语法错误（缺少条件判断）

## 📋 变更摘要

### 修改的文件

1. **apps/web/src/app/products/page.tsx**
   - 移除模块顶层 `API_BASE_URL` 导入
   - 修复 `buildApiUrl` 函数，使用相对路径
   - 添加超时控制（使用 `AbortController`）
   - 改进错误处理和日志记录
   - 添加错误状态显示

2. **apps/web/src/app/products/ProductsClient.tsx**
   - 修复 API URL 构建，支持相对路径和绝对路径
   - 改进错误状态显示（添加重试按钮）
   - 改进空状态显示

3. **apps/web/src/lib/apiClient.ts** (新建)
   - 创建统一的 API 客户端
   - 提供统一的错误处理和超时控制

4. **apps/web/src/lib/api-route-config.ts**
   - 修复语法错误（第 40 行）

## ✅ 验证步骤

### 本地开发环境

1. **启动开发服务器**:
   ```bash
   cd apps/web
   npm run dev
   ```

2. **访问商品列表页**:
   - 打开 `http://localhost:3000/products`
   - 应该正常显示商品列表
   - 检查浏览器控制台，不应该有 500 错误

3. **测试错误处理**:
   - 停止后端服务器
   - 刷新商品列表页
   - 应该显示友好的错误提示，而不是白屏

4. **测试超时**:
   - 在 `fetchProducts` 中将超时时间改为 1 秒
   - 应该显示超时错误

### 生产环境

1. **部署到 GCP**:
   ```bash
   ./scripts/deploy-gcp.sh
   ```

2. **访问生产环境**:
   - 打开 `https://print-main-frontend-234065158862.us-central1.run.app/products`
   - 应该正常显示商品列表
   - 检查浏览器控制台，不应该有 500 错误

3. **测试错误处理**:
   - 模拟后端故障（停止后端服务）
   - 刷新商品列表页
   - 应该显示友好的错误提示

## 🧪 回归用例清单

### 自动测试

1. **商品列表页加载测试**:
   - 访问 `/products`，应该返回 200
   - 商品列表应该正常显示
   - 分页应该正常工作

2. **错误处理测试**:
   - 模拟后端故障，应该显示错误状态
   - 错误状态应该包含重试按钮

3. **空状态测试**:
   - 无商品时，应该显示空状态提示

### 手动测试

1. **商品列表页**:
   - [ ] 正常加载商品列表
   - [ ] 分页功能正常
   - [ ] 筛选功能正常
   - [ ] 搜索功能正常
   - [ ] 排序功能正常

2. **错误处理**:
   - [ ] 后端故障时显示错误提示
   - [ ] 错误提示包含重试按钮
   - [ ] 重试按钮可以正常工作

3. **商品详情页**:
   - [ ] 正常加载商品详情
   - [ ] router 导航正常工作
   - [ ] 图片正常显示

4. **图片显示**:
   - [ ] GCS 图片正常显示
   - [ ] Cloud Run 图片正常显示
   - [ ] 无效图片显示占位图

## 🛡️ 防回归规范

### Lint 规则

1. **禁止硬编码 API 地址**:
   - 所有 API 请求必须通过 `apiClient` 或使用相对路径
   - 禁止在代码中硬编码 `localhost:3001` 或生产环境地址

2. **服务端组件 API 调用**:
   - 服务端组件必须使用相对路径 `/api/...`
   - 禁止在服务端组件中直接使用 `API_BASE_URL`

3. **客户端组件 API 调用**:
   - 客户端组件可以使用 `API_BASE_URL`，但必须支持相对路径

### 测试要求

1. **单元测试**:
   - `buildApiUrl` 函数测试（相对路径和绝对路径）
   - `apiClient` 函数测试

2. **集成测试**:
   - 商品列表页加载测试
   - 错误处理测试
   - 超时处理测试

3. **E2E 测试**:
   - 商品列表页完整流程测试
   - 错误状态测试

### CI 检查

1. **构建时检查**:
   - 检查是否有硬编码的 API 地址
   - 检查服务端组件是否正确使用相对路径

2. **运行时检查**:
   - 检查生产环境是否正确配置环境变量
   - 检查 API 请求是否正常

## 📝 注意事项

1. **环境变量配置**:
   - 生产环境必须设置 `NEXT_PUBLIC_API_URL` 或 `API_BASE_URL`
   - 开发环境可以使用默认值 `http://localhost:3001/api`

2. **相对路径 vs 绝对路径**:
   - 服务端组件：使用相对路径 `/api/...`
   - 客户端组件：支持相对路径和绝对路径

3. **超时控制**:
   - 使用 `AbortController` 而不是 `AbortSignal.timeout`（确保兼容性）
   - 产品列表请求：10 秒超时
   - 集合请求：5 秒超时

4. **错误处理**:
   - 所有 API 请求都应该有错误处理
   - 错误状态应该显示友好的提示
   - 提供重试机制

## 🎯 后续优化

1. **统一 API 客户端**:
   - 逐步迁移所有 API 请求到 `apiClient`
   - 移除分散的 `fetch` 调用

2. **错误监控**:
   - 集成 Sentry 或其他错误监控服务
   - 记录详细的错误信息

3. **性能优化**:
   - 添加请求缓存
   - 优化图片加载

4. **测试覆盖**:
   - 增加单元测试覆盖率
   - 增加 E2E 测试用例

