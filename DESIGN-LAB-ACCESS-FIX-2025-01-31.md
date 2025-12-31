# Design Lab 访问修复报告

**修复时间**:  
**状态**: ✅ **修复完成，等待部署**

---

## 问题诊断

### 问题描述
1. Design Lab 页面无法访问，显示 "Design Lab Error"
2. 控制台有 CSS 预加载警告：
   ```
   The resource https://print-main-frontend-234065158862.us-central1.run.app/_next/static/css/e2ac6a7a4b026bc9.css was preloaded using link preload but not used within a few seconds from the window's load event.
   ```

### 根本原因
1. **Suspense 缺失**: `DesignLabClient5.0` 使用了 `useSearchParams()`，但在 Next.js 15 中，使用 `useSearchParams()` 的客户端组件必须被 `Suspense` 包裹
2. **CSS 预加载警告**: Next.js 预加载了 CSS 文件但未及时使用，导致控制台警告

---

## 修复内容

### 1. 修复 Suspense 包裹问题 ✅

**文件**: `apps/web/src/app/design-lab/page.tsx`

**修复前**:
```typescript
return (
  <DesignLabClient initialProductData={initialProductData} />
);
```

**修复后**:
```typescript
// 修复：DesignLabClient5.0 使用 useSearchParams()，必须用 Suspense 包裹
return (
  <Suspense fallback={
    <section style={{ 
      minHeight: '100vh', 
      display: 'grid', 
      placeItems: 'center', 
      background: '#f5f5f5' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
          Preparing the Design Lab…
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #3498db', 
          borderRadius: '50%', 
          margin: '0 auto' 
        }} />
      </div>
    </section>
  }>
    <DesignLabClient initialProductData={initialProductData} />
  </Suspense>
);
```

**说明**: 
- `DesignLabClient5.0` 使用了 `useSearchParams()` hook
- 在 Next.js 15 中，使用 `useSearchParams()` 的客户端组件必须被 `Suspense` 包裹
- 添加了友好的加载状态 fallback

### 2. 更新 CSS 预加载警告过滤 ✅

**文件**: `apps/web/src/components/GlobalErrorFilter.tsx`

**修复内容**:
```typescript
// 需要被过滤的警告模式
// 更新：添加更完整的 CSS 预加载警告过滤模式
const FILTERED_WARNING_PATTERNS = [
  /PerformanceObserver/i,
  /preloaded.*not used/i,
  /preload.*was preloaded.*not used/i,
  /resource.*was preloaded.*not used/i,
/was preloaded using link preload but not used/i, // 匹配 Next.js CSS 预加载警告
/preloaded using link preload but not used/i, // 更通用的匹配
];
```

**说明**:
- 添加了更完整的 CSS 预加载警告过滤模式
- 这些警告不影响功能，只是性能提示

---

## 修改的文件

1. ✅ `apps/web/src/app/design-lab/page.tsx` - 添加 Suspense 包裹
2. ✅ `apps/web/src/components/GlobalErrorFilter.tsx` - 更新 CSS 预加载警告过滤

---

## 验证步骤

### 本地验证
```bash
cd apps/web
npm run build
npm run start
# 访问 http://localhost:3000/design-lab
```

### 生产环境验证
1. 部署代码到 GCP Cloud Run
2. 访问 `https://print-main-frontend-234065158862.us-central1.run.app/design-lab`
3. 验证：
   - ✅ 页面正常加载，不显示错误页面
   - ✅ 控制台没有 CSS 预加载警告（或被正确过滤）
   - ✅ Design Lab 界面正常显示

---

## 技术说明

### Next.js 15 useSearchParams 要求

在 Next.js 15 中，如果客户端组件使用了 `useSearchParams()` hook，它必须被 `Suspense` 包裹。这是因为：

1. `useSearchParams()` 需要访问 URL 搜索参数
2. 在服务端渲染时，搜索参数可能不可用
3. `Suspense` 提供了异步边界，允许组件在客户端等待搜索参数可用

### CSS 预加载警告

CSS 预加载警告是 Next.js 的性能提示，表示：
- CSS 文件被预加载但未在几秒内使用
- 这通常不影响功能，只是性能优化建议
- 可以通过 `GlobalErrorFilter` 过滤这些警告

---

## 后续建议

1. **部署代码**: 将修复后的代码部署到生产环境
2. **监控错误**: 部署后监控 Design Lab 页面的错误率
3. **性能优化**: 如果 CSS 预加载警告持续出现，考虑优化 CSS 加载策略

---

## 相关文档

- [Next.js 15 Suspense 文档](https://nextjs.org/docs/app/api-reference/components/suspense)
- [Next.js useSearchParams 文档](https://nextjs.org/docs/app/api-reference/functions/use-search-params)

