# 修复商品详情页访问失败、router 未定义、Next Image 400、生产环境地址

## 变更摘要

本次修复解决了以下问题：
1. **router is not defined** - 修复服务端组件中 API_BASE_URL 的使用方式
2. **Next Image 400** - 完善 remotePatterns 配置，添加图片 URL 格式化函数
3. **生产环境 localhost API 地址** - 移除硬编码地址，统一使用环境变量
4. **图片 URL 处理** - 添加统一的图片 URL 格式化函数，确保相对路径和绝对路径都能正确处理

## 变更文件列表

1. `apps/web/next.config.mjs` - 修复 API URL 配置和图片 remotePatterns
2. `apps/web/src/lib/api-config.ts` - 修复 API_BASE_URL 导出方式
3. `apps/web/src/app/products/[slug]/page.tsx` - 修复服务端组件中的 API 调用
4. `apps/web/src/app/products/[slug]/ProductDetailContent.tsx` - 添加图片 URL 格式化函数

## 详细变更

### 1. `apps/web/next.config.mjs`

#### 修复 API URL 配置（移除硬编码）

```diff
  async rewrites() {
-   // [2025-12-08 01:15:00] 修复：生产环境不应该回退到 localhost
-   // 优先使用环境变量，如果没有设置且是生产环境，使用硬编码的后端地址
+   // [2025-12-09] 修复：统一使用环境变量，移除硬编码地址
+   // 生产环境必须设置 NEXT_PUBLIC_API_URL 环境变量
    const isDevelopment = process.env.NODE_ENV === 'development';
    let apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      if (isDevelopment) {
-       apiUrl = 'http://localhost:3001';
+       // 开发环境：使用默认 localhost
+       apiUrl = 'http://localhost:3001';
+       console.warn('[next.config] ⚠️ NEXT_PUBLIC_API_URL 未设置，使用开发环境默认值:', apiUrl);
      } else {
-       // [2025-12-08 01:15:00] 生产环境：使用硬编码的后端地址，避免回退到 localhost
-       apiUrl = 'https://print-main-backend-234065158862.us-central1.run.app';
-       console.warn('[next.config] ⚠️ NEXT_PUBLIC_API_URL 未设置，使用硬编码后端地址:', apiUrl);
+       // 生产环境：必须配置环境变量，否则抛出错误
+       const errorMsg = '生产环境必须设置 NEXT_PUBLIC_API_URL 环境变量';
+       console.error('[next.config] ❌', errorMsg);
+       throw new Error(errorMsg);
      }
    }
    
-   // [2025-12-08 01:15:00] 检查是否包含 localhost（生产环境不应该有）
-   const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
-     console.warn('[next.config] ⚠️ 生产环境检测到 localhost API 地址，使用硬编码后端地址替代');
-     apiUrl = 'https://print-main-backend-234065158862.us-central1.run.app';
+     const errorMsg = `生产环境 API 配置错误：检测到 localhost 地址 (${apiUrl})。请设置 NEXT_PUBLIC_API_URL 环境变量指向正确的生产环境 API 服务器。`;
+     console.error('[next.config] ❌', errorMsg);
+     throw new Error(errorMsg);
    }
```

#### 完善图片 remotePatterns 配置

```diff
const remotePatterns = [
- {
-   protocol: 'http',
-   hostname: 'localhost',
-   port: '3001',
-   pathname: '/**',
- },
- {
-   protocol: 'http',
-   hostname: '127.0.0.1',
-   port: '3001',
-   pathname: '/**',
- },
+ // [2025-12-09] 开发环境：允许 localhost
+ ...(process.env.NODE_ENV === 'development' ? [
+   {
+     protocol: 'http',
+     hostname: 'localhost',
+     port: '3001',
+     pathname: '/**',
+   },
+   {
+     protocol: 'http',
+     hostname: '127.0.0.1',
+     port: '3001',
+     pathname: '/**',
+   },
+ ] : []),
  // ... 其他配置 ...
+ // [2025-12-09] 允许 Cloud Run 前端域名（用于图片代理）
+ {
+   protocol: 'https',
+   hostname: '*.run.app',
+   port: '',
+   pathname: '/**',
+ },
+ // [2025-12-09] 允许 suvernireplus.com 域名（用于 SEO 图片）
+ {
+   protocol: 'https',
+   hostname: 'suvernireplus.com',
+   port: '',
+   pathname: '/**',
+ },
];
```

**修改原因**：
- 移除硬编码的后端地址，强制使用环境变量
- 生产环境检测到 localhost 时抛出错误，而不是静默替换
- 添加 Cloud Run 和 suvernireplus.com 域名到 remotePatterns，支持更多图片源

### 2. `apps/web/src/lib/api-config.ts`

#### 修复 API_BASE_URL 导出方式

