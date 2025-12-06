# 代码审查报告 - 对比 PRD v2.0

**审查时间**: 2025-12-06 17:40:00  
**需求文档**: `docs/OFFLINE-ORDERS-PRD-V2.md`  
**当前实现**: `apps/web/src/app/offline-orders/page.tsx`

## 一、流程步骤 ✅

### 需求
- 3步流程：产品选择+配置、客户信息、文件上传
- 可自由前进后退
- 步骤导航支持点击跳转

### 实现状态
- ✅ 已实现3步流程
- ✅ 步骤导航已支持点击跳转
- ⚠️ 前进后退逻辑需要验证（goToNextStep有验证拦截）

## 二、数据结构对比

### 2.1 FormState 结构

#### ❌ 当前实现 vs 需求

**当前实现（第72-100行）**：
```typescript
type FormState = {
  orderCode: string;
  productItems: ProductItem[]; // 使用旧的 ProductItem 结构
  sideCount: number;
  printPositions: PrintPosition[];
  productPrintConfigs: ProductPrintConfigMap;
  contactName: string;
  email: string;
  phone: string;
  dueDate: string;
  requiresInvoice: boolean;
  invoiceInfo: InvoiceInfo; // 缺少 paymentMethod 和 referenceNumber
  discount: number;
  projectName: string;
  requiresMockups: boolean;
  requiresProof: boolean;
  rushOrder: boolean;
  artworkNotes: string; // 存在但不在第一步
};
```

**PRD v2.0 需求**：
```typescript
type FormState = {
  orderCode: string;
  // 第一步：产品配置
  productItems: ProductItem[]; // 需要新的结构
  globalPrintPositions: PrintPosition[]; // 需要包含 printingStyle, dstFileFee
  orderNotes: string; // 必填，应在第一步
  dstFileFee: number; // 订单级别
  // 第二步：客户信息
  contactName: string;
  email: string;
  phone: string;
  company: string; // 需要添加到表单
  dueDate: string;
  requiresInvoice: boolean;
  invoiceInfo: InvoiceInfo; // 需要包含 paymentMethod 和 referenceNumber
  // 第三步：文件上传（非必填）✅
  files: File[];
  // 价格汇总
  subtotal: number;
  discount: number;
  discountAmount: number;
  taxRate: number; // 0.13
  taxAmount: number;
  total: number;
  // 流程控制
  currentStep: number;
};
```

#### ❌ 缺失字段

1. **第一步相关**：
   - ❌ `orderNotes` 不在第一步（当前在项目详情中）
   - ❌ `dstFileFee` 字段缺失
   - ❌ `globalPrintPositions` vs `printPositions`（命名不一致）

2. **第二步相关**：
   - ❌ `company` 字段缺失（表单中）
   - ❌ `invoiceInfo.paymentMethod` 缺失
   - ❌ `invoiceInfo.referenceNumber` 缺失

3. **价格汇总**：
   - ❌ `subtotal` 计算字段
   - ❌ `discountAmount` 计算字段
   - ❌ `taxRate` (0.13)
   - ❌ `taxAmount` 计算字段
   - ❌ `total` 总计字段

### 2.2 ProductItem 结构

#### ❌ 当前实现（第52-58行）
```typescript
type ProductItem = {
  id: string;
  categoryId: string; // ❌ 应该使用 productId（可维护的产品）
  categoryName: string; // ❌ 应该使用 productName
  variants: ProductVariant[]; // ❌ 旧结构
};
```

#### ✅ PRD v2.0 需求
```typescript
type ProductItem = {
  id: string;
  productId: string; // ✅ 可维护的产品ID
  productName: string; // ✅ 产品名称
  isCustomerOwned: boolean; // ❌ 缺失：是否客户自带服装
  colors: ProductColor[]; // ❌ 需要新的颜色结构
  printPositions?: PrintPosition[]; // ❌ 单独产品印刷位置
  useSeparatePrintPositions: boolean; // ❌ 缺失
  totalQuantity: number;
  totalPrice: number;
};
```

### 2.3 ProductColor 结构

#### ❌ 当前实现
- 使用 `variants` 数组（尺码和颜色混合）
- 不支持同一产品的多个颜色

