# 线下订单成本字段补齐 + Sales Dashboard 排除规则 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让三个线下订单录单入口(桌面表单/移动端表单/Spreadsheet 快速录单)最终都能产生真实成本数据，为历史订单提供批量回填手段，并让 Sales Dashboard 统计自动排除已取消/DTF打印film/手动标记的订单。

**Architecture:** 后端成本计算(`computeCostTotalFromConfig`)与 dashboard 聚合过滤(`buildMetricsWhere`)已存在，只需：(1) 让 Spreadsheet 快速录单也能提交符合其解析格式的 `configuration.productItems`；(2) 新增 `excludeFromReports` 字段并在唯一的聚合过滤函数里加排除条件；(3) 补一个历史订单批量回填入口。全部改动复用现有的 create/update/list 接口，不新增后端路由。

**Tech Stack:** Next.js 14 App Router (前端) + Express + Prisma/PostgreSQL (后端)，沿用仓库既有约定。

## Global Constraints

- 所有写操作 API 已由 `authenticate` + `authorizeRoles(...ORDER_MANAGEMENT_ROLES)` 中间件保护（见 `backend/src/routes/adminOfflineOrders.js`），本计划不新增路由，因此无需新增鉴权代码，但每个改动点在验证步骤里都要确认鉴权未被绕过。
- 本仓库对 `offlineOrderController.js` 没有既有的 Jest 单元测试覆盖（`backend/tests/unit/` 下无 `offlineOrderController.test.js`），项目 CLAUDE.md 的验证方式约定是启动本地服务后用 `curl` 测试 API、用浏览器手动验证 UI。因此本计划的每个任务用**手动验证步骤（curl 命令 + 预期输出 / 浏览器操作 + 预期界面）**代替传统 TDD 红绿循环，不新增不匹配现有约定的测试基础设施。
- 前端 ID 生成沿用仓库既有写法 `` `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` ``（见 `apps/web/src/app/offline-orders/page.tsx:806`），不引入 `uuid` 包。
- `computeCostTotalFromConfig`（`backend/src/controllers/offlineOrderController.js:97-176`）读取的是 `item.colors[].sizes[].quantity`（`ProductColor`/`SizeQuantity` 结构），**不是** `apps/web/src/lib/api.ts` 里的共享类型 `OfflineOrderProductItem.variants[]`——那个类型与实际运行时数据格式不符，本计划新增代码一律不使用它，一律手写匹配 `colors[].sizes[]` 嵌套结构的对象字面量。

---

### Task 1: Prisma schema — 新增 excludeFromReports 字段

**Files:**
- Modify: `prisma/schema.prisma:559-563`（`OfflineOrder` model，`orderCategory` 字段之后）
- Create: `prisma/migrations/<timestamp>_add_offline_order_exclude_from_reports/migration.sql`（由 `prisma migrate dev` 自动生成，命名参考现有 `20260731220000_add_offline_order_category` 目录格式）

**Interfaces:**
- Produces: `OfflineOrder.excludeFromReports: boolean`（Prisma Client 字段，映射 DB 列 `exclude_from_reports`，默认 `false`），后续任务读写此字段。

- [ ] **Step 1: 修改 schema.prisma**

在 `prisma/schema.prisma` 第 559 行 `orderCategory` 字段后加一行：

```prisma
  orderCategory       String?                    @map("order_category")
  // [2026-07-31] 手动"从报表排除"开关：用于个别订单(如内部样品/测试单)不计入 sales dashboard 统计
  excludeFromReports  Boolean                    @default(false) @map("exclude_from_reports")
  invoiceStatus       String                     @default("No") @map("invoice_status")   // 发票状态：No / Require / Sent
```

- [ ] **Step 2: 生成并执行迁移**

在仓库根目录运行：

```bash
npx prisma migrate dev --name add_offline_order_exclude_from_reports
```

Expected: 命令成功退出，在 `prisma/migrations/` 下生成一个新目录，其中 `migration.sql` 内容包含：

```sql
ALTER TABLE "offline_orders" ADD COLUMN "exclude_from_reports" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 3: 重新生成 Prisma Client**

```bash
npx prisma generate
```

Expected: 命令成功退出，无报错。

- [ ] **Step 4: 验证迁移状态与默认值**

```bash
npx prisma migrate status
```

Expected: 输出包含 `Database schema is up to date!`。

```bash
psql "$DATABASE_URL" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='offline_orders' AND column_name='exclude_from_reports';"
```

Expected: 一行结果，`data_type` 为 `boolean`，`column_default` 为 `false`。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(offline-orders): add excludeFromReports field to OfflineOrder"
```

---

### Task 2: 后端 create/update 接口支持 excludeFromReports

