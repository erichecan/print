# Next.js API 路由 404 错误修复日志

**时间**: 2025-01-27 22:10:00  
**问题**: `GET http://localhost:3000/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c 404 (Not Found)`

---

## 🔍 问题分析

### 错误信息
```json
{
  "success": false,
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Route not found",
  "path": "/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c"
}
```

### 可能原因

1. **Next.js 开发服务器未识别路由**
   - 路由文件已创建但服务器未重新编译
   - 需要重启开发服务器

2. **路由文件路径问题**
   - 文件路径：`apps/web/src/app/api/products/variant/[variantId]/route.ts`
   - Next.js 13+ App Router 要求特定的文件结构

3. **路由参数解析问题**
   - Next.js 13+ 使用 `params` 作为 Promise
   - 需要 await params

---

## ✅ 修复步骤

### 1. 检查路由文件

**文件路径**: `apps/web/src/app/api/products/variant/[variantId]/route.ts`

**文件结构**:
```
apps/web/src/app/api/
  └── products/
      └── variant/
          └── [variantId]/
              └── route.ts
```

### 2. 更新路由处理函数

Next.js 13+ App Router 中，`params` 是一个 Promise，需要 await：

```typescript
// ❌ 旧版本（Next.js 12）
export async function GET(_request: Request, { params }: RouteParams) {
  const { variantId } = params;
  // ...
}

// ✅ 新版本（Next.js 13+）
export async function GET(_request: Request, { params }: RouteParams) {
  const { variantId } = await params;
  // ...
}
```

### 3. 重启开发服务器

```bash
# 停止当前服务器
pkill -f "next dev"

# 重新启动
cd apps/web && npm run dev
```

---

## 🔧 修复后的代码

### route.ts

```typescript
import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'http://localhost:3001/api';

const API_BASE =
  (process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_API_BASE)
    .replace(/\/$/, '');

type RouteParams = {
  params: Promise<{
    variantId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  const { variantId } = await params; // ⚠️ 重要：需要 await

  console.log('[Next.js API Route] GET /api/products/variant/[variantId]', {
    variantId,
    apiBase: API_BASE,
    timestamp
  });

  // ... 其余代码
}
```

---

## 📊 验证步骤

### 1. 检查服务器日志

重启后，应该看到：
```
[Next.js API Route] GET /api/products/variant/[variantId]
[Next.js API Route] Fetching from upstream: { url: "..." }
[Next.js API Route] Upstream response: { status: 200, ... }
```

### 2. 测试 API 端点

```bash
curl http://localhost:3000/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c
```

应该返回：
```json
{
  "productId": "...",
  "productName": "...",
  "variantId": "...",
  "baseImages": { ... }
}
```

### 3. 检查浏览器控制台

应该看到：
```
[Store] API Response: { status: 200, ... }
[Store] API Success - Response Data: { ... }
```

---

## 🐛 常见问题

### 问题 1: 仍然返回 404

**解决方案**:
1. 确认路由文件路径正确
2. 确认文件名为 `route.ts`（不是 `routes.ts`）
3. 重启开发服务器
4. 清除 `.next` 缓存：`rm -rf apps/web/.next`

### 问题 2: 参数未定义

**解决方案**:
- 确保使用 `await params`（Next.js 13+）
- 检查参数名称是否匹配：`[variantId]` → `params.variantId`

### 问题 3: 上游 API 错误

**解决方案**:
- 检查后端服务是否运行：`curl http://localhost:3001/api/products/variant/...`
- 检查环境变量：`NEXT_PUBLIC_API_BASE_URL` 或 `API_BASE_URL`

---

## 📝 相关文件

- `apps/web/src/app/api/products/variant/[variantId]/route.ts` - Next.js API 路由
- `backend/src/routes/products.js` - 后端路由定义
- `backend/src/controllers/productController.js` - 后端控制器
- `apps/web/public/design-lab-native/store.js` - 前端 Store

---

## ✅ 修复完成检查清单

- [ ] 路由文件路径正确
- [ ] 使用 `await params`（Next.js 13+）
- [ ] 开发服务器已重启
- [ ] API 端点返回 200 状态码
- [ ] 浏览器控制台无错误
- [ ] 图片正常加载

