# 线下订单相关页面总结

## 页面列表

### 1. 客户下单页面（前端）
- **路径**: `/offline-orders`
- **文件**: `apps/web/src/app/offline-orders/page.tsx`
- **功能**: 
  - 多步骤订单创建流程（4步）
  - 第1步：产品选择（多产品定制）
  - 第2步：印刷位置配置
  - 第3步：客人信息和价格管理（包含项目详情）
  - 第4步：文件上传（支持移动端拍照）
  - 支持中英文双语
  - 支持草稿保存

### 2. 管理员订单管理页面（后台）
- **路径**: `/admin/offline-orders`
- **文件**: `apps/web/src/app/admin/offline-orders/page.tsx`
- **功能**:
  - 订单列表展示（看板视图）
  - 订单详情查看
  - 阶段流转管理
  - 订单状态更新
  - 生产工单关联
  - 订单指标统计

### 3. 销售员订单列表页面
- **路径**: `/offline-orders/sales/orders`
- **文件**: `apps/web/src/app/offline-orders/sales/orders/page.tsx`
- **功能**:
  - 销售员查看自己的订单列表
  - 订单状态筛选
  - 订单详情跳转

### 4. 销售员订单详情页面
- **路径**: `/offline-orders/sales/orders/[id]`
- **文件**: `apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx`
- **功能**:
  - 查看订单详细信息
  - 查看订单附件
  - 查看订单历史记录

### 5. 销售员登录页面
- **路径**: `/offline-orders/sales/login`
- **文件**: `apps/web/src/app/offline-orders/sales/login/page.tsx`
- **功能**:
  - 销售员登录认证
  - 角色验证（SALES, SALES_MANAGER, ADMIN）

## 相关文件

### 翻译文件
- **文件**: `apps/web/src/translations/offlineOrders.ts`
- **功能**: 提供中英文双语翻译支持

### 测试文件
- **文件**: `apps/web/tests/e2e/offline-order-creation.spec.ts`
- **功能**: 线下订单创建流程的 E2E 测试

- **文件**: `apps/web/tests/e2e/offline-orders-sales-flow.spec.ts`
- **功能**: 销售员订单流程的 E2E 测试

### 后端 API
- **控制器**: `backend/src/controllers/offlineOrderController.js`
- **路由**: `backend/src/routes/adminOfflineOrders.js`
- **服务**: `backend/src/services/offlineWorkflowService.js`

## 页面关系图

```
客户下单流程:
/offline-orders (page.tsx)
  ├─ 第1步：产品选择
  ├─ 第2步：印刷位置
  ├─ 第3步：客人信息和价格（包含项目详情）
  └─ 第4步：文件上传（支持移动端拍照）

管理员管理:
/admin/offline-orders (page.tsx)
  ├─ 订单列表（看板视图）
  ├─ 订单详情
  ├─ 阶段流转
  └─ 指标统计

销售员查看:
/offline-orders/sales/login (page.tsx) → 登录
  └─ /offline-orders/sales/orders (page.tsx) → 订单列表
      └─ /offline-orders/sales/orders/[id] (page.tsx) → 订单详情
```

## 功能特性

### 客户下单页面特性
- ✅ 多步骤表单流程（4步）
- ✅ 多产品定制支持
- ✅ 按产品配置印刷位置
- ✅ 价格计算和折扣管理
- ✅ 发票信息收集
- ✅ 文件上传（支持拖拽）
- ✅ 移动端拍照支持
- ✅ 草稿保存功能
- ✅ 中英文双语支持

### 管理员页面特性
- ✅ 看板式订单管理
- ✅ 阶段流转
- ✅ 订单详情查看
- ✅ 附件管理
- ✅ 生产工单关联
- ✅ 指标统计

### 销售员页面特性
- ✅ 订单列表查看
- ✅ 订单详情查看
- ✅ 角色权限控制

