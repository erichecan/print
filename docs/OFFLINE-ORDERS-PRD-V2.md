# 线下订单创建流程完整需求文档（PRD v2.0）

**版本**：2.0  
**更新日期**： 
**状态**：待开发

## 一、核心变更概述（已确认）

### 1.1 流程简化

**新流程：3步（可自由前进后退）**

- 第1步：产品选择、颜色、尺码、印刷位置、价格、备注
- 第2步：客户信息（含Invoice信息）
- 第3步：文件上传（非必填）

### 1.2 流程控制

- 所有步骤可自由前进后退
- 无强制顺序限制
- 步骤导航栏支持点击跳转

### 1.3 数据管理入口统一

- 数据管理功能在管理员后台（`/admin/offline-orders`）统一展示
- 销售主管界面可访问同一份数据（权限控制）
- 数据统一存储，仅展示位置不同

## 二、详细功能需求（更新版）

### 2.1 第一步：产品选择与配置

#### 2.1.1 产品选择界面（参考截图）

**界面布局**：
- 每个产品显示为独立卡片
- 卡片包含：产品图片（可选）、产品名称、关闭按钮（X）

**产品下拉菜单**：
- 数据来源：可维护的产品列表
- 选项：包含"其他"选项
- 支持添加多个"客户自带服装"产品

**"客户自带服装"功能**：
- 可在产品下拉菜单中选择
- 可以添加多个"客户自带服装"产品
- 选择后：
  - 显示为独立产品卡片
  - 颜色菜单中显示"自带颜色"选项
  - 其他功能相同

#### 2.1.2 颜色选择

- 颜色下拉菜单：可维护的颜色列表，包含"其他"选项
- "Add another color"功能：为同一产品添加多个颜色

#### 2.1.3 尺码输入（参考截图）

**尺码分类**：
- YOUTH（童装）：YS, YM, YL
- ADULT（成人）：XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL

**尺码可用性**：
- 不同颜色可能有不同的可用尺码
- 不可用尺码：灰色显示，禁用输入框
- 可用尺码：正常显示，可输入件数

**尺码输入框**：
- 每个尺码一个输入框
- 输入值：该颜色该尺码的件数（数字）
- 默认值：0或空

**额外费用显示（可自定义）**：
- 大尺码额外费用在销售主管后台可自定义
- 默认值：
  - 2XL: +$2.50
  - 3XL: +$3.50
  - 4XL: +$4.50
  - 5XL: +$5.50
- 显示位置：尺码下方

**移除功能**：
- 移除"View Sizing Guide"链接

#### 2.1.4 价格计算

- 单价输入：手动输入单价（CAD）
- 小计计算：自动计算（件数 × 单价 + 额外费用）
- 价格汇总：显示在页面下方或固定区域

#### 2.1.5 印刷位置配置

- 总体印刷位置（默认）
- 单独产品印刷位置（可选）
- PrintingStyle：DTF, Embroidery, UV, Vinyl, 其他
- Height/Width：OR关系，至少填写一个
- Embroidery特殊处理：选择Embroidery时，弹出小窗口输入DST File Fee（订单级别）

#### 2.1.6 订单备注

- 备注栏：多行文本输入框，必填

### 2.2 第二步：客户信息与Invoice

#### 2.2.1 客户基本信息

- 联系人姓名（必填）
- 邮箱（必填）
- 电话（可选）
- 公司（可选）
- 交付日期（可选）

#### 2.2.2 Invoice功能

- Invoice选项：复选框
- Invoice信息表单：公司信息、地址等
- 税计算：13%安省税率，显示税前和税后
- 支付信息（Invoice时必填）：
  - 支付方式：下拉选择（刷卡/e-trans）
  - Reference Number：文本输入框（必填）

### 2.3 第三步：文件上传（非必填）

**功能保持现有**：
- 支持拖拽上传
- 支持移动端拍照
- 文件类型限制：AI/EPS/SVG/PDF/PNG/JPG/JPEG/PSD
- 最大文件数量：10个
- 最大文件大小：50MB
- 文件预览和删除

**非必填**：可以不传文件直接提交

### 2.4 数据管理功能（统一入口）

#### 2.4.1 管理入口位置

- **主要入口**：管理员后台
- **路径**：`/admin/offline-orders`
- **位置**：线下订单管理页面
- **功能**：统一的数据管理入口

**权限控制**：
- 管理员：完整权限
- 销售主管：可访问（共享同一份数据）
- 普通销售：无权限

#### 2.4.2 产品管理

**入口位置**：
- `/admin/offline-orders` 页面
- 添加"产品管理"Tab或链接