#### ✅ PRD v2.0 需求
```typescript
type ProductColor = {
  colorId: string; // ❌ 缺失
  colorName: string; // ❌ 缺失
  availableSizes: string[]; // ❌ 缺失：可用尺码列表
  sizes: SizeQuantity[]; // ❌ 缺失：尺码数量配置
  totalQuantity: number;
  totalPrice: number;
};
```

### 2.4 SizeQuantity 结构

#### ❌ 当前实现
- 尺码、颜色、数量混合在 `variants` 中

#### ✅ PRD v2.0 需求
```typescript
type SizeQuantity = {
  size: string;
  quantity: number;
  unitPrice: number;
  additionalFee: number; // ❌ 缺失：大尺码额外费用
  subtotal: number; // ❌ 缺失：小计
};
```

### 2.5 PrintPosition 结构

#### ❌ 当前实现（第28-34行）
```typescript
type PrintPosition = {
  position: string;
  width: string;
  height: string;
  notes: string;
};
```

#### ✅ PRD v2.0 需求
```typescript
type PrintPosition = {
  position: string;
  printingStyle: string; // ❌ 缺失：DTF, Embroidery, UV, Vinyl, 其他
  dstFileFee?: number; // ❌ 缺失：DST File Fee（仅Embroidery）
  width?: string; // ✅
  height?: string; // ✅（width和height至少一个）
  notes: string; // ✅
};
```

### 2.6 InvoiceInfo 结构

#### ❌ 当前实现（第61-70行）
```typescript
type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};
```

#### ✅ PRD v2.0 需求
```typescript
type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod?: 'card' | 'etrans'; // ❌ 缺失
  referenceNumber?: string; // ❌ 缺失
};
```

## 三、功能需求对比

### 3.1 第一步：产品选择与配置

#### 3.1.1 产品选择界面

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 产品卡片显示 | ✅ | ✅ | 已实现 |
| 产品下拉菜单 | 可维护的产品列表 | ❌ | 当前使用 categoriesApi |
| "其他"选项 | ✅ | ❌ | 缺失 |
| "客户自带服装" | ✅ | ❌ | 完全缺失 |
| 产品图片 | 可选 | ❌ | 未显示 |
| 关闭按钮（X） | ✅ | ✅ | 已实现 |

#### 3.1.2 颜色选择

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 颜色下拉菜单 | 可维护的颜色列表 | ❌ | 当前硬编码：['White', 'Black', ...] |
| "其他"选项 | ✅ | ❌ | 缺失 |
| "Add another color" | ✅ | ❌ | 当前不支持同一产品多个颜色 |
| "自带颜色"（客户自带服装） | ✅ | ❌ | 缺失 |

#### 3.1.3 尺码输入

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| YOUTH尺码（YS, YM, YL） | ✅ | ❌ | 当前只有ADULT尺码 |
| ADULT尺码 | ✅ | ✅ | 已实现 |
| 尺码可用性控制 | ✅ | ❌ | 未实现（应该灰色禁用） |
| 大尺码额外费用显示 | ✅ | ❌ | 完全缺失 |
| 额外费用配置（2XL-5XL） | ✅ | ❌ | 后端API未实现 |
| 移除"View Sizing Guide" | ✅ | ❌ | 需要检查是否还在 |

#### 3.1.4 价格计算

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 单价输入 | ✅ | ✅ | 已实现 |
| 小计计算（含额外费用） | ✅ | ❌ | 未包含额外费用 |
| 价格汇总显示 | ✅ | ✅ | 已实现 |

#### 3.1.5 印刷位置配置

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 总体印刷位置 | ✅ | ✅ | 已实现 |
| 单独产品印刷位置 | ✅ | ⚠️ | 部分实现（productPrintConfigs） |
| PrintingStyle下拉 | ✅ | ❌ | 完全缺失（DTF, Embroidery, UV, Vinyl） |
| Height/Width OR关系 | ✅ | ⚠️ | 当前都是必填，应该至少一个 |
| Embroidery DST File Fee | ✅ | ❌ | 完全缺失 |