**Files:**
- Modify: `backend/src/controllers/offlineOrderController.js:433-467`（`mapOrder` 函数）
- Modify: `backend/src/controllers/offlineOrderController.js:540-562`（`createOfflineOrder` 请求体解构，`exports.createOfflineOrder` 内）
- Modify: `backend/src/controllers/offlineOrderController.js:621-635`（`createOfflineOrder` 的 `orderPayload` 构建）
- Modify: `backend/src/controllers/offlineOrderController.js:1836-1868`（`updateOfflineOrder` 请求体解构）
- Modify: `backend/src/controllers/offlineOrderController.js:1892`（`updateOfflineOrder` 的 `data` 赋值）
- Modify: `apps/web/src/lib/api.ts:1057-1065`（`SalesOfflineOrderSummary` 接口）

**Interfaces:**
- Consumes: Task 1 产出的 `OfflineOrder.excludeFromReports` 字段。
- Produces: `mapOrder(order).excludeFromReports: boolean`，供 Task 6/7 前端读取；`createOfflineOrder`/`updateOfflineOrder` 接受 `req.body.excludeFromReports`（boolean 或 boolean 字符串）。

- [ ] **Step 1: mapOrder 加字段**

在 `backend/src/controllers/offlineOrderController.js:459` （`purchaseStatus: order.purchaseStatus ?? null,` 之后）加一行：

```js
  purchaseStatus: order.purchaseStatus ?? null,
  // [2026-07-31] 手动"从报表排除"开关
  excludeFromReports: order.excludeFromReports ?? false,
```

- [ ] **Step 2: createOfflineOrder 解构 + 赋值**

在 `backend/src/controllers/offlineOrderController.js:561` （`orderCategory` 解构行之后）加：

```js
      // [2026-07-31] 订单类别：烫印服装 / DTF打印film
      orderCategory,
      // [2026-07-31] 手动"从报表排除"开关，创建时默认 false（未传即为 false）
      excludeFromReports
    } = req.body;
```

在 `backend/src/controllers/offlineOrderController.js:630`（`rushOrder: parseBoolean(rushOrder),` 之后）加：

```js
      rushOrder: parseBoolean(rushOrder),
      excludeFromReports: parseBoolean(excludeFromReports),
```

- [ ] **Step 3: updateOfflineOrder 解构 + 条件赋值**

在 `backend/src/controllers/offlineOrderController.js:1858`（`orderCategory,` 解构行之后）加：

```js
      // [2026-07-31] 订单类别：烫印服装 / DTF打印film
      orderCategory,
      // [2026-07-31] 手动"从报表排除"开关
      excludeFromReports,
```

在 `backend/src/controllers/offlineOrderController.js:1892`（`if (rushOrder !== undefined) data.rushOrder = parseBoolean(rushOrder);` 之后）加：

```js
    if (rushOrder !== undefined) data.rushOrder = parseBoolean(rushOrder);
    if (excludeFromReports !== undefined) data.excludeFromReports = parseBoolean(excludeFromReports);
```

- [ ] **Step 4: 前端类型加字段**

在 `apps/web/src/lib/api.ts:1065`（`purchaseStatus?: string | null;` 之后）加：

```ts
  stockingStatus?: string | null;
  purchaseStatus?: string | null;
  // [2026-07-31] 手动"从报表排除"开关
  excludeFromReports?: boolean;
```

- [ ] **Step 5: 手动验证**

启动后端（`cd backend && npm run dev`），用一个已知的有效 token 测试创建带排除标记的订单：

```bash
curl -s -X POST http://localhost:3001/api/offline-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contactName":"测试排除单","orderCategory":"烫印服装","excludeFromReports":true}' | jq '.order.excludeFromReports'
```

Expected: 输出 `true`。

再测试 PATCH 关闭该标记：

```bash
curl -s -X PATCH http://localhost:3001/api/admin/offline-orders/<上一步返回的id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"excludeFromReports":false}' | jq '.order.excludeFromReports'
```

Expected: 输出 `false`。

再测试未携带 token 的请求确认仍返回 401：

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:3001/api/admin/offline-orders/<同id> \
  -H "Content-Type: application/json" -d '{"excludeFromReports":true}'
```

Expected: 输出 `401`。

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/offlineOrderController.js apps/web/src/lib/api.ts
git commit -m "feat(offline-orders): support excludeFromReports in create/update APIs"
```

---

### Task 3: Dashboard 聚合排除规则（buildMetricsWhere）

**Files:**
- Modify: `backend/src/controllers/offlineOrderController.js:1087-1112`（`buildMetricsWhere` 函数）
- Modify: `backend/src/controllers/offlineOrderController.js:1115-1139`（`buildRawWhereConditions` 函数）

**Interfaces:**
- Consumes: Task 1 的 `excludeFromReports` 字段、已有的 `status`/`orderCategory` 字段。
- Produces: `buildMetricsWhere(req)` 返回的 `where` 对象新增排除条件，供 `getOfflineOrderMetrics` 内所有 `prisma.offlineOrder.count`/相关查询使用；`buildRawWhereConditions` 返回的 `conditions`/`params` 新增排除条件，供全部 `$queryRawUnsafe` 聚合查询复用（`getOfflineOrderMetrics` 内共 8~10 处调用点全部自动生效，无需逐一修改）。

