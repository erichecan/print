# Design Lab 图片尺寸调整日志

**时间**:  
**问题**: 
1. 404 错误：`GET http://localhost:3000/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c 404 (Not Found)`
2. 商品图片太小，需要调整为 1000px*1200px，响应式布局

---

## ✅ 修复内容

### 1. 图片尺寸调整

#### 修改文件: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**变更前**:
```tsx
<Image
  width={600}
  height={800}
  ...
/>
```

**变更后**:
```tsx
<Image
  width={1000}
  height={1200}
  style={{ 
    width: '100%',
    height: 'auto',
    maxWidth: '1000px',
    maxHeight: '1200px'
  }}
  onLoad={(e) => {
    // 详细的加载日志
    const img = e.target as HTMLImageElement;
    console.log('[Design Lab] Product image loaded:', {
      naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
      displaySize: `${img.offsetWidth}x${img.offsetHeight}`,
      aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2)
    });
  }}
  ...
/>
```

#### 修改文件: `apps/web/src/app/globals.css`

**变更前**:
```css
.dl-visualization__image {
  max-width: 600px;
}

.dl-visualization__img {
  width: 100%;
  height: auto;
}
```

**变更后**:
```css
/* 调整图片容器尺寸为 1000x1200px，响应式布局 */
.dl-visualization__image {
  max-width: 1000px;
}

/* 响应式：移动端和中等屏幕 */
@media (max-width: 1024px) {
  .dl-visualization__image {
    max-width: 100%;
    padding: 0 16px;
  }
}

@media (max-width: 768px) {
  .dl-visualization__image {
    max-width: 100%;
    padding: 0 12px;
  }
}

.dl-visualization__img {
  width: 100%;
  height: auto;
  max-width: 1000px;
  max-height: 1200px;
  object-fit: contain;
}

/* 响应式：确保图片在小屏幕上也能正确显示 */
@media (max-width: 1024px) {
  .dl-visualization__img {
    max-width: 100%;
    max-height: none;
  }
}
```

---

### 2. 增强调试日志

#### 修改文件: `apps/web/public/design-lab-native/store.js`

**增强的日志包括**:
- API 请求开始/结束时间戳
- 请求 URL 和参数
- 响应状态码和持续时间
- 响应数据详情
- 错误详情（如果有）

**示例日志输出**:
```javascript
[Store] ===== hydrateProductFromVariantId START =====
[Store] Fetching product data for variantId: { variantId: "...", timestamp: "..." }
[Store] API Request: { url: "/api/products/variant/...", method: "GET" }
[Store] API Response: { status: 200, duration: "45ms", ... }
[Store] API Success - Response Data: { productId: "...", baseImages: {...} }
[Store] Product Data Updated: { previous: {...}, current: {...} }
[Store] ===== hydrateProductFromVariantId SUCCESS =====
```

#### 修改文件: `apps/web/src/app/api/products/variant/[variantId]/route.ts`

**增强的日志包括**:
- 路由调用时间戳
- 上游 API 请求详情
- 响应状态和持续时间
- 错误详情（如果有）

**示例日志输出**:
```javascript
[Next.js API Route] GET /api/products/variant/[variantId]
[Next.js API Route] Fetching from upstream: { url: "http://localhost:3001/api/products/variant/..." }
[Next.js API Route] Upstream response: { status: 200, duration: "30ms" }
[Next.js API Route] Upstream success: { bodyLength: 456 }
```

---

### 3. 404 错误排查

**问题**: Next.js API 路由返回 404

**可能原因**:
1. Next.js 开发服务器需要重新编译
2. 路由文件路径不正确
3. 后端 API 不可用

**检查步骤**:
```bash
# 1. 检查后端 API 是否正常
curl http://localhost:3001/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c

# 2. 检查 Next.js API 路由
curl http://localhost:3000/api/products/variant/b9ac1f4b-fd03-4aff-b6fe-e0066a71a24c

# 3. 重启前端开发服务器
cd apps/web && npm run dev
```

**解决方案**:
- 确保后端服务运行在端口 3001
- 重启 Next.js 开发服务器以重新编译路由
- 检查浏览器控制台和服务器日志

---

## 📊 图片尺寸规格

### 桌面端 (> 1024px)
- **最大宽度**: 1000px
- **最大高度**: 1200px
- **宽高比**: 5:6 (1000:1200)

### 平板端 (768px - 1024px)
- **最大宽度**: 100%
- **内边距**: 16px
- **高度**: 自动（保持宽高比）

### 移动端 (< 768px)
- **最大宽度**: 100%
- **内边距**: 12px
- **高度**: 自动（保持宽高比）

---

## 🔍 调试指南

### 查看图片加载日志
打开浏览器控制台，查找以下日志：
```
[Design Lab] Product image loaded: {
  naturalSize: "1000x1200",
  displaySize: "800x960",
  aspectRatio: "0.83"
}
```

### 查看 API 调用日志
```
[Store] ===== hydrateProductFromVariantId START =====
[Store] API Request: { url: "/api/products/variant/...", ... }
[Store] API Response: { status: 200, duration: "45ms", ... }
```

### 查看 Next.js 路由日志
检查服务器控制台（终端）：
```
[Next.js API Route] GET /api/products/variant/[variantId]
[Next.js API Route] Upstream response: { status: 200, ... }
```

---

## ✅ 验证步骤

1. **刷新浏览器页面** (http://localhost:3000/design-lab)
2. **打开浏览器控制台** (F12)
3. **检查日志输出**:
   - 应该看到 `[Design Lab] Product image loaded` 日志
   - 应该看到 `[Store] hydrateProductFromVariantId` 日志
   - 应该看到图片尺寸信息
4. **检查图片显示**:
   - 图片应该显示为 1000x1200px（或按比例缩放）
   - 在小屏幕上应该响应式调整
5. **检查网络请求**:
   - 打开 Network 标签
   - 查找 `/api/products/variant/...` 请求
   - 应该返回 200 状态码

---

## 🐛 已知问题

1. **404 错误**: 如果仍然出现 404，请重启 Next.js 开发服务器
2. **图片不显示**: 检查后端 API 是否返回正确的图片 URL
3. **尺寸不正确**: 检查 CSS 是否被正确应用，清除浏览器缓存

---

## 📝 后续优化建议

1. 添加图片懒加载
2. 添加图片预加载
3. 优化图片压缩
4. 添加图片错误重试机制
5. 添加图片加载进度指示器