#### 3.1.6 订单备注

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 备注栏（必填） | ✅ | ⚠️ | 存在但不在第一步，在项目详情中 |

### 3.2 第二步：客户信息与Invoice

#### 3.2.1 客户基本信息

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 联系人姓名（必填） | ✅ | ✅ | 已实现 |
| 邮箱（必填） | ✅ | ✅ | 已实现 |
| 电话（可选） | ✅ | ✅ | 已实现 |
| 公司（可选） | ✅ | ❌ | 缺失 |
| 交付日期（可选） | ✅ | ✅ | 已实现 |

#### 3.2.2 Invoice功能

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| Invoice选项复选框 | ✅ | ✅ | 已实现 |
| Invoice信息表单 | ✅ | ✅ | 已实现 |
| 税计算（13%） | ✅ | ❌ | 未实现 |
| 支付方式下拉 | ✅ | ❌ | 缺失（刷卡/e-trans） |
| Reference Number | ✅ | ❌ | 缺失（必填） |
| 税前和税后显示 | ✅ | ❌ | 缺失 |

### 3.3 第三步：文件上传

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 非必填 | ✅ | ✅ | 已实现（可选） |
| 拖拽上传 | ✅ | ✅ | 已实现 |
| 移动端拍照 | ✅ | ✅ | 已实现 |
| 文件类型限制 | ✅ | ✅ | 已实现 |
| 文件预览和删除 | ✅ | ✅ | 已实现 |

### 3.4 数据管理功能（管理员后台）

#### ❌ 完全未实现

| 功能 | 需求 | 实现状态 | 备注 |
|------|------|----------|------|
| 数据管理Tab | ✅ | ❌ | `/admin/offline-orders` 需要添加Tab |
| 产品管理界面 | ✅ | ❌ | 完全缺失 |
| 颜色管理界面 | ✅ | ❌ | 完全缺失 |
| 尺码费用配置界面 | ✅ | ❌ | 完全缺失 |
| 可用性配置界面 | ✅ | ❌ | 完全缺失 |

## 四、后端API对比

### 4.1 产品管理API

| API | 需求 | 实现状态 |
|-----|------|----------|
| GET /api/admin/offline-order-products | ✅ | ❌ |
| POST /api/admin/offline-order-products | ✅ | ❌ |
| PATCH /api/admin/offline-order-products/:id | ✅ | ❌ |
| DELETE /api/admin/offline-order-products/:id | ✅ | ❌ |

### 4.2 颜色管理API

| API | 需求 | 实现状态 |
|-----|------|----------|
| GET /api/admin/offline-order-colors | ✅ | ❌ |
| POST /api/admin/offline-order-colors | ✅ | ❌ |
| PATCH /api/admin/offline-order-colors/:id | ✅ | ❌ |
| DELETE /api/admin/offline-order-colors/:id | ✅ | ❌ |

### 4.3 尺码费用配置API

| API | 需求 | 实现状态 |
|-----|------|----------|
| GET /api/admin/offline-order-size-fees | ✅ | ❌ |
| PATCH /api/admin/offline-order-size-fees | ✅ | ❌ |

### 4.4 可用性配置API

| API | 需求 | 实现状态 |
|-----|------|----------|
| GET /api/admin/offline-order-product-color-sizes | ✅ | ❌ |
| POST /api/admin/offline-order-product-color-sizes | ✅ | ❌ |
| PATCH /api/admin/offline-order-product-color-sizes/:id | ✅ | ❌ |
| DELETE /api/admin/offline-order-product-color-sizes/:id | ✅ | ❌ |
| POST /api/admin/offline-order-product-color-sizes/batch | ✅ | ❌ |

### 4.5 订单创建配置API

| API | 需求 | 实现状态 | 备注 |
|-----|------|----------|------|
| GET /api/offline-orders/config | ✅ | ⚠️ | 已定义接口但后端未实现 |

### 4.6 订单提交API

| API | 需求 | 实现状态 | 备注 |
|-----|------|----------|------|
| POST /api/offline-orders | ✅ | ✅ | 已实现但数据结构需要调整 |

## 五、数据库模型对比

### ❌ 完全未实现的新表