- [ ] **Step 1: buildMetricsWhere 加 Prisma where 条件**

把 `backend/src/controllers/offlineOrderController.js:1087-1112` 的 `buildMetricsWhere` 函数替换为：

```js
function buildMetricsWhere(req) {
  const where = {};
  const scope = (req.query.scope || 'all').toLowerCase();
  const creatorId = req.query.creatorId?.trim() || null;
  if (creatorId) {
    where.metadata = { path: ['submittedByUserId'], equals: creatorId };
  } else if (scope === 'mine' && req.user?.id) {
    where.metadata = { path: ['submittedByUserId'], equals: req.user.id };
  }
  const startDate = parseDate(req.query.startDate);
  const endDate = parseDate(req.query.endDate);
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  const primaryProduct = req.query.primaryProduct?.trim() || null;
  if (primaryProduct) {
    where.primaryProduct = { contains: primaryProduct, mode: 'insensitive' };
  }
  // [2026-07-31] Dashboard 统计口径排除规则：已取消订单 / DTF打印film订单 / 手动标记排除的订单
  where.status = { notIn: ['已取消', 'CANCELLED'] };
  where.orderCategory = { not: 'DTF打印film' };
  where.excludeFromReports = false;
  return where;
}
```

- [ ] **Step 2: buildRawWhereConditions 加对应的原始 SQL 条件**

把 `backend/src/controllers/offlineOrderController.js:1115-1139` 的 `buildRawWhereConditions` 函数替换为：

```js
  /** 为 raw SQL 生成 WHERE 条件与参数（与 buildMetricsWhere 一致） */
function buildRawWhereConditions(baseWhere, req, dateOverride = null) {
  const conditions = [];
  const params = [];
  if (baseWhere.metadata?.equals) {
    conditions.push(`(metadata->>'submittedByUserId') = $${params.length + 1}`);
    params.push(baseWhere.metadata.equals);
  }
  const createdAt = dateOverride ? dateOverride.createdAt : baseWhere.createdAt;
  if (createdAt) {
    if (createdAt.gte) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(createdAt.gte);
    }
    if (createdAt.lte) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(createdAt.lte);
    }
  }
  const primaryProduct = req?.query?.primaryProduct?.trim() || null;
  if (primaryProduct) {
    conditions.push(`primary_product ILIKE $${params.length + 1}`);
    params.push(`%${primaryProduct}%`);
  }
  // [2026-07-31] Dashboard 统计口径排除规则，与 buildMetricsWhere 保持一致
  // status 用中文/旧英文双值匹配；orderCategory 用 IS DISTINCT FROM 处理 NULL
  // （NULL != 'DTF打印film' 在 SQL 里恒为 NULL/false，会导致 orderCategory 为空的订单被误排除）
  conditions.push(`status NOT IN ('已取消', 'CANCELLED')`);
  conditions.push(`order_category IS DISTINCT FROM 'DTF打印film'`);
  conditions.push(`exclude_from_reports = false`);
  return { conditions, params };
}
```

- [ ] **Step 3: 确认 rawConditionsWithTableAlias 正确处理新条件的表别名**

`backend/src/controllers/offlineOrderController.js:1142-1150` 的 `rawConditionsWithTableAlias` 目前只对 `created_at`/`metadata`/`primary_product` 做别名替换。新增的三个条件字段（`status`/`order_category`/`exclude_from_reports`）在多表 JOIN 查询（如 `byCreator`，`offlineOrderController.js:1229` 附近 `FROM offline_orders o LEFT JOIN users u`）中如果不加别名，Postgres 会因列名歧义报错——但这三个字段只存在于 `offline_orders` 表，没有同名列出现在 JOIN 的其他表（`users`）里，因此不会有歧义，无需修改 `rawConditionsWithTableAlias`。此步骤仅为确认，不需要改代码，验证见 Step 4。

- [ ] **Step 4: 手动验证**

启动后端，构造一条已取消订单和一条 DTF 订单，确认它们不出现在 metrics 汇总里：

```bash
# 创建一条已取消 + 一条 DTF 订单（金额均设一个易识别的值 12345）
curl -s -X POST http://localhost:3001/api/offline-orders -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"contactName":"验证排除-已取消","orderCategory":"烫印服装","status":"已取消","totalAmount":12345,"configuration":{"pricing":{"total":12345}}}' | jq '.order.id'
curl -s -X POST http://localhost:3001/api/offline-orders -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"contactName":"验证排除-DTF","orderCategory":"DTF打印film","totalAmount":12345,"configuration":{"pricing":{"total":12345}}}' | jq '.order.id'

# 拉取全量时间范围的 metrics，确认 revenueTotal 不包含这两笔 12345
curl -s "http://localhost:3001/api/admin/offline-orders/metrics/summary?scope=all" -H "Authorization: Bearer $TOKEN" | jq '.revenue, .totalOrders'
```

