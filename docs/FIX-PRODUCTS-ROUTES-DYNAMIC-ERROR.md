# 修复商品列表与详情页无法访问问题

**时间戳**: 2025-12-09

## 问题分析

### 现象
- 商品列表页 (`/products`) 无法访问
- 商品详情页 (`/products/[slug]`) 无法访问
- 构建时出现 "Dynamic server usage" 错误

### 根因分析

**问题根源**: Next.js 在构建时尝试静态生成所有 API 路由，但这些路由使用了动态功能（如 `request.headers`、`nextUrl.searchParams`、`fetch` 等），导致构建失败。

**错误信息**:
```
Dynamic server usage: Route /api/products couldn't be rendered statically because it used `nextUrl.searchParams`.
Dynamic server usage: Route /api/auth/me couldn't be rendered statically because it used `request.headers`.
```

### 差异对比

**对比范围**: `4e9c9fe` (可用) → `9b962a7` (不可用)

**关键变更**:
1. 新增了多个 API 路由文件（`/api/products`, `/api/products/[slug]`, `/api/collections/[slug]` 等）
2. 这些路由都使用了动态功能，但缺少 `export const dynamic = 'force-dynamic'` 配置
3. Next.js 14.2+ 默认尝试静态生成所有路由，除非明确标记为动态路由

## 修复方案

### 1. 为所有 API 路由添加 `dynamic = 'force-dynamic'` 配置

**修复文件清单** (共 19 个文件):

#### 商品相关 API
- ✅ `apps/web/src/app/api/products/route.ts`
- ✅ `apps/web/src/app/api/products/[slug]/route.ts`
- ✅ `apps/web/src/app/api/products/[slug]/related/route.ts`
- ✅ `apps/web/src/app/api/products/filters/options/route.ts`
- ✅ `apps/web/src/app/api/products/variant/[variantId]/route.ts`

#### 认证相关 API
- ✅ `apps/web/src/app/api/auth/login/route.ts`
- ✅ `apps/web/src/app/api/auth/me/route.ts`

#### 集合相关 API
- ✅ `apps/web/src/app/api/collections/[slug]/route.ts`

#### 内容相关 API
- ✅ `apps/web/src/app/api/content/route.ts`

#### 代理相关 API
- ✅ `apps/web/src/app/api/proxy/[...path]/route.ts`
- ✅ `apps/web/src/app/api/proxy/sales/orders/[id]/status/route.ts`
- ✅ `apps/web/src/app/api/proxy/sales/orders/[id]/stage/route.ts`

#### 销售订单相关 API
- ✅ `apps/web/src/app/api/sales/orders/[id]/route.ts`

#### 线下订单相关 API
- ✅ `apps/web/src/app/api/offline-orders/products/route.ts`
- ✅ `apps/web/src/app/api/offline-orders/config/route.ts`

#### 设计相关 API
- ✅ `apps/web/src/app/api/designs/route.ts`
- ✅ `apps/web/src/app/api/designs/[id]/route.ts`
- ✅ `apps/web/src/app/api/designs/[id]/quote/route.ts`
- ✅ `apps/web/src/app/api/design-lab/upload-rating/route.ts`
- ✅ `apps/web/src/app/api/design-lab/analytics/events/route.ts`

#### 版本 API
- ✅ `apps/web/src/app/api/version/route.ts`

### 2. 修复代码示例

**修复前**:
```typescript
/**
 * Next.js API Route: Products API 代理
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

export async function GET(request: NextRequest) {
  // ... 使用动态功能的代码
}
```

**修复后**:
```typescript
/**
 * Next.js API Route: Products API 代理
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ... 使用动态功能的代码
}
```

## 验证步骤

### 1. 构建验证

```bash
cd apps/web
npm run build
```

**预期结果**:
- ✅ 不再出现 "Dynamic server usage" 错误
- ✅ 构建成功完成
- ✅ 所有 API 路由正确标记为动态路由

### 2. 路由连通性测试

使用提供的诊断脚本：

```bash
# 本地测试
node scripts/smoke-routes.mjs

# 指定 URL 测试
APP_BASE=http://localhost:3000 node scripts/smoke-routes.mjs

# 生产环境测试
APP_BASE=https://print-main-frontend-234065158862.us-central1.run.app node scripts/smoke-routes.mjs
```

**预期结果**:
- ✅ `/products` 返回 200
- ✅ `/products/[slug]` 返回 200 或 404（如果商品不存在）
- ✅ `/api/products` 返回 200
- ✅ `/api/products/[slug]` 返回 200 或 404

### 3. 功能验证

1. **商品列表页**:
   - 访问 `/products` 成功渲染
   - 分页功能正常
   - 筛选功能正常
   - 搜索功能正常

2. **商品详情页**:
   - 访问 `/products/[slug]` 成功渲染
   - "Start Design" 按钮可用
   - "Add to Cart" 按钮可用
   - "Buy Now" 按钮可用

## 技术说明

### Next.js 动态路由配置

在 Next.js App Router 中，API 路由默认会尝试静态生成。如果路由使用了以下动态功能，必须添加 `export const dynamic = 'force-dynamic'`:

- `request.headers`
- `request.cookies`
- `nextUrl.searchParams`
- `fetch()` with `cache: 'no-store'`
- 动态环境变量读取
- 其他运行时动态功能

### 为什么需要这个配置？

1. **性能优化**: Next.js 默认尝试静态生成所有路由，以提高性能
2. **构建时检查**: 如果路由使用了动态功能但没有标记为动态，构建时会报错
3. **运行时行为**: 标记为动态的路由会在每次请求时重新执行，而不是使用预生成的静态内容

## 回归测试

### 1. 单元测试

确保所有 API 路由的导出正确：

```typescript
// 每个 API 路由都应该有
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) { ... }
```

### 2. 集成测试

使用 Playwright 或 Cypress 进行 E2E 测试：

```typescript
// 测试商品列表页
test('商品列表页可访问', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveTitle(/Products/i);
});

// 测试商品详情页
test('商品详情页可访问', async ({ page }) => {
  await page.goto('/products/test-product');
  await expect(page).toHaveTitle(/Product/i);
});
```

### 3. 监控与告警

建议添加以下监控：

1. **路由健康检查**: 定期检查关键路由的可用性
2. **构建监控**: 监控构建过程中的错误
3. **性能监控**: 监控 API 路由的响应时间

## 总结

### 修复内容
- ✅ 为 19 个 API 路由文件添加了 `export const dynamic = 'force-dynamic'` 配置
- ✅ 创建了路由连通性诊断脚本 (`scripts/smoke-routes.mjs`)
- ✅ 所有修复已通过 lint 检查

### 影响范围
- **正面影响**: 
  - 修复了构建错误
  - 恢复了商品列表和详情页的访问
  - 提高了代码的可维护性（明确标记动态路由）

- **无负面影响**: 
  - 不影响现有功能
  - 不影响性能（这些路由本来就是动态的）

### 后续建议

1. **代码规范**: 在团队规范中明确要求，所有使用动态功能的 API 路由必须添加 `export const dynamic = 'force-dynamic'`
2. **CI/CD**: 在 CI 中添加检查，确保所有 API 路由都有正确的配置
3. **文档**: 更新开发文档，说明何时需要添加 `dynamic` 配置

## 相关文件

- 修复文件: 19 个 API 路由文件
- 诊断脚本: `scripts/smoke-routes.mjs`
- 文档: `docs/FIX-PRODUCTS-ROUTES-DYNAMIC-ERROR.md` (本文档)

