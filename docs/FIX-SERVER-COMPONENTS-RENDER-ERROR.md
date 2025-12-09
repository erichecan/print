# 修复 Server Components 渲染错误

**日期**: 2025-12-09 14:30:00  
**问题**: `Error: An error occurred in the Server Components render`  
**根因**: Next.js 15 中 `params` 可能是 Promise，需要 await

---

## 一、问题描述

在生产环境中出现 Server Components 渲染错误：
```
Error: An error occurred in the Server Components render. 
The specific message is omitted in production builds to avoid leaking sensitive details.
```

错误 digest: `1800082468`

---

## 二、根因分析

### 1. Next.js 15 的 Breaking Change

在 Next.js 15 中，`params` 和 `searchParams` 都可能是 Promise，需要 await：

- **Next.js 14**: `params` 是同步对象
- **Next.js 15**: `params` 可能是 `Promise<{ slug: string }>` 或 `{ slug: string }`

### 2. 受影响的文件

以下 Server Components 直接访问 `params` 属性，导致渲染错误：

1. `apps/web/src/app/products/[slug]/page.tsx`
   - `generateMetadata` 函数
   - `ProductDetailPage` 组件

2. `apps/web/src/app/collections/[slug]/page.tsx`
   - `generateMetadata` 函数
   - `CollectionPage` 组件

3. `apps/web/src/app/orders/[orderNumber]/page.tsx`
   - `OrderDetailPage` 组件

4. `apps/web/src/app/account/orders/[id]/page.tsx`
   - `AccountOrderDetailPage` 组件

5. `apps/web/src/app/admin/products/[id]/page.tsx`
   - `AdminProductEditPage` 组件

6. `apps/web/src/app/admin/orders/[id]/page.tsx`
   - `AdminOrderDetailPage` 组件

7. `apps/web/src/app/admin/users/[id]/page.tsx`
   - `AdminUserDetailPage` 组件

8. `apps/web/src/app/admin/designs/[id]/page.tsx`
   - `AdminDesignReviewPage` 组件

9. `apps/web/src/app/admin/categories/[id]/page.tsx`
   - `AdminCategoryEditPage` 组件

---

## 三、修复方案

### 1. 统一处理 params Promise

为所有使用 `params` 的 Server Components 添加 Promise 处理：

```typescript
// 修复前
export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  return <ProductDetail slug={params.slug} />;
}

// 修复后
export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> | { slug: string } 
}) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return <ProductDetail slug={resolvedParams.slug} />;
}
```

### 2. generateMetadata 函数修复

```typescript
// 修复前
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductForSEO(params.slug);
  // ...
}

// 修复后
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> | { slug: string } 
}): Promise<Metadata> {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const slug = resolvedParams.slug;
  
  try {
    const product = await getProductForSEO(slug);
    // ...
  } catch (error) {
    // 错误处理
    console.error('[Product SEO] Error in generateMetadata:', error);
  }
  // ...
}
```

### 3. 首页 JSON 序列化错误处理

在 `apps/web/src/app/page.tsx` 中添加错误处理，防止 JSON.stringify 失败：

```typescript
export default function Home() {
  let websiteSchemaHtml = '';
  let organizationSchemaHtml = '';
  
  try {
    const websiteSchema = generateWebsiteSchema();
    websiteSchemaHtml = JSON.stringify(websiteSchema);
  } catch (error) {
    console.error('[Home] Failed to generate website schema:', error);
    // 使用默认 schema
    websiteSchemaHtml = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'suvernire plus',
      url: 'https://suvernireplus.com',
    });
  }
  
  // ... 类似处理 organizationSchema
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteSchemaHtml }}
      />
      {/* ... */}
    </>
  );
}
```

---

## 四、修复文件清单

### 核心修复（9 个文件）

1. ✅ `apps/web/src/app/products/[slug]/page.tsx`
   - 修复 `generateMetadata` 和 `ProductDetailPage`

2. ✅ `apps/web/src/app/collections/[slug]/page.tsx`
   - 修复 `generateMetadata` 和 `CollectionPage`

3. ✅ `apps/web/src/app/orders/[orderNumber]/page.tsx`
   - 修复 `OrderDetailPage`

4. ✅ `apps/web/src/app/account/orders/[id]/page.tsx`
   - 修复 `AccountOrderDetailPage`

5. ✅ `apps/web/src/app/admin/products/[id]/page.tsx`
   - 修复 `AdminProductEditPage`

6. ✅ `apps/web/src/app/admin/orders/[id]/page.tsx`
   - 修复 `AdminOrderDetailPage`

7. ✅ `apps/web/src/app/admin/users/[id]/page.tsx`
   - 修复 `AdminUserDetailPage`

8. ✅ `apps/web/src/app/admin/designs/[id]/page.tsx`
   - 修复 `AdminDesignReviewPage`

9. ✅ `apps/web/src/app/admin/categories/[id]/page.tsx`
   - 修复 `AdminCategoryEditPage`

### 错误处理增强（1 个文件）

10. ✅ `apps/web/src/app/page.tsx`
    - 添加 JSON 序列化错误处理

---

## 五、验证步骤

### 1. 本地测试

```bash
# 启动开发服务器
cd apps/web && npm run dev

# 访问以下页面，确保无错误：
# - http://localhost:3000/products/test-slug
# - http://localhost:3000/collections/test-collection
# - http://localhost:3000/orders/ORDER-123
```

### 2. 生产环境验证

1. 检查浏览器控制台，确保无 Server Components 渲染错误
2. 检查服务器日志，确保无未捕获的异常
3. 验证所有动态路由页面正常加载

---

## 六、技术要点

### 1. 兼容性处理

使用 `instanceof Promise` 检查，确保同时支持：
- Next.js 14: `params` 是同步对象
- Next.js 15: `params` 可能是 Promise

```typescript
const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
```

### 2. 错误边界

- 所有 `generateMetadata` 函数都添加了 try-catch
- 所有数据获取都添加了错误处理
- JSON 序列化添加了回退方案

### 3. 类型安全

使用联合类型确保类型安全：
```typescript
params: Promise<{ slug: string }> | { slug: string }
```

---

## 七、相关文档

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Next.js 15 Params and SearchParams](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#params-and-searchparams)

---

## 八、时间戳

- **修复时间**: 2025-12-09 14:30:00
- **提交 ID**: 待提交
- **部署时间**: 待部署