Expected: 用一个全新的干净测试库或用差值比对（排除规则生效前后调用两次同一接口，`revenueTotal` 应正好减少 24690，`totalOrders` 应减少 2）。至少确认这两笔订单各自的 `configuration.pricing.total=12345` 不体现在返回的营收总额里。

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/offlineOrderController.js
git commit -m "feat(offline-orders): exclude cancelled/DTF-film/manually-flagged orders from dashboard metrics"
```

---

### Task 4: 列表接口支持"成本缺失"筛选

**Files:**
- Modify: `backend/src/controllers/offlineOrderController.js:893-1057`（`listOfflineOrders` 函数）

**Interfaces:**
- Consumes: 无新依赖，直接读 `configuration` JSONB 列。
- Produces: `GET /api/admin/offline-orders?costMissing=true` 支持的新查询参数，返回值结构不变（仍是 `{success, orders, pagination, stages}`），供 Task 7 前端筛选视图使用。

- [ ] **Step 1: 加 costMissing 查询参数解析与预查询**

在 `backend/src/controllers/offlineOrderController.js:924`（`const where = { AND: [] };` 之前）加：

```js
    const costMissing = req.query.costMissing === 'true';
```

在 `backend/src/controllers/offlineOrderController.js:975`（`if (search) {` 代码块结束之后，`// productionWorkOrder 日期范围` 注释之前）加一段：

```js
    // [2026-07-31] "成本缺失"筛选：configuration.pricing.costTotal 为空/0，或没有 productItems
    // JSONB 条件无法直接用 Prisma 结构化 where 表达，先用原始 SQL 查出符合条件的订单 id，再用 id in 过滤
    if (costMissing) {
      const missingRows = await prisma.$queryRawUnsafe(`
        SELECT id FROM offline_orders
        WHERE (configuration->'pricing'->>'costTotal') IS NULL
           OR (configuration->'pricing'->>'costTotal') !~ '^-?[0-9]+\\.?[0-9]*$'
           OR (configuration->'pricing'->>'costTotal')::numeric = 0
           OR configuration->'productItems' IS NULL
           OR jsonb_array_length(COALESCE(configuration->'productItems', '[]'::jsonb)) = 0
      `);
      const missingIds = missingRows.map((r) => r.id);
      where.AND.push({ id: { in: missingIds.length > 0 ? missingIds : ['__none__'] } });
    }
```

**说明**：`missingIds.length > 0 ? missingIds : ['__none__']` 是为了避免 `{ id: { in: [] } }` 在部分 Prisma 版本里退化成"不过滤"而不是"过滤出空结果"——用一个必然不存在的 id 保证语义正确（结果为空）。

- [ ] **Step 2: 手动验证**

```bash
curl -s "http://localhost:3001/api/admin/offline-orders?costMissing=true&limit=5" -H "Authorization: Bearer $TOKEN" \
  | jq '.orders[] | {id, orderCode, configuration: .configuration.pricing}'
```

Expected: 返回的每条订单，`configuration.pricing.costTotal` 均为 `null`/`0`/不存在。

```bash
curl -s "http://localhost:3001/api/admin/offline-orders?limit=5" -H "Authorization: Bearer $TOKEN" | jq '.pagination.total'
curl -s "http://localhost:3001/api/admin/offline-orders?costMissing=true&limit=5" -H "Authorization: Bearer $TOKEN" | jq '.pagination.total'
```

Expected: 第二个 `total` 小于等于第一个 `total`（成本缺失订单数不超过总订单数）。

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/offlineOrderController.js
git commit -m "feat(offline-orders): add costMissing filter to list endpoint"
```

---

### Task 5: Spreadsheet 快速录单产品选择器

**Files:**
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:20-37`（import 区，加 `offlineOrderProductApi`）
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:879-906`（`newDraft` state 定义）
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1033-1085`（`handleCreateInline` 函数）
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1367-1378`（快速录单行"件数"单元格 JSX）

**Interfaces:**
- Consumes: 已有的 `offlineOrderProductApi.getOrderConfig()` 客户端函数（`apps/web/src/lib/api.ts:1420`，返回 `{ data: { products: OfflineOrderProduct[], ... } }`，`products` 已过滤 `is_active=true`）；已有的 `offlineOrdersInlineApi.create(payload)`。
- Produces: 快速录单提交的 `configuration.productItems` 数组，格式匹配后端 `computeCostTotalFromConfig` 期望的 `colors[].sizes[].quantity` 嵌套结构（见 Global Constraints）。

- [ ] **Step 1: 加 import**

在 `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:30-37` 的 `@/lib/api` 具名导入列表中加入 `offlineOrderProductApi` 和 `OfflineOrderProduct`（其余已导入的名字保持不变，只追加这两个）：

```ts
import {
  // ...现有导入项...
  offlineOrderProductApi,
  OfflineOrderProduct,
} from '@/lib/api';
```

**说明**：`offlineOrderProductApi.getOrderConfig()` 返回 `{ data: OfflineOrderConfig }`，其中 `OfflineOrderConfig.products: OfflineOrderProduct[]`（`apps/web/src/lib/api.ts:1312-1321`，字段 `id/name/imageUrl/isCustomerOwned`，**不包含** `unitCost`——后端 `getOrderConfig` 出于同样原因不对外暴露成本数值，见 `backend/src/controllers/offlineOrderController.js:2999-3003`）。不要用同文件里的 `SimpleOfflineOrderProduct` 类型，那是另一个接口（`GET /api/offline-orders/products`）的返回类型，字段虽相似但类型名对不上会导致 TS 报错。

- [ ] **Step 2: 加本地类型 + 产品目录 state + 拉取逻辑**

在 `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:879` 附近，`newDraft` state 定义之前加：

```ts
  // [2026-07-31] 快速录单产品明细行的本地类型：故意不用 lib/api.ts 的 OfflineOrderProductItem
  // （那个类型是 variants[] 扁平结构，与 computeCostTotalFromConfig 实际解析的 colors[].sizes[] 嵌套结构不匹配）
  type QuickEntryProductLine = {
    productId: string;
    productName: string;
    quantity: number;
  };

  const [productCatalog, setProductCatalog] = useState<OfflineOrderProduct[]>([]);
  const [quickEntryLines, setQuickEntryLines] = useState<QuickEntryProductLine[]>([]);
  const [quickEntryPickerProductId, setQuickEntryPickerProductId] = useState('');
  const [quickEntryPickerQty, setQuickEntryPickerQty] = useState('');

  useEffect(() => {
    offlineOrderProductApi
      .getOrderConfig()
      .then((res) => setProductCatalog(res.data.products || []))
      .catch((err) => console.error('[OrdersSpreadsheet] load product catalog failed', err));
  }, []);

  const quickEntryTotalQuantity = quickEntryLines.reduce((sum, l) => sum + l.quantity, 0);

  const addQuickEntryLine = useCallback(() => {
    const qty = Number(quickEntryPickerQty);
    if (!quickEntryPickerProductId || !qty || qty <= 0) return;
    const product = productCatalog.find((p) => p.id === quickEntryPickerProductId);
    if (!product) return;
    setQuickEntryLines((prev) => [...prev, { productId: product.id, productName: product.name, quantity: qty }]);
    setQuickEntryPickerProductId('');
    setQuickEntryPickerQty('');
  }, [quickEntryPickerProductId, quickEntryPickerQty, productCatalog]);

  const removeQuickEntryLine = useCallback((index: number) => {
    setQuickEntryLines((prev) => prev.filter((_, i) => i !== index));
  }, []);
```

- [ ] **Step 3: handleCreateInline 组装 configuration.productItems**

在 `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1050-1064` 的 `createPayload` 构建中，把 `quantity: newDraft.quantity ? Number(newDraft.quantity) : null,` 这一行替换为使用 `quickEntryTotalQuantity`，并新增 `configuration` 字段：

```ts
      const productItems = quickEntryLines.map((line, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        productId: line.productId,
        productName: line.productName,
        isCustomerOwned: false,
        colors: [
          {
            groupId: `${Date.now()}-${idx}-color-${Math.random().toString(36).substr(2, 5)}`,
            colorId: 'default',
            colorName: '',
            availableSizes: [],
            sizes: [
              {
                size: 'NA',
                quantity: line.quantity,
                unitPrice: 0,
                additionalFee: 0,
                subtotal: 0,
              },
            ],
            totalQuantity: line.quantity,
            totalPrice: 0,
          },
        ],
        totalQuantity: line.quantity,
        totalPrice: 0,
      }));

      const createPayload = {
        contactName: newDraft.contactName.trim() || null,
        company: newDraft.company.trim() || null,
        type: newDraft.type || null,
        orderCategory: newDraft.orderCategory,
        status: newDraft.status || '待确认订单',
        invoiceStatus: newDraft.invoiceStatus,
        quantity: quickEntryTotalQuantity > 0 ? quickEntryTotalQuantity : (newDraft.quantity ? Number(newDraft.quantity) : null),
        totalAmount: newDraft.totalAmount ? Number(newDraft.totalAmount) : null,
        depositAmount: newDraft.depositAmount ? Number(newDraft.depositAmount) : null,
        description: newDraft.description.trim() || null,
        dueDate: newDraft.dueDate || undefined,
        startDate: newDraft.startDate || undefined,
        ...(productItems.length > 0 ? { configuration: { productItems } } : {}),
      };