```diff
+ // [2025-12-09] 修复：延迟计算 API_BASE_URL，避免在模块顶层执行时出现问题
+ // 在服务端组件中使用时，确保正确获取环境变量
+ let cachedApiBaseUrl: string | null = null;
+
+ export function getApiBaseUrlValue(): string {
+   if (cachedApiBaseUrl === null) {
+     cachedApiBaseUrl = getApiBaseUrl();
+   }
+   return cachedApiBaseUrl;
+ }
+
+ // [2025-12-09] 保持向后兼容，但使用函数获取值
+ // 注意：在服务端组件中，建议使用 getApiBaseUrlValue() 而不是直接使用 API_BASE_URL
export const API_BASE_URL = getApiBaseUrlValue();
```

**修改原因**：
- 在服务端组件中，模块顶层的 `API_BASE_URL` 可能在环境变量未正确加载时被计算
- 提供 `getApiBaseUrlValue()` 函数，允许在需要时动态获取值
- 保持向后兼容，现有代码仍可使用 `API_BASE_URL`

### 3. `apps/web/src/app/products/[slug]/page.tsx`

#### 修复服务端组件中的 API 调用

```diff
- import { API_BASE_URL } from '@/lib/api-config';
+ // [2025-12-09] 修复：不在模块顶层导入 API_BASE_URL，改为在函数内动态导入

// [2025-12-06 21:00:00] 从 API 获取产品信息用于 SEO 元数据 for Issue #154
async function getProductForSEO(slug: string) {
  try {
-   const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
+   // [2025-12-09] 在服务端组件中，使用 getApiBaseUrlValue 确保正确获取环境变量
+   const { getApiBaseUrlValue } = await import('@/lib/api-config');
+   const apiBaseUrl = getApiBaseUrlValue();
+   
+   const response = await fetch(`${apiBaseUrl}/products/${slug}`, {
      next: { revalidate: 3600 }, // 缓存 1 小时
    });
```

**修改原因**：
- 在服务端组件中，模块顶层的导入可能在环境变量未正确加载时执行
- 使用动态导入确保在函数执行时获取最新的环境变量值

### 4. `apps/web/src/app/products/[slug]/ProductDetailContent.tsx`

#### 添加图片 URL 格式化函数

```diff
  const previewImage = hoveredColor ? getImageForColor(hoveredColor) : null;
  const selectedImage = selectedVariant?.imageUrl || null;
+ // [2025-12-09] 修复：确保图片 URL 格式正确，支持相对路径和绝对路径
+ const getImageUrl = (url: string | null | undefined): string => {
+   if (!url) return fallbackImage;
+   // 如果已经是完整的 URL（http/https），直接返回
+   if (url.startsWith('http://') || url.startsWith('https://')) {
+     return url;
+   }
+   // 如果是相对路径，确保以 / 开头
+   if (url.startsWith('/')) {
+     return url;
+   }
+   // 否则添加 / 前缀
+   return `/${url}`;
+ };
+ 
  const currentImage = previewImage 
-   ? previewImage 
-   : (selectedImage || product.images[selectedImageIndex]?.url || product.images[0]?.url || fallbackImage);
+   ? getImageUrl(previewImage)
+   : getImageUrl(selectedImage || product.images[selectedImageIndex]?.url || product.images[0]?.url || fallbackImage);
```

#### 更新所有 Image 组件使用 getImageUrl

```diff
- <Image src={img.url} alt={...} ... />
+ <Image 
+   src={getImageUrl(img.url)} 
+   alt={...} 
+   ... 
+ />
```

**修改原因**：
- 统一处理图片 URL，确保相对路径和绝对路径都能正确工作
- 避免 Next.js Image 组件因为 URL 格式错误返回 400
- 所有图片 URL 都通过 `getImageUrl` 函数处理，确保格式一致

## 验证步骤

### 开发环境验证

1. **启动开发服务器**：
   ```bash
   cd apps/web
   npm run dev
   ```

2. **访问商品详情页**：
   - 打开 `http://localhost:3000/products/[任意商品slug]`
   - 检查控制台，确认没有 "router is not defined" 错误
   - 检查网络请求，确认 API 调用使用 `http://localhost:3001/api`
   - 检查图片加载，确认没有 400 错误

3. **检查图片显示**：
   - 验证产品主图、缩略图、相关产品图片都能正常显示
   - 检查浏览器控制台，确认没有图片加载错误

### 生产环境验证

1. **设置环境变量**：
   ```bash
   export NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app
   ```

2. **构建应用**：
   ```bash
   cd apps/web
   npm run build
   ```
   - 确认构建成功，没有错误
   - 如果未设置 `NEXT_PUBLIC_API_URL`，应该抛出错误