**功能**：
- 产品列表展示
- 添加产品（名称、图片可选）
- 编辑产品
- 删除产品
- 标记为"客户自带服装"
- 查看使用统计（可选）

**数据字段**：
- 产品ID（自动生成）
- 产品名称（必填）
- 产品图片（可选）
- 是否客户自带服装（复选框）
- 创建时间
- 更新时间

#### 2.4.3 颜色管理

**入口位置**：
- `/admin/offline-orders` 页面
- 与产品管理在同一区域（Tab切换或子菜单）

**功能**：
- 颜色列表展示
- 添加颜色
- 编辑颜色
- 删除颜色
- 查看使用统计（可选）

**数据字段**：
- 颜色ID（自动生成）
- 颜色名称（必填）
- 颜色代码（可选，用于显示）
- 创建时间
- 更新时间

#### 2.4.4 尺码额外费用管理

**入口位置**：
- `/admin/offline-orders` 页面
- 与产品/颜色管理在同一区域

**功能**：
- 配置每个大尺码的额外费用
- 默认值：
  - 2XL: $2.50
  - 3XL: $3.50
  - 4XL: $4.50
  - 5XL: $5.50
- 可以自定义修改

**数据模型**：
- 尺码：2XL, 3XL, 4XL, 5XL（固定）
- 额外费用：可配置（Decimal）

#### 2.4.5 产品-颜色-尺码可用性配置

**说明**：
- 用于控制不同产品、不同颜色下哪些尺码可用
- 例如：某产品的某个颜色可能没有5XL

**入口位置**：
- `/admin/offline-orders` 页面
- 可在产品管理界面中配置，或独立配置界面

**功能**：
- 为每个产品-颜色组合配置可用尺码
- 默认：所有尺码可用
- 可以禁用特定尺码

**配置方式（可选方案）**：
- 方案A：在产品编辑页面中，为每个颜色配置可用尺码
- 方案B：独立的配置界面，选择产品、颜色，然后勾选可用尺码

## 三、数据模型设计（更新）

### 3.1 前端数据结构

```typescript
// 尺码额外费用配置
type SizeAdditionalFee = {
  size: string; // 2XL, 3XL, 4XL, 5XL
  fee: number; // 额外费用（可配置）
};

// 尺码数量输入
type SizeQuantity = {
  size: string; // 尺码：YS, YM, YL, XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL
  quantity: number; // 件数
  unitPrice: number; // 单价
  additionalFee: number; // 额外费用（从配置读取）
  subtotal: number; // 小计：quantity × (unitPrice + additionalFee)
};

// 产品颜色配置
type ProductColor = {
  colorId: string; // 颜色ID
  colorName: string; // 颜色名称
  availableSizes: string[]; // 可用尺码列表（从配置读取）
  sizes: SizeQuantity[]; // 尺码数量配置
  totalQuantity: number; // 该颜色总数量
  totalPrice: number; // 该颜色总价
};

// 印刷位置（扩展）
type PrintPosition = {
  position: string; // 位置（包含"其他"）
  printingStyle: string; // 工艺：DTF, Embroidery, UV, Vinyl, 其他
  dstFileFee?: number; // DST File Fee（仅Embroidery，订单级别）
  width?: string; // 宽度（inch），可选
  height?: string; // 高度（inch），可选（width和height至少一个）
  notes: string; // 备注
};

// 产品项目
type ProductItem = {
  id: string; // 唯一ID
  productId: string; // 产品ID（可维护）
  productName: string; // 产品名称
  isCustomerOwned: boolean; // 是否客户自带服装
  colors: ProductColor[]; // 颜色列表
  printPositions?: PrintPosition[]; // 单独印刷位置配置（可选）
  useSeparatePrintPositions: boolean; // 是否使用单独印刷位置
  totalQuantity: number; // 总数量
  totalPrice: number; // 总价格
};

// Invoice信息（扩展）
type InvoiceInfo = {
  companyName: string;
  companyEmail: string;
  taxNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod?: 'card' | 'etrans'; // 支付方式
  referenceNumber?: string; // Reference Number
};

// 表单状态
type FormState = {
  orderCode: string; // 订单编号
  
  // 第一步：产品配置
  productItems: ProductItem[]; // 产品列表
  globalPrintPositions: PrintPosition[]; // 总体印刷位置
  orderNotes: string; // 订单备注（必填）
  dstFileFee: number; // DST File Fee（订单级别，仅当有Embroidery时）
  
  // 第二步：客户信息
  contactName: string;
  email: string;
  phone: string;
  company: string;
  dueDate: string;
  requiresInvoice: boolean;
  invoiceInfo: InvoiceInfo;
  
  // 第三步：文件上传（非必填）
  files: File[];
  
  // 价格汇总
  subtotal: number; // 小计
  discount: number; // 折扣百分比
  discountAmount: number; // 折扣金额
  taxRate: number; // 税率（0.13 for 13%）
  taxAmount: number; // 税额
  total: number; // 总计（含税）
  
  // 流程控制
  currentStep: number; // 当前步骤（1-3）
};
```

