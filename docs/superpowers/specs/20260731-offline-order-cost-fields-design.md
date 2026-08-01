# 线下订单成本字段补齐 + Sales Dashboard 排除规则 —— 设计文档

**日期**: 2026-07-31
**状态**: 待用户批准
**范围**: `offline-orders` 模块的成本数据补齐与 `sales dashboard` 统计排除规则

## 背景与问题

客户希望 sales dashboard 能按订单/产品拆细、看到真实成本，并且能筛掉某些订单。调研发现：

1. **成本计算逻辑已经存在，不是从零搭建**。`backend/src/controllers/offlineOrderController.js` 中的 `computeCostTotalFromConfig` 会在订单创建（`createOfflineOrder`）和编辑（`updateOfflineOrder`）时自动计算 `配置产品 unit_cost × 数量 + 尺码附加费 × 数量`，写入 `configuration.pricing.costTotal`，dashboard 也已读取该字段。产品成本目录本身也已经有管理界面（Orders 页「配置管理 → 产品」子页，对应 `offline_order_products.unit_cost`）。
2. **真正的缺口**：线下订单最常用的三个录单入口（桌面完整表单、移动端表单、Orders 页 Spreadsheet 快速内联新增行）都在日常使用，其中 **Spreadsheet 快速录单行完全没有"产品"字段**（连自由文本都没有，只有一个孤立的 `quantity` 数字），因此走这个入口创建的订单永远拿不到 `costTotal`，即便产品目录里成本配置得再准确。
3. **Dashboard 聚合不排除任何订单状态**，包括已取消订单；也没有排除 DTF 打印 film 类订单（`orderCategory` 字段）的机制；也没有针对个别订单（如内部样品/测试单）手动排除的开关。
4. Dashboard 所有聚合查询共享同一个 `buildMetricsWhere(req)` 函数（`offlineOrderController.js:1087`），是加排除条件的唯一正确落点，避免逐一修改 8~10 条独立的原始 SQL。

## 目标

1. 让三个录单入口最终都能产生真实、可信的订单成本（`configuration.pricing.costTotal`）。
2. 为历史上已经产生、成本为空/0 的订单提供人工批量回填手段。
3. Dashboard 统计口径自动排除：已取消订单、DTF 打印 film 类订单；并支持对个别订单手动开关排除。
4. 排除逻辑只影响 Dashboard 统计，不影响 Orders 列表页看到的数据范围。

## 非目标（本次不做）

- 不改变 `offline_order_products.unit_cost` 之外的成本颗粒度（不拆材料费/印刷费/人工费等细分成本，属于未来可能的需求）。
- 不做历史订单产品的自动/模糊匹配回填，均为人工操作。
- 不改动定价（`totalAmount`）与产品明细的联动逻辑，快速录单的 `totalAmount` 继续人工填写。
- 不重构 dashboard 现有的多次独立原始 SQL 查询架构（性能优化留作后续独立事项，仅在 `buildMetricsWhere` 这一个函数内新增排除条件）。

## 方案取舍

评估了三种落地思路：

- **方案 A（采用）**：把成本挂到现有的 `configuration.productItems` + `offline_order_products` 目录体系上，快速录单/批量回填都复用现成的 `computeCostTotalFromConfig`，后端计算逻辑零改动。
- **方案 B（否决）**：给快速录单加一个手填"总成本"数字框，绕开产品目录。更快但会造成两套成本口径并存、长期对不上账，且与已确认的"产品下拉联动"方向冲突。
- **方案 C（否决，记录为未来技术债选项）**：新建结构化 `OrderLineItem` 关系表取代 JSONB `configuration.productItems`。长期对可查询性更友好，但改动面大（含历史数据迁移、双轨兼容），超出本次范围。

## 设计详情

### 1. 数据模型改动

`prisma/schema.prisma` 的 `OfflineOrder` 新增一个字段：

```prisma
model OfflineOrder {
  // ...existing fields...
  excludeFromReports  Boolean   @default(false) @map("exclude_from_reports")
}
```

- 默认 `false`，不影响任何历史数据。
- 不新增成本相关字段——继续复用 `configuration.pricing.costTotal`。
- 迁移：`ALTER TABLE offline_orders ADD COLUMN exclude_from_reports BOOLEAN NOT NULL DEFAULT false;`

### 2. 快速录单产品选择器（`OrdersSpreadsheet.tsx` 内联新增行）

- 将当前的单一 `quantity` 输入框，替换为一个"产品明细"迷你面板：一个 `+ 产品` 入口按钮，点开是「产品下拉（搜索 `offline_order_products`，仅 `is_active=true`）+ 数量 + 添加」的小弹层。
- 已添加的产品以 chip 形式展示在行内（如 `T-shirt 黑色款 ×20 ✕`），可继续添加或删除。
- 顶部 `quantity` 字段改为**只读、自动汇总**所有产品行数量之和，不再允许直接手填，避免"产品明细数量"与"总数量"两个口径分裂（与桌面完整表单的既有做法保持一致）。
- `totalAmount`（订单总金额）继续人工填写，不从产品明细反推。

