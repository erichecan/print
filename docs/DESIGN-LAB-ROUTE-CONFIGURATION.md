# Design Lab 路由配置说明

**创建时间**: 2025-01-30 23:55:00  
**状态**: ✅ **路由配置正常**

---

## 路由结构

### Next.js App Router 配置

Design Lab 页面使用 Next.js 13+ App Router，路由基于文件系统：

```
apps/web/src/app/
└── design-lab/
    ├── page.tsx          # 路由: /design-lab
    ├── DesignLabClient.tsx
    ├── DesignLabErrorBoundary.tsx
    ├── error.tsx         # 错误页面
    ├── loading.tsx      # 加载页面
    └── design-lab.css   # 样式文件
```

**路由路径**: `/design-lab`

---

## 路由配置详情

### 1. 页面组件 (`page.tsx`)

**文件位置**: `apps/web/src/app/design-lab/page.tsx`

**功能**:
- ✅ 服务端组件，负责 SEO 元数据生成
- ✅ 使用 `Suspense` 包裹客户端组件（满足 `useSearchParams` 要求）
- ✅ 使用 `DesignLabErrorBoundary` 处理错误

**SEO 元数据**:
- Title: "Design Lab - Online Custom Design Tool | suvernire plus"
- Description: "Create custom designs for t-shirts, hoodies, and apparel with our professional online design tool. Upload artwork, add text, and preview your designs instantly."
- Keywords: ['design tool', 'custom design', 't-shirt designer', 'online editor', 'custom apparel designer', 'design lab']
- Canonical URL: "https://suvernireplus.com/design-lab"

---

### 2. Layout 配置 (`LayoutWrapper.tsx`)

**文件位置**: `apps/web/src/app/LayoutWrapper.tsx`

**Design Lab 特殊处理**:
```typescript
// [2025-01-30 21:40:00] Design Lab 是全屏应用，不显示全局 header/footer
const isDesignLab = pathname === '/design-lab' || pathname?.startsWith('/design-lab/');

if (isAdmin || isOfflineOrdersFlow || isDesignLab) {
  return <>{children}</>;
}
```

**说明**: Design Lab 是全屏应用，不显示全局的 SiteHeader 和 SiteFooter。

---

### 3. 错误处理

**错误边界**: `DesignLabErrorBoundary.tsx`
- 捕获 Design Lab 组件树中的错误
- 显示友好的错误页面

**错误页面**: `error.tsx`
- Next.js 错误页面组件
- 显示错误信息和重试按钮

**加载页面**: `loading.tsx`
- 显示加载状态

---

## 路由验证

### 本地开发环境

**启动服务器**:
```bash
cd apps/web
npm run dev
```

**访问地址**: `http://localhost:3000/design-lab`

**验证方法**:
```bash
# 检查页面是否正常加载
curl -s http://localhost:3000/design-lab | grep -o "design-lab-new"

# 检查 SEO 元数据
curl -s http://localhost:3000/design-lab | grep -E "(title|meta.*description)"
```

---

## 路由问题排查

### 问题 1: 页面返回 404

**可能原因**:
1. Next.js 开发服务器未完全启动
2. 文件路径不正确
3. 编译错误

**解决方法**:
1. 等待服务器完全启动（通常需要 10-30 秒）
2. 检查 `apps/web/src/app/design-lab/page.tsx` 文件是否存在
3. 检查控制台是否有编译错误

---

### 问题 2: 页面显示但样式不正确

**可能原因**:
1. CSS 文件未正确导入
2. 样式文件路径错误

**解决方法**:
1. 检查 `design-lab.css` 文件是否存在
2. 检查 `DesignLabClient.tsx` 中是否正确导入 CSS：
   ```typescript
   import './design-lab.css';
   ```

---

### 问题 3: 组件加载错误

**可能原因**:
1. `useSearchParams` 需要 `Suspense` 包裹
2. 客户端组件导入问题

**解决方法**:
1. 确保 `DesignLabClient` 被 `Suspense` 包裹
2. 检查所有客户端组件是否正确标记 `'use client'`

---

## 路由配置检查清单

- [x] `page.tsx` 文件存在且正确导出
- [x] `DesignLabClient.tsx` 正确导入
- [x] `design-lab.css` 正确导入
- [x] `LayoutWrapper.tsx` 正确处理 Design Lab 路径
- [x] SEO 元数据正确配置
- [x] 错误边界和加载状态已配置

---

## Next.js 配置

**配置文件**: `apps/web/next.config.mjs`

**相关配置**:
- ✅ React Strict Mode 已启用
- ✅ 图片优化配置
- ✅ Webpack 代码分割优化（Fabric.js 单独打包）

---

## 部署配置

### 生产环境

**路由路径**: `/design-lab`

**验证方法**:
```bash
# 生产环境 URL
https://suvernireplus.com/design-lab
```

---

## 相关文件

- `apps/web/src/app/design-lab/page.tsx` - 页面组件
- `apps/web/src/app/design-lab/DesignLabClient.tsx` - 客户端组件
- `apps/web/src/app/LayoutWrapper.tsx` - Layout 包装器
- `apps/web/next.config.mjs` - Next.js 配置
- `apps/web/src/lib/seo.ts` - SEO 工具函数

---

**最后更新**: 2025-01-30 23:55:00  
**状态**: ✅ 路由配置正常，页面可以正常访问

