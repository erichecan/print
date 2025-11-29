# React 错误 #130 修复说明

**日期**: 2025-01-28 18:20:00

## 错误描述

在生产环境中遇到 React 错误 #130：
```
Error: Minified React error #130; visit https://react.dev/errors/130
```

React 错误 #130 通常表示 "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined"。

## 问题原因

1. **SiteHeader 组件中的 useEffect 依赖问题**：
   - `useEffect` 依赖了整个 `router` 对象，这会导致不必要的重新渲染
   - Next.js App Router 的 `useRouter` 返回的对象每次都是新的引用

2. **MobileFilterDrawer 组件中的错误导入**：
   - 尝试导入 `ProductFilters` 组件，但使用了错误的导入方式
   - `ProductFilters` 组件只返回 `null`，不应该在 `MobileFilterDrawer` 中渲染

## 修复方案

### 1. 修复 SiteHeader.tsx

**修改前**：
```tsx
useEffect(() => {
  setIsMobileMenuOpen(false);
}, [router]); // ❌ router 对象每次都是新的引用
```

**修改后**：
```tsx
const pathname = usePathname();

useEffect(() => {
  setIsMobileMenuOpen(false);
}, [pathname]); // ✅ 使用 pathname 字符串，只有路径变化时才触发
```

### 2. 修复 MobileFilterDrawer.tsx

**修改前**：
```tsx
import ProductFilters from './ProductFilters'; // ❌ 错误的默认导入

// ...
<ProductFilters ... /> // ❌ ProductFilters 返回 null，不应该渲染
```

**修改后**：
```tsx
// ✅ 移除了 ProductFilters 导入和使用
// ProductFilters 只用于注入逻辑，不需要渲染
<DynamicFilters currentCollection={currentCollection} />
```

## 修改的文件

1. `apps/web/src/components/SiteHeader.tsx`
   - 添加 `usePathname` 导入
   - 修改 `useEffect` 依赖从 `router` 改为 `pathname`

2. `apps/web/src/components/products/MobileFilterDrawer.tsx`
   - 移除 `ProductFilters` 的导入
   - 移除 `ProductFilters` 的渲染

## 验证

修复后，React 错误 #130 应该不再出现。如果问题仍然存在，可能需要：

1. 清除 Next.js 构建缓存：`rm -rf apps/web/.next`
2. 重新构建：`npm run build`
3. 检查浏览器控制台是否还有其他错误信息

## 相关资源

- [React 错误 #130 文档](https://react.dev/errors/130)
- [Next.js App Router - usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)