```

**说明**：`quantity` 保留对旧行为的兼容——如果这次没加任何产品明细（`quickEntryLines` 为空），退回到原来手填 `newDraft.quantity` 的行为，不强制所有订单都要选产品，避免破坏现有不需要成本追踪的快速录单场景。

在 `handleCreateInline` 成功创建后重置状态的 `setNewDraft({...})` 调用之后（`apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1081` 附近）加一行：

```ts
      setQuickEntryLines([]);
```

- [ ] **Step 4: 替换"件数"单元格 UI**

把 `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1367-1378` 的整个"件数"`<td>`替换为：

```tsx
              {/* 件数：改为产品明细驱动，自动汇总，不再直接手填 */}
              <td className="px-2 py-1 text-right sticky left-[33rem] z-[1] bg-yellow-50 min-w-[140px]">
                <div className="flex flex-col gap-1">
                  <div className="text-right text-sm font-medium">{quickEntryTotalQuantity || (newDraft.quantity || 0)}</div>
                  {quickEntryLines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-1 text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      <span className="truncate">{line.productName} ×{line.quantity}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => removeQuickEntryLine(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <select
                      className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1 py-0.5"
                      value={quickEntryPickerProductId}
                      onChange={(e) => setQuickEntryPickerProductId(e.target.value)}
                    >
                      <option value="">+ 产品</option>
                      {productCatalog.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5"
                      placeholder="数量"
                      value={quickEntryPickerQty}
                      onChange={(e) => setQuickEntryPickerQty(e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={addQuickEntryLine}
                    >
                      加
                    </button>
                  </div>
                </div>
              </td>
```

- [ ] **Step 5: 手动验证**

```bash
cd apps/web && npm run dev
```

在浏览器打开 Orders 页面（Sales → Orders → 订单列表 Tab），在黄色高亮的新增行"件数"列：
1. 从下拉选一个产品、填数量、点"加"——应看到一个 chip 显示"产品名 ×数量"，上方的汇总数字同步更新。
2. 再加一个不同产品——应能同时存在两个 chip，汇总数字为两者之和。
3. 填客户名与订单类型后点保存（表格最右侧"保存"按钮）——刷新后新订单应正常出现在列表里。

用 curl 确认新建订单确实带有非零成本(假设选的产品在目录里 `unit_cost > 0`)：

```bash
curl -s "http://localhost:3001/api/admin/offline-orders?search=<刚填的客户名>&limit=1" -H "Authorization: Bearer $TOKEN" \
  | jq '.orders[0].configuration.pricing.costTotal'
```

Expected: 输出一个非零数字（等于所选产品 `unit_cost × quantity` 之和）。

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx
git commit -m "feat(offline-orders): add product+quantity picker to quick-entry row for cost tracking"
```

---

### Task 6: DTF/已排除订单视觉标记 + excludeFromReports 开关

**Files:**
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx`（订单行渲染处，紧邻已有的 `orderCategory` 下拉单元格）

**Interfaces:**
- Consumes: Task 2 产出的 `order.excludeFromReports`；已有的 `order.orderCategory`；已有的 `patchOrder(id, patch)` 函数（`OrdersSpreadsheet.tsx:979-1013`）。

- [ ] **Step 1: 定位 orderCategory 单元格并加视觉标记 + 排除开关**

已保存订单每一行的 `orderCategory` 下拉渲染在 `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx:1690-1700`（`orders.map(...)` 循环内，特征代码是 `value={order.orderCategory ?? ''}` 和 `patchOrder(order.id, { orderCategory: e.target.value || null })`，与 Task 5 Step 4 修改的"新增行"是两处不同的 JSX，不要改错地方）。在这个 `<td>` 结束标签之后追加一个新的 `<td>`：

```tsx
              {/* [2026-07-31] 从报表排除开关 + DTF 类目视觉标记 */}
              <td className="px-2 py-1 text-center">
                <div className="flex items-center justify-center gap-1">
                  {order.orderCategory === 'DTF打印film' && (
                    <span
                      className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded"
                      title="DTF打印film订单：不计入 sales dashboard 统计"
                    >
                      DTF
                    </span>
                  )}
                  <label
                    className="flex items-center gap-1 text-[10px] cursor-pointer"
                    title="开启后该订单不计入 sales dashboard 统计"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(order.excludeFromReports)}
                      onChange={(e) => patchOrder(order.id, { excludeFromReports: e.target.checked })}
                    />
                    排除
                  </label>
                  {order.excludeFromReports && (
                    <span className="text-[10px] px-1 py-0.5 bg-gray-200 text-gray-600 rounded">已排除</span>
                  )}
                </div>
              </td>
```

同时在表头 `<thead>` 里，紧邻"订单类型"表头列（渲染 `orderCategory` 那一列的表头）之后加一列表头：

```tsx
              <th className="px-2 py-2 text-center">报表</th>
```

- [ ] **Step 2: 手动验证**

浏览器里打开 Orders 列表：
1. 找一条 `orderCategory` 为 "DTF打印film" 的订单，确认该行"报表"列显示紫色 `DTF` 徽标。
2. 勾选任意一条订单的"排除"checkbox，确认出现灰色"已排除"徽标，且不用手动刷新页面（`patchOrder` 内部会调用 `refreshOrders()`）。
3. 取消勾选，确认"已排除"徽标消失。

用 curl 交叉验证该订单确实被后端持久化：

```bash
curl -s "http://localhost:3001/api/admin/offline-orders?limit=1&search=<该订单客户名>" -H "Authorization: Bearer $TOKEN" | jq '.orders[0].excludeFromReports'
```

Expected: 与浏览器里勾选的状态一致（`true`/`false`）。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx
git commit -m "feat(offline-orders): add DTF badge and exclude-from-reports toggle to orders list"
```

---

### Task 7: 历史订单"成本缺失"筛选 + 批量回填

**Files:**
- Modify: `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx`（筛选区、批量操作、新增回填弹窗组件）

**Interfaces:**
- Consumes: Task 4 的 `GET /api/admin/offline-orders?costMissing=true`；Task 5 的 `QuickEntryProductLine`/产品目录拉取逻辑（复用同样的 `productCatalog` state 与选品交互）；已有的 `offlineOrdersInlineApi.patch(id, patch)`。

- [ ] **Step 1: 加"成本缺失"筛选开关**

在筛选区（`filterStatuses` 等筛选 state 定义附近，约 `OrdersSpreadsheet.tsx:880-906` 一带的 state 声明区）加一个新 state：

```ts
  const [filterCostMissing, setFilterCostMissing] = useState(false);
```

在拉取订单的 `useEffect`（`OrdersSpreadsheet.tsx:935-968`）里，`params.set('limit', ...)` 之后加：

```ts
        if (filterCostMissing) params.set('costMissing', 'true');
```

并把该 `useEffect` 的依赖数组和"筛选条件变化重置到第 1 页"的 `useEffect`（`OrdersSpreadsheet.tsx:930-932`）依赖数组都加入 `filterCostMissing`。

在筛选区 UI（渲染 `filterStatuses` 下拉按钮的旁边）加一个 checkbox：

```tsx
          <label className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={filterCostMissing}
              onChange={(e) => setFilterCostMissing(e.target.checked)}
            />
            成本缺失
          </label>
```

- [ ] **Step 2: 加批量选择 state 与表头/行 checkbox**

加选择集合 state：

```ts
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const toggleOrderSelected = useCallback((id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
```

在表头最前面（订单号列之前）加一列全选 checkbox：

```tsx
              <th className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
                    } else {
                      setSelectedOrderIds(new Set());
                    }
                  }}
                />
              </th>
```

在每条已保存订单的行渲染最前面（即 `orders.map(...)` 循环生成的 `<tr>` 内第一个 `<td>`，紧邻 Task 6 Step 1 定位到的同一行）加对应的行 checkbox：

```tsx
              <td className="px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.has(order.id)}
                  onChange={() => toggleOrderSelected(order.id)}
                />
              </td>
```

- [ ] **Step 3: 加批量补充成本按钮与弹窗组件**

在筛选区旁边加一个按钮（仅当有选中项时可点）：

```tsx
          <button
            type="button"
            disabled={selectedOrderIds.size === 0}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={() => setBackfillModalOpen(true)}
          >
            批量补充成本（已选 {selectedOrderIds.size}）
          </button>
```

加对应 state：

```ts
  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<Record<string, 'pending' | 'saving' | 'done' | 'error'>>({});
  const [backfillLines, setBackfillLines] = useState<Record<string, QuickEntryProductLine[]>>({});
```

加弹窗内的每单产品选择 + 提交逻辑（`useCallback`，放在 `patchOrder` 定义之后）：

```ts
  const addBackfillLine = useCallback((orderId: string, productId: string, qty: number) => {
    const product = productCatalog.find((p) => p.id === productId);
    if (!product || !qty || qty <= 0) return;
    setBackfillLines((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { productId: product.id, productName: product.name, quantity: qty }],
    }));
  }, [productCatalog]);

  const removeBackfillLine = useCallback((orderId: string, index: number) => {
    setBackfillLines((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter((_, i) => i !== index),
    }));
  }, []);

  const submitBackfill = useCallback(async () => {
    const ids = Array.from(selectedOrderIds);
    for (const id of ids) {
      const lines = backfillLines[id] || [];
      if (lines.length === 0) continue;
      setBackfillProgress((prev) => ({ ...prev, [id]: 'saving' }));
      const productItems = lines.map((line, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        productId: line.productId,
        productName: line.productName,
        isCustomerOwned: false,
        colors: [
          {
            groupId: `${Date.now()}-${idx}-color-${Math.random().toString(36).substr(2, 5)}`,
            colorId: 'default',
            colorName: '',
            availableSizes: [],
            sizes: [{ size: 'NA', quantity: line.quantity, unitPrice: 0, additionalFee: 0, subtotal: 0 }],
            totalQuantity: line.quantity,
            totalPrice: 0,
          },
        ],
        totalQuantity: line.quantity,
        totalPrice: 0,
      }));
      try {
        await offlineOrdersInlineApi.patch(id, { configuration: { productItems } });
        setBackfillProgress((prev) => ({ ...prev, [id]: 'done' }));
      } catch (err) {
        console.error('[submitBackfill] failed for order', id, err);
        setBackfillProgress((prev) => ({ ...prev, [id]: 'error' }));
      }
    }
    await refreshOrders();
  }, [selectedOrderIds, backfillLines, refreshOrders]);
```

弹窗 JSX（复用 `createPortal` ——文件已在 `OrdersSpreadsheet.tsx:27` 导入 `createPortal`，放在组件 `return` 语句的现有弹窗渲染逻辑旁边）：

```tsx
      {backfillModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-3">批量补充成本（{selectedOrderIds.size} 条订单）</h3>
            {Array.from(selectedOrderIds).map((id) => {
              const order = orders.find((o) => o.id === id);
              if (!order) return null;
              const lines = backfillLines[id] || [];
              const status = backfillProgress[id];
              return (
                <div key={id} className="border border-gray-200 rounded p-2 mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{order.orderCode} — {order.contact.name || order.contact.company}</span>
                    <span>
                      {status === 'saving' && '保存中…'}
                      {status === 'done' && <span className="text-green-600">✓ 已完成</span>}
                      {status === 'error' && <span className="text-red-600">✗ 失败，可重试</span>}
                    </span>
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded px-1.5 py-0.5 mb-1">
                      <span>{line.productName} ×{line.quantity}</span>
                      <button type="button" onClick={() => removeBackfillLine(id, idx)}>✕</button>
                    </div>
                  ))}
                  <BackfillLinePicker productCatalog={productCatalog} onAdd={(pid, qty) => addBackfillLine(id, pid, qty)} />
                </div>
              );
            })}
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" className="text-xs px-3 py-1.5 border rounded" onClick={() => setBackfillModalOpen(false)}>关闭</button>
              <button type="button" className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded" onClick={submitBackfill}>提交回填</button>
            </div>
          </div>
        </div>,
        document.body
      )}
```

加一个小的行内选品子组件（放在 `OrdersSpreadsheet.tsx` 文件末尾，`export default function OrdersSpreadsheet` 之后，作为同文件内的辅助组件）：

```tsx
function BackfillLinePicker({
  productCatalog,
  onAdd,
}: {
  productCatalog: OfflineOrderProduct[];
  onAdd: (productId: string, qty: number) => void;
}) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  return (
    <div className="flex items-center gap-1">
      <select className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5" value={productId} onChange={(e) => setProductId(e.target.value)}>
        <option value="">+ 产品</option>
        {productCatalog.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="number" min="1" step="1" className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5" placeholder="数量" value={qty} onChange={(e) => setQty(e.target.value)} />
      <button
        type="button"
        className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
        onClick={() => {
          const q = Number(qty);
          if (!productId || !q || q <= 0) return;
          onAdd(productId, q);
          setProductId('');
          setQty('');
        }}
      >
        加
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 手动验证**

浏览器操作：
1. 勾选"成本缺失"筛选，确认列表只显示 `costTotal` 为空/0 的订单。
2. 勾选 2~3 条订单，点击"批量补充成本"，为每条订单选一个产品+数量。
3. 点击"提交回填"，确认弹窗里每行依次显示"保存中…"→"✓ 已完成"。
4. 关闭弹窗，取消勾选"成本缺失"筛选，用 curl 确认这几条订单的 `costTotal` 已非零（同 Task 5 Step 5 的验证方式）。
5. 重新勾选"成本缺失"筛选，确认这几条订单已不再出现在列表里。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx
git commit -m "feat(offline-orders): add cost-missing filter and bulk cost backfill modal"
```

---

## 收尾检查（对照 spec 的验收标准）

完成全部 7 个任务后，逐条对照 `docs/superpowers/specs/20260731-offline-order-cost-fields-design.md` 的"验收标准"章节手动过一遍，特别是：

- 三个录单入口（桌面表单、移动端表单、Spreadsheet 快速录单）对同样的产品+数量，`costTotal` 计算结果是否一致。
- Dashboard 的营收/订单数/成本/毛利/best sellers 等**所有**卡片和图表，都要确认已取消/DTF/已排除订单不再计入——不要只抽查营收一个数字，Task 3 的改动是在 `buildRawWhereConditions` 这个共享函数里，理论上所有调用点都会生效，但仍建议逐个卡片肉眼核对一遍，防止有遗漏的聚合查询绕过了这个函数直接写死了 where 条件。