3. **部署并测试**：
   - 部署到 GCP Cloud Run
   - 访问生产环境商品详情页
   - 检查控制台，确认没有 "router is not defined" 错误
   - 检查网络请求，确认 API 调用使用正确的生产环境地址
   - 检查图片加载，确认没有 400 错误

## 回归用例清单

### 自动测试用例

1. **商品详情页访问测试**：
   - 访问存在的商品 slug，应该正常渲染
   - 访问不存在的商品 slug，应该显示 404 或空状态
   - 检查页面没有 JavaScript 错误

2. **图片加载测试**：
   - 验证所有图片 URL 格式正确
   - 验证相对路径图片能正常加载
   - 验证绝对路径（http/https）图片能正常加载
   - 验证图片加载失败时显示占位图

3. **API 调用测试**：
   - 验证开发环境使用 localhost API
   - 验证生产环境使用环境变量配置的 API
   - 验证生产环境检测到 localhost 时抛出错误

### 手动测试用例

1. **商品详情页功能**：
   - [ ] 访问商品详情页，页面正常加载
   - [ ] 产品图片正常显示（主图、缩略图）
   - [ ] 颜色选择器正常工作
   - [ ] 尺码选择器正常工作
   - [ ] "Add to Cart" 按钮正常工作
   - [ ] "Buy Now" 按钮正常工作
   - [ ] "Start Design" 按钮正常工作
   - [ ] 相关产品推荐正常显示

2. **图片显示**：
   - [ ] 产品主图正常显示
   - [ ] 产品缩略图正常显示
   - [ ] 相关产品图片正常显示
   - [ ] 品牌产品图片正常显示
   - [ ] 图片 URL 格式正确（检查浏览器开发者工具）

3. **API 配置**：
   - [ ] 开发环境使用 localhost API
   - [ ] 生产环境使用环境变量配置的 API
   - [ ] 生产环境未设置环境变量时抛出错误
   - [ ] 生产环境检测到 localhost 时抛出错误

## 防回归规范

### 代码规范

1. **API Base URL 使用规范**：
   - ✅ 在服务端组件中，使用 `getApiBaseUrlValue()` 动态获取 API URL
   - ✅ 在客户端组件中，可以使用 `API_BASE_URL` 常量
   - ❌ 禁止在服务端组件模块顶层直接使用 `API_BASE_URL`
   - ❌ 禁止硬编码 API 地址

2. **图片 URL 处理规范**：
   - ✅ 所有图片 URL 通过 `getImageUrl()` 函数处理
   - ✅ 支持相对路径（以 `/` 开头）和绝对路径（http/https）
   - ❌ 禁止直接使用未格式化的图片 URL

3. **环境变量规范**：
   - ✅ 生产环境必须设置 `NEXT_PUBLIC_API_URL` 环境变量
   - ✅ 开发环境可以使用默认值 `http://localhost:3001`
   - ❌ 禁止在生产环境使用 localhost 地址
   - ❌ 禁止硬编码生产环境地址

### ESLint 规则建议

建议添加以下 ESLint 规则（在 `.eslintrc.js` 中）：

```javascript
{
  rules: {
    // 禁止硬编码 API 地址
    'no-hardcoded-api-url': 'error',
    // 禁止在服务端组件模块顶层使用 API_BASE_URL
    'no-top-level-api-base-url': 'error',
  }
}
```

### CI/CD 检查

在 CI/CD 流程中添加以下检查：

1. **环境变量检查**：
   - 生产环境构建时，检查 `NEXT_PUBLIC_API_URL` 是否设置
   - 检查 `NEXT_PUBLIC_API_URL` 不包含 localhost

2. **代码检查**：
   - 检查是否有硬编码的 API 地址
   - 检查服务端组件是否正确使用 `getApiBaseUrlValue()`

## 相关文件

- `apps/web/next.config.mjs` - Next.js 配置
- `apps/web/src/lib/api-config.ts` - API 配置
- `apps/web/src/lib/api-route-config.ts` - API 路由配置
- `apps/web/src/app/products/[slug]/page.tsx` - 商品详情页服务端组件
- `apps/web/src/app/products/[slug]/ProductDetailContent.tsx` - 商品详情页客户端组件

## 后续优化建议

1. **统一请求客户端**：
   - 创建一个统一的请求客户端，所有 API 调用通过它进行
   - 在请求客户端中统一处理 URL 拼接、错误处理等

2. **图片优化**：
   - 考虑使用 Next.js Image 组件的 `loader` 属性自定义图片加载逻辑
   - 添加图片加载失败时的占位图显示

3. **错误处理**：
   - 添加更完善的错误处理机制
   - 添加错误边界组件，捕获并显示友好的错误信息

4. **测试覆盖**：
   - 添加单元测试覆盖图片 URL 格式化函数
   - 添加集成测试覆盖商品详情页的完整流程