### 3.2 后端数据模型

**新增数据库表**：

```prisma
// 线下订单产品（可维护）
model OfflineOrderProduct {
  id          String   @id @default(uuid())
  name        String   // 产品名称
  imageUrl    String?  // 产品图片URL（可选）
  isCustomerOwned Boolean @default(false) // 是否客户自带服装
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  colorSizes  OfflineOrderProductColorSize[]
  
  @@map("offline_order_products")
}

// 线下订单颜色（可维护）
model OfflineOrderColor {
  id          String   @id @default(uuid())
  name        String   @unique // 颜色名称
  hexCode     String?  // 颜色代码（可选）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  colorSizes  OfflineOrderProductColorSize[]
  
  @@map("offline_order_colors")
}

// 尺码额外费用配置
model OfflineOrderSizeFee {
  id          String   @id @default(uuid())
  size        String   @unique // 尺码：2XL, 3XL, 4XL, 5XL
  additionalFee Decimal @db.Decimal(10, 2) // 额外费用
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("offline_order_size_fees")
}

// 产品-颜色-尺码可用性配置
model OfflineOrderProductColorSize {
  id          String   @id @default(uuid())
  productId   String
  colorId     String
  size        String   // 尺码
  isAvailable Boolean  @default(true) // 是否可用
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  product     OfflineOrderProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  color       OfflineOrderColor   @relation(fields: [colorId], references: [id], onDelete: Cascade)
  
  @@unique([productId, colorId, size])
  @@index([productId, colorId])
  @@map("offline_order_product_color_sizes")
}
```

**现有表扩展**：

```prisma
// OfflineOrder 扩展字段
model OfflineOrder {
  // ... 现有字段
  
  orderNotes        String?     @db.Text // 订单备注
  dstFileFee        Decimal?    @db.Decimal(10, 2) // DST File Fee（订单级别）
  paymentMethod     String?     // 支付方式：card, etrans
  referenceNumber   String?     // Reference Number
  
  // ... 其他字段
}
```

## 四、API接口设计（更新）

### 4.1 产品管理API

```
GET    /api/admin/offline-order-products        // 获取产品列表
POST   /api/admin/offline-order-products        // 创建产品
PATCH  /api/admin/offline-order-products/:id    // 更新产品
DELETE /api/admin/offline-order-products/:id    // 删除产品
```

### 4.2 颜色管理API

```
GET    /api/admin/offline-order-colors          // 获取颜色列表
POST   /api/admin/offline-order-colors          // 创建颜色
PATCH  /api/admin/offline-order-colors/:id      // 更新颜色
DELETE /api/admin/offline-order-colors/:id      // 删除颜色
```

### 4.3 尺码额外费用配置API

```
GET    /api/admin/offline-order-size-fees       // 获取所有尺码费用配置
PATCH  /api/admin/offline-order-size-fees       // 批量更新尺码费用配置
```

### 4.4 产品-颜色-尺码可用性配置API

```
GET    /api/admin/offline-order-product-color-sizes?productId=xxx&colorId=xxx
POST   /api/admin/offline-order-product-color-sizes       // 创建配置
PATCH  /api/admin/offline-order-product-color-sizes/:id   // 更新配置
DELETE /api/admin/offline-order-product-color-sizes/:id   // 删除配置
POST   /api/admin/offline-order-product-color-sizes/batch // 批量配置
```

### 4.5 订单创建API（前端需要的数据）

```
GET    /api/offline-orders/config              // 获取创建订单所需的所有配置数据
// 返回：产品列表、颜色列表、尺码费用配置、尺码可用性配置等
```

### 4.6 订单提交API（调整）

```
POST /api/offline-orders
// 请求体调整为新的数据结构
```

## 五、管理员后台界面设计

### 5.1 数据管理入口

**位置**： `/admin/offline-orders` 页面

**布局方案**：
- **方案A：Tab切换**
  - [订单看板] [产品管理] [颜色管理] [尺码费用] [可用性配置]
- **方案B：侧边菜单**
  - 左侧导航：
    - 订单看板
    - 数据管理
      - 产品管理
      - 颜色管理
      - 尺码费用配置
      - 可用性配置

**推荐方案A**：与现有看板视图一致，Tab切换更直观。