1. `OfflineOrderProduct` - 产品表
2. `OfflineOrderColor` - 颜色表
3. `OfflineOrderSizeFee` - 尺码费用配置表
4. `OfflineOrderProductColorSize` - 可用性配置表

### ⚠️ 现有表需要扩展

| 表 | 需求字段 | 实现状态 |
|----|----------|----------|
| OfflineOrder | orderNotes | ❌ |
| OfflineOrder | dstFileFee | ❌ |
| OfflineOrder | paymentMethod | ❌ |
| OfflineOrder | referenceNumber | ❌ |

## 六、验证规则对比

### 6.1 第一步验证

| 验证项 | 需求 | 实现状态 |
|--------|------|----------|
| 至少选择一个产品 | ✅ | ✅ |
| 每个产品至少一个颜色 | ✅ | ✅ |
| 每个颜色至少一个尺码数量>0 | ✅ | ✅ |
| 每个尺码必须填写单价>0 | ✅ | ✅ |
| 订单备注必填 | ✅ | ⚠️ | 备注不在第一步验证 |
| Height或Width至少一个 | ✅ | ❌ | 当前都是必填 |

### 6.2 第二步验证

| 验证项 | 需求 | 实现状态 |
|--------|------|----------|
| 联系人姓名必填 | ✅ | ✅ |
| 邮箱格式验证 | ✅ | ✅ |
| Invoice时所有字段必填 | ✅ | ✅ |
| Invoice时支付方式必填 | ✅ | ❌ |
| Invoice时Reference Number必填 | ✅ | ❌ |

### 6.3 流程控制验证

| 功能 | 需求 | 实现状态 |
|------|------|----------|
| 自由前进后退 | ✅ | ⚠️ | goToNextStep有验证拦截 |
| 无强制顺序限制 | ✅ | ⚠️ | 需要验证 |
| 点击步骤导航跳转 | ✅ | ✅ | 已实现 |

## 七、总结

### ✅ 已实现的功能

1. ✅ 3步流程基础框架
2. ✅ 步骤导航点击跳转
3. ✅ 文件上传（非必填）
4. ✅ 基本的客户信息表单
5. ✅ 基本的Invoice表单
6. ✅ 基本的产品选择和变体配置
7. ✅ 基本的印刷位置配置

### ❌ 需要实现的主要功能

#### P0 - 核心功能缺失

1. **数据结构重构**
   - ProductItem 使用新结构（productId, isCustomerOwned, colors数组）
   - ProductColor 结构实现
   - SizeQuantity 包含额外费用
   - PrintPosition 包含 printingStyle 和 dstFileFee
   - InvoiceInfo 包含 paymentMethod 和 referenceNumber

2. **第一步功能**
   - 产品管理API集成（替换categoriesApi）
   - "客户自带服装"功能
   - "Add another color"功能
   - 颜色管理API集成
   - 尺码额外费用显示和计算
   - 尺码可用性控制
   - PrintingStyle下拉菜单
   - DST File Fee输入（Embroidery时）
   - 订单备注移到第一步

3. **第二步功能**
   - 公司字段
   - 支付方式下拉
   - Reference Number输入
   - 13%税率计算
   - 税前税后显示

4. **后端API开发**
   - 所有产品/颜色/尺码费用/可用性配置API
   - `/api/offline-orders/config` API实现

5. **数据库模型**
   - 新增4个表
   - OfflineOrder表扩展字段

6. **管理员后台**
   - Tab切换功能
   - 产品管理界面
   - 颜色管理界面
   - 尺码费用配置界面
   - 可用性配置界面

### 📊 完成度估算

- **流程框架**: 70% ✅
- **数据结构**: 30% ❌
- **第一步功能**: 40% ❌
- **第二步功能**: 70% ⚠️
- **第三步功能**: 100% ✅
- **后端API**: 10% ❌
- **数据库模型**: 0% ❌
- **管理员后台**: 0% ❌

**总体完成度**: 约 **35%**

---

**建议开发顺序**：
1. 数据库Schema和Migration（P0）
2. 后端API开发（P0）
3. 数据结构重构（P0）
4. 第一步UI重构（P0）
5. 第二步功能完善（P0）
6. 管理员后台开发（P0）

