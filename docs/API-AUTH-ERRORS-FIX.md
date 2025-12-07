# API 认证错误修复总结

**修复时间**: 2025-12-07 08:00:00  
**状态**: ✅ **已修复**

---

## 错误分析

### 1. 401 错误（未授权）
- **错误**: `/api/auth/me` 返回 401
- **原因**: 前端调用 API 时没有传递 Authorization token
- **影响**: 用户无法获取当前登录状态

### 2. 403 错误（禁止访问）
- **错误**: 
  - `/api/proxy/admin/offline-orders/config/stages` 返回 403
  - `/api/proxy/admin/offline-order-colors` 返回 403
  - `/api/proxy/admin/offline-order-products` 返回 403
- **原因**: 
  1. 前端直接使用 `fetch` 时没有传递 token
  2. 用户角色权限不足（需要 SALES_MANAGER 或 ADMIN）
- **影响**: Sales 用户无法访问配置接口

### 3. 404 错误（资源未找到）
- **错误**: 某些资源返回 404
- **原因**: 可能是路由配置问题或资源不存在
- **影响**: 部分功能无法正常使用

### 4. 500 错误（服务器内部错误）
- **错误**: `/api/proxy/sales/orders/.../status` 返回 500
- **原因**: 后端查询订单时缺少 `rushOrder` 字段，导致访问 `order.rushOrder` 时出错
- **影响**: 无法更新订单状态

---

## 修复方案

### 1. 创建统一的认证 fetch 函数

**文件**: `apps/web/src/lib/api.ts`

```typescript
// [2025-12-07 08:00:00] 创建带认证的 fetch 辅助函数
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
```

### 2. 修复直接使用 fetch 的地方

**文件**: `apps/web/src/app/offline-orders/sales/orders/page.tsx`

```typescript
// 修复前
const stagesRes = await fetch('/api/proxy/admin/offline-orders/config/stages', {
  credentials: 'include',
})

// 修复后
const { authenticatedFetch } = await import('@/lib/api');
const stagesRes = await authenticatedFetch('/api/proxy/admin/offline-orders/config/stages')
```

**文件**: `apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx`

```typescript
// 修复前
fetch(`${API_BASE_URL}/admin/offline-orders/config/stages`)

// 修复后
authenticatedFetch('/api/proxy/admin/offline-orders/config/stages')
```

### 3. 修复后端 500 错误

**文件**: `backend/src/controllers/salesOrderController.js`

```javascript
// 修复前
const order = await prisma.offlineOrder.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    metadata: true,
  },
});
// 访问 order.rushOrder 时会出错（字段不存在）

// 修复后
const order = await prisma.offlineOrder.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    rushOrder: true, // [2025-12-07 08:00:00] 添加 rushOrder 字段
    metadata: true,
  },
});
```

---

## 修复验证

### 验证步骤

1. **401 错误修复**:
   - ✅ 打开浏览器控制台
   - ✅ 检查 `/api/auth/me` 请求是否包含 `Authorization: Bearer <token>` header
   - ✅ 确认不再出现 401 错误

2. **403 错误修复**:
   - ✅ 使用 Sales 用户登录
   - ✅ 访问 Sales Orders 页面
   - ✅ 检查是否能够正常加载配置（stages, colors, products）
   - ✅ 确认不再出现 403 错误

3. **500 错误修复**:
   - ✅ 在 Sales Orders 页面更新订单状态
   - ✅ 检查是否能够成功更新
   - ✅ 确认不再出现 500 错误

---

## 最佳实践

### 1. 统一使用 authenticatedFetch

**所有需要认证的 API 调用都应该使用 `authenticatedFetch` 或 `api` 函数**：

```typescript
// ✅ 正确：使用 authenticatedFetch
import { authenticatedFetch } from '@/lib/api';
const response = await authenticatedFetch('/api/proxy/admin/...');

// ✅ 正确：使用 api 函数（内部已处理 token）
import { adminApi } from '@/lib/api';
const data = await adminApi.getProducts();

// ❌ 错误：直接使用 fetch 且不传递 token
const response = await fetch('/api/proxy/admin/...');
```

### 2. Token 管理

- Token 存储在 `localStorage` 中，key 为 `auth_token`
- 使用 `getAuthToken()` 获取 token
- 使用 `setAuthToken(token)` 设置 token
- 使用 `clearAuthToken()` 清除 token

### 3. 错误处理

- 401 错误：用户未登录，应该重定向到登录页
- 403 错误：用户已登录但权限不足，应该显示权限不足提示
- 500 错误：服务器内部错误，应该显示错误信息并记录日志

---

## 相关文件

- `apps/web/src/lib/api.ts` - API 客户端和认证函数
- `apps/web/src/app/api/proxy/[...path]/route.ts` - API 代理路由
- `apps/web/src/app/api/auth/me/route.ts` - 用户信息 API 路由
- `apps/web/src/app/offline-orders/sales/orders/page.tsx` - Sales Orders 页面
- `apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx` - Sales Order Detail 页面
- `backend/src/controllers/salesOrderController.js` - Sales Orders 控制器
- `backend/src/routes/salesOrders.js` - Sales Orders 路由

---

## 后续优化建议

1. **统一错误处理**: 创建统一的错误处理中间件
2. **Token 刷新**: 实现 token 自动刷新机制
3. **权限检查**: 在前端添加权限检查组件
4. **错误监控**: 集成错误监控服务（如 Sentry）