**提交数据组装**：每个产品行拼成一个最简化的 `ProductItem`（复用桌面表单已有的 TS 类型结构），不需要真实颜色/尺码：

```ts
{
  id: uuid(),
  productId: line.productId,
  productName: line.productName,
  isCustomerOwned: false,
  colors: [{
    groupId: uuid(), colorId: 'default', colorName: '',
    availableSizes: [],
    sizes: [{ size: 'NA', sizeKey: 'NA', quantity: line.quantity }],
    totalQuantity: line.quantity, totalPrice: 0,
  }],
  totalQuantity: line.quantity,
  totalPrice: 0,
}
```

`size: 'NA'` 是占位值：`computeCostTotalFromConfig` 会将其转大写后去匹配 `offline_order_size_fees`，不会命中任何真实尺码，大码附加费为 0，不会污染成本计算。

**后端零改动**：`POST /offline-orders`（`offlineOrdersInlineApi.create`）走标准 JSON body，`safeJsonParse` 原生支持接收对象（非字符串），前端把 `configuration: { productItems: [...] }` 加入 `createPayload` 即可，创建流程中既有的 `computeCostTotalFromConfig` 会自动计算并写入 `pricing.costTotal`。`PATCH /admin/offline-orders/:id`（`updateOfflineOrder`）的编辑重算逻辑同理。

### 3. 历史订单批量回填

- Orders 列表新增一个筛选视图「成本缺失」（`configuration.pricing.costTotal` 为空或订单无 `productItems`），复用现有多选 checkbox，新增批量操作按钮「补充成本」。
- 弹窗列出选中订单（订单号、客户名、当前 `totalAmount` 作参考），每行提供与第 2 节同款的「产品 + 数量」迷你添加器，人工逐单确认。
- 批量提交时循环调用 `PATCH /admin/offline-orders/:id`（`offlineOrdersInlineApi.patch`），body 携带 `configuration: { productItems: [...] }`，复用 `updateOfflineOrder` 既有重算逻辑。前端做有进度条的顺序/小并发提交，失败单独标红可重试。
- **不做**历史订单到目录产品的自动/模糊匹配——`primaryProduct` 是自由文本，强行匹配容易算错成本，比没有成本更危险。全部人工挑选。

### 4. Dashboard 排除规则

在 `buildMetricsWhere(req)`（`offlineOrderController.js:1087`）中新增三个条件，一次性覆盖所有共享该函数的聚合查询：

- `status NOT IN ('已取消', 'CANCELLED')`
- `order_category IS DISTINCT FROM 'DTF打印film'`（用 `IS DISTINCT FROM` 而非 `!=`，因为 `orderCategory` 可能为 `NULL`，普通 `!=` 对 `NULL` 恒为 false 会导致该条件形同虚设）
- `exclude_from_reports = false`

- Orders 列表页默认**不**应用这些过滤——列表要能看到全部订单（含已取消/DTF/手动排除），只在列表里给 DTF 类目和"已排除"订单加视觉标记（灰底或 badge），方便识别为何某单未进入 dashboard 统计。
- `excludeFromReports` 开关放在订单详情/编辑页，简单 toggle，不记录排除原因。

## 风险与边界情况

- **历史区间统计失真**：在批量回填完成前，`all time` / 覆盖历史订单的时间区间统计里毛利率会偏高（因为部分订单成本仍为 0）。批量回填入口上线后需要提示/跟踪回填进度，但不阻塞本次功能上线。
- **`orderCategory` 为 NULL 的订单**：不会被 DTF 排除规则误伤（`IS DISTINCT FROM` 对 NULL 的处理已在设计中说明），会被视为"烫印服装"类正常计入统计。
- **快速录单新增产品明细面板的可用性**：桌面完整表单的产品选择器目前是纯下拉列表（过滤掉已添加产品，无搜索框），本次沿用同样的纯下拉交互，不新增搜索能力。若后续产品目录条目增多导致下拉过长，属于独立的后续优化项，不阻塞本次功能。
- **并发批量回填提交失败**：需要有明确的每行成功/失败状态展示，避免用户不知道哪些订单没回填成功。

## 验收标准

- [ ] Spreadsheet 快速录单能选择产品+数量（支持多个产品行），提交后新建订单的 `configuration.pricing.costTotal` 为非零真实值（当产品目录成本非零时）。
- [ ] 通过桌面表单、移动端表单、Spreadsheet 快速录单三个入口创建的订单，成本计算结果一致（同样的产品+数量得到相同 costTotal）。
- [ ] Orders 列表能筛出"成本缺失"订单，能批量回填产品明细并自动补算成本。
- [ ] Dashboard 统计（营收、订单数、成本、毛利、best sellers 等所有卡片/图表）不再包含已取消订单、`orderCategory='DTF打印film'`订单、`excludeFromReports=true`订单。
- [ ] Orders 列表页订单总数/内容不受排除规则影响，DTF 与已排除订单有可识别的视觉标记。
- [ ] 用未携带 token 的请求测试新增/修改的 API，确认仍返回 401（沿用现有鉴权中间件，无需新增鉴权代码，但需验证未被无意绕过）。
