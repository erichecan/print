# API 代理 URL 重复问题修复

**修复时间**: 2025-12-07 08:10:00  
**状态**: ✅ **已修复**

---

## 问题分析

### 1. 403 错误（禁止访问）
- **错误**: `GET /api/proxy/admin/offline-order-products` 返回 403
- **原因**: 
  - 直接使用 `fetch` 时没有传递 `Authorization` token
  - 后端路由 `/api/admin/offline-order-products` 需要 `SALES_MANAGER` 或 `ADMIN` 权限
- **影响**: Sales 用户无法访问产品配置接口

### 2. 404 错误（URL 重复）
- **错误**: `POST https://print-main-backend-234065158862.us-central1.run.app/api/api/proxy/admin/offline-order-products` 返回 404
- **原因**: 
  - URL 中有重复的 `/api/api/proxy`
  - 当 `endpoint` 已经包含 `/api/proxy` 时，`api` 函数仍然会尝试拼接，导致重复
  - 在 SSR 环境下，`window.location.origin` 不可用，可能回退到 `API_BASE_URL`，导致 URL 错误
- **影响**: 无法正确调用 API

---

## 修复方案

### 1. 修复直接使用 fetch 的地方

**文件**: `apps/web/src/app/offline-orders/sales/orders/page.tsx`

**修复前**:
```typescript
const { data: productsData, mutate: mutateProducts } = useSWR(
  activeTab === 'config' && configTab === 'products' ? '/api/proxy/admin/offline-order-products' : null,
  async (url) => {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  }
);
```

**修复后**:
```typescript
const { data: productsData, mutate: mutateProducts } = useSWR(
  activeTab === 'config' && configTab === 'products' ? '/api/proxy/admin/offline-order-products' : null,
  async (url) => {
    const { authenticatedFetch } = await import('@/lib/api');
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  }
);
```

### 2. 修复 api 函数的 URL 拼接逻辑

**文件**: `apps/web/src/lib/api.ts`

**修复前**:
```typescript
const useProxy = requiresAuthProxy(endpoint);
const baseUrl = useProxy 
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : API_BASE_URL;
const requestUrl = useProxy 
  ? `${baseUrl}/api/proxy${endpoint}`
  : `${baseUrl}${endpoint}`;
```

**修复后**:
```typescript
// [2025-12-07 08:10:00] 修复：如果 endpoint 已经包含 /api/proxy，直接使用，避免重复拼接
const alreadyHasProxy = endpoint.startsWith('/api/proxy');
const useProxy = !alreadyHasProxy && requiresAuthProxy(endpoint);

let requestUrl: string;
if (alreadyHasProxy) {
  // endpoint 已经包含 /api/proxy，直接使用相对路径（Next.js 会处理）
  requestUrl = endpoint;
} else if (useProxy) {
  // 需要代理，添加 /api/proxy 前缀
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  requestUrl = `${baseUrl}/api/proxy${endpoint}`;
} else {
  // 不需要代理，直接使用 API_BASE_URL
  requestUrl = `${API_BASE_URL}${endpoint}`;
}
```

---

## 修复验证

### 验证步骤

1. **403 错误修复**:
   - ✅ 打开浏览器控制台
   - ✅ 检查 `/api/proxy/admin/offline-order-products` 请求是否包含 `Authorization: Bearer <token>` header
   - ✅ 确认不再出现 403 错误（如果用户有正确权限）

2. **404 错误修复**:
   - ✅ 在 Sales Orders 页面创建/更新产品
   - ✅ 检查网络请求，确认 URL 正确（不包含重复的 `/api/api/proxy`）
   - ✅ 确认不再出现 404 错误

---

## 最佳实践

### 1. 统一使用 authenticatedFetch 或 api 函数

**所有需要认证的 API 调用都应该使用 `authenticatedFetch` 或 `api` 函数**：

```typescript
// ✅ 正确：使用 authenticatedFetch
import { authenticatedFetch } from '@/lib/api';
const response = await authenticatedFetch('/api/proxy/admin/...');

// ✅ 正确：使用 api 函数（内部已处理 token 和 URL）
import api from '@/lib/api';
const data = await api('/api/proxy/admin/...', { method: 'POST', body: {...} });

// ❌ 错误：直接使用 fetch 且不传递 token
const response = await fetch('/api/proxy/admin/...');
```

### 2. URL 路径规范

- **使用代理路由**: 如果 endpoint 以 `/admin`、`/orders`、`/sales` 等开头，应该使用 `/api/proxy` 前缀
- **直接使用**: 如果 endpoint 已经包含 `/api/proxy`，直接使用，不要再次拼接
- **相对路径**: 在客户端使用相对路径（`/api/proxy/...`），Next.js 会自动处理

### 3. 权限检查

- 后端路由 `/api/admin/offline-order-products` 需要 `SALES_MANAGER` 或 `ADMIN` 权限
- 前端应该检查用户角色，只有有权限的用户才能访问相关功能

---

## 相关文件

- `apps/web/src/lib/api.ts` - API 客户端和认证函数
- `apps/web/src/app/offline-orders/sales/orders/page.tsx` - Sales Orders 页面
- `backend/src/routes/offlineOrderProducts.js` - 产品管理路由
- `backend/src/controllers/offlineOrderProductController.js` - 产品管理控制器

---

## 后续优化建议

1. **统一错误处理**: 创建统一的错误处理中间件
2. **权限检查**: 在前端添加权限检查组件，避免无权限用户访问
3. **URL 验证**: 添加 URL 验证逻辑，避免重复拼接
4. **类型安全**: 为 API 调用添加类型定义，避免 URL 错误

