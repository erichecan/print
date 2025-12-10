# 渐进式功能重新集成计划

**创建时间**: 2025-12-09  
**基础版本**: `660a722` (周日晚上可工作版本)  
**目标**: 逐步重新集成所有功能，确保商品页面稳定性

---

## 计划概述

在回滚到稳定版本 `660a722` 后，我们需要逐步重新集成所有功能。本计划将功能分为多个阶段，每个阶段完成后验证商品列表、商品详情和 Design Lab 的稳定性。

---

## 阶段列表

### 阶段 1: API 代理路由修复 ✅ **已完成**
- **提交**: `baee7fe`, `3c375d6`, `b034298`
- **功能**: 修复 API 代理路由 404 错误和配置管理数据读取问题
- **文件**:
  - `apps/web/src/app/api/proxy/[...path]/route.ts`
  - `apps/web/next.config.mjs`
- **验证**: 商品列表、商品详情、Design Lab

---

### 阶段 2: Design Lab 3.0 核心功能（第1-2章） ✅ **已完成**
- **提交**: `7c76746`, `a0a46c3`, `6b99d8f`, `ccaf977`
- **功能**:
  - 埋点系统和目标指标收集
  - 保存和分享功能
  - Get Price 流程模态框
  - 实际报价 API 集成
- **文件**:
  - `apps/web/src/app/design-lab/DesignLabClient.tsx`
  - `apps/web/src/lib/analytics.ts`
  - `apps/web/src/app/design-lab/components/modals/SaveShareModal.tsx`
  - `apps/web/src/app/design-lab/components/modals/GetPriceFlowModal.tsx`
- **验证**: 商品列表、商品详情、Design Lab

---

### 阶段 3: Design Lab 3.0 增强功能（第3-4章） ✅ **已完成**
- **提交**: `5ea264d`, `c2728c9`, `20269b3`, `d299924`
- **功能**:
  - Undo/Redo 按钮
  - Upload Size 编辑（比例锁）
  - Text Shape 功能
  - Art Search 功能
  - Upload Crop 功能
  - Edit Colors (Upload) 功能
  - Safe Area 警告
  - Art Subcategories
  - Art Size 比例锁
  - Toast 通知系统
- **文件**:
  - `apps/web/src/app/design-lab/DesignLabClient.tsx`
  - `apps/web/src/app/design-lab/components/panels/EditUploadPanel.tsx`
  - `apps/web/src/app/design-lab/components/panels/EditTextPanel.tsx`
  - `apps/web/src/app/design-lab/components/panels/ArtPanel.tsx`
  - `apps/web/src/app/design-lab/components/panels/EditArtPanel.tsx`
- **验证**: 商品列表、商品详情、Design Lab

---

### 阶段 4: Design Lab 3.0 画布功能（第5章） ✅ **已完成**
- **提交**: `fe7139e`
- **功能**:
  - Zoom 视图控件
  - Forward/Backward 按钮
  - 图层重命名
- **文件**:
  - `apps/web/src/app/design-lab/DesignLabClient.tsx`
  - `apps/web/src/app/design-lab/components/panels/LayerManagementPanel.tsx`
  - `apps/web/src/app/design-lab/components/panels/EditArtPanel.tsx`
  - `apps/web/src/app/design-lab/components/panels/EditTextPanel.tsx`
- **验证**: 商品列表、商品详情、Design Lab

---

### 阶段 5: 统一订单管理功能 ✅ **已完成**
- **提交**: `949f971`
- **功能**:
  - 统一订单查询接口 `/api/admin/all-orders`
  - 统一订单 DTO 映射（Online/Offline）
  - 状态映射逻辑
  - 前端订单管理页面支持统一展示
  - 类型筛选（All/Online/Offline）
  - 统一搜索、筛选、排序、分页
  - 统一订单导出功能
- **文件**:
  - `backend/src/controllers/unifiedOrderController.js`
  - `backend/src/routes/unifiedOrders.js`
  - `apps/web/src/app/admin/orders/page.tsx`
  - `apps/web/src/lib/api.ts`
- **验证**: 商品列表、商品详情、统一订单管理页面

---

### 阶段 6: Design Lab Start Design URL 切换 ✅ **已完成**
- **提交**: `d4aa6cf`
- **功能**:
  - variantId 参数验证和错误处理
  - 默认图片展示逻辑
  - 埋点功能（designer_open_success, designer_default_image_shown, designer_default_image_fallback）
  - Toast 错误提示
- **文件**:
  - `apps/web/src/app/design-lab/DesignLabClient.tsx`
- **验证**: 商品列表、商品详情、Design Lab

---

### 阶段 7: 响应式设计 ✅ **已完成**
- **提交**: `3476710`
- **功能**:
  - 平板端 (768px-1024px) 优化
  - 移动端 (320px-767px) 优化
  - 响应式注释和时间戳
- **文件**:
  - `apps/web/src/app/design-lab/design-lab.css`
- **验证**: 商品列表、商品详情、Design Lab（不同屏幕尺寸）

---

### 阶段 8: SEO 和性能验证 ✅ **已完成**
- **提交**: `3476710`
- **功能**:
  - SEO 元数据（title, description, keywords, OG, Twitter Card）
  - Sitemap 包含 Design Lab 页面
  - robots.txt 配置
  - 性能优化（代码分割、字体预加载）
- **文件**:
  - `apps/web/src/app/design-lab/page.tsx`
  - `apps/web/src/app/sitemap.ts`
  - `robots.txt`
- **验证**: 商品列表、商品详情、Design Lab、Sitemap、Robots.txt

---

### 阶段 9: 待定
- **状态**: 未找到明确的阶段 9 功能
- **说明**: 阶段 7 和阶段 8 是 Design Lab 的最后两个阶段

---

### 阶段 10: 待定
- **状态**: 未找到明确的阶段 10 功能

---

### 阶段 11: 待定
- **状态**: 未找到明确的阶段 11 功能

---

### 阶段 12: 待定
- **状态**: 未找到明确的阶段 12 功能

---

## 当前状态

### 已完成阶段
- ✅ 阶段 1: API 代理路由修复
- ✅ 阶段 2: Design Lab 3.0 核心功能（第1-2章）
- ✅ 阶段 3: Design Lab 3.0 增强功能（第3-4章）
- ✅ 阶段 4: Design Lab 3.0 画布功能（第5章）
- ✅ 阶段 5: 统一订单管理功能
- ✅ 阶段 6: Design Lab Start Design URL 切换
- ✅ 阶段 7: 响应式设计
- ✅ 阶段 8: SEO 和性能验证

### 待修复问题
- ✅ Fabric.js 初始化错误（已修复）

---

## 验证标准

每个阶段完成后，必须验证以下页面：
1. **商品列表页**: `/products`
2. **商品详情页**: `/products/[slug]`
3. **Design Lab**: `/design-lab`

验证内容：
- 页面可以正常访问
- 无控制台错误
- 核心功能正常工作
- 无性能问题

---

## 部署流程

每个阶段完成后：
1. 提交代码（带阶段标记）
2. 部署到 GCP
3. 验证三个页面
4. 确认无问题后继续下一阶段

---

**最后更新**: 2025-12-10  
**当前进度**: 阶段 1-8 已完成，Fabric.js 初始化错误已修复