### 5.2 产品管理界面

**功能模块**：
- 产品列表（表格）
- 添加产品按钮
- 编辑/删除操作
- 标记为"客户自带服装"复选框

**列表字段**：
- 产品名称
- 图片（缩略图）
- 是否客户自带服装
- 创建时间
- 操作（编辑/删除）

### 5.3 颜色管理界面

**功能模块**：
- 颜色列表（表格/卡片）
- 添加颜色按钮
- 编辑/删除操作

**列表字段**：
- 颜色名称
- 颜色代码（显示色块）
- 创建时间
- 操作（编辑/删除）

### 5.4 尺码费用配置界面

**功能模块**：
- 尺码费用配置表格
- 批量编辑功能

**配置项**：
- 2XL: $X.XX
- 3XL: $X.XX
- 4XL: $X.XX
- 5XL: $X.XX

### 5.5 可用性配置界面

**配置方式**：
- 选择产品
- 选择颜色
- 显示所有尺码列表（复选框）
- 勾选可用尺码
- 保存配置

## 六、验证规则（更新）

### 6.1 第一步验证

**必填项**：
- 至少选择一个产品
- 每个产品至少选择一个颜色
- 每个颜色至少填写一个尺码的数量（>0）
- 每个尺码必须填写单价（>0）
- 订单备注
- 印刷位置：Height或Width至少一个

**可选**：
- 单独产品印刷位置配置
- DST File Fee（仅当选择Embroidery时）

### 6.2 第二步验证

**必填项**：
- 联系人姓名
- 邮箱（格式验证）
- 如选择Invoice：
  - 所有Invoice字段
  - 支付方式
  - Reference Number

### 6.3 第三步验证

**可选**：
- 文件上传（非必填，可以不传文件直接提交）

### 6.4 流程控制

**步骤导航**：
- 所有步骤可自由前进后退
- 无强制顺序限制
- 支持点击步骤导航跳转

## 七、特殊情况处理（更新）

### 7.1 "客户自带服装"

- 产品选择"客户自带服装"
- 可以添加多个"客户自带服装"产品
- 颜色显示"自带颜色"
- 其他逻辑相同

### 7.2 大尺码额外费用

- 在管理员后台可自定义
- 默认值：2XL($2.50), 3XL($3.50), 4XL($4.50), 5XL($5.50)
- 前端从API读取配置

### 7.3 尺码可用性

- 在产品-颜色-尺码可用性配置中管理
- 默认：所有尺码可用
- 可以禁用特定尺码（灰色显示，禁用输入）

### 7.4 Embroidery DST File Fee

- 订单级别的一个费用
- 只要订单中有任何印刷位置选择Embroidery，就显示DST File Fee输入
- 计入订单总和

### 7.5 税计算

- 仅当选择需要Invoice时计算
- 税率固定13%（安省）
- 计算基础：小计 - 折扣
- 显示格式：税前和税后

## 八、开发优先级和阶段（更新）

### 阶段一：数据模型和API（P0）

- 数据库Schema设计和Migration
- 产品管理API开发
- 颜色管理API开发
- 尺码费用配置API开发
- 可用性配置API开发
- 订单创建配置API（获取所有配置数据）
- 订单提交API调整

### 阶段二：管理员后台数据管理界面（P0）

- `/admin/offline-orders` 页面添加Tab切换
- 产品管理界面开发
- 颜色管理界面开发
- 尺码费用配置界面开发
- 可用性配置界面开发

### 阶段三：订单创建流程重构（P0）

- 数据结构调整
- 第一步UI重构（参考截图样式）
- 移除"View Sizing Guide"链接
- 第二步UI调整（Invoice功能扩展）
- 第三步保持不变（文件上传非必填）
- 流程控制（自由前进后退）
- 表单验证调整
- 数据提交逻辑

### 阶段四：测试和优化（P1）

- 功能测试
- UI/UX优化
- 响应式设计
- 数据管理权限测试

## 九、工作量预估（更新）

- 后端开发：约 14 小时（2 个工作日）
- 管理员后台数据管理界面：约 8 小时（1 个工作日）
- 前端订单创建重构：约 30 小时（4 个工作日）
- 测试和优化：约 6 小时（1 个工作日）

**总计**：约 58 小时（8 个工作日）

## 十、关键确认点

✅ **已确认**：
- 文件上传非必填
- 流程可自由前进后退
- 可以添加多个"客户自带服装"产品
- 大尺码额外费用可在管理员后台自定义
- 移除"View Sizing Guide"链接
- 数据管理统一在 `/admin/offline-orders` 展示
- 数据统一存储，销售主管和管理员共享同一份数据

