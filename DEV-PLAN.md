# DEV-PLAN — 线下订单创建流程与订单管理列表改造

> 生成日期：2026-04-20

## 0. 读取的产品文档

本次需求未使用独立 PRD 文件，需求来源于对话和 3 张截图（订单列表 / Type 下拉 / Status 下拉）。已扫描根目录 `.md`，但本次只依赖对话需求，不合并其它历史文档。

## 1. 部署目标（已在对话中确认）

| 项 | 值 |
| --- | --- |
| GCP Project ID | `print-482914` |
| Region | `us-central1` |
| 后端 Cloud Run | `print-main-backend` |
| 前端 Cloud Run | `print-main-frontend` |
| 前端域名 | `https://printngoplus.com` |
| 数据库（生产） | Neon（连接串在 Secret Manager：`database-url:latest`） |
| 数据库（本地 dev） | Neon dev branch `ep-twilight-moon-ae3crdh8`（2026-04-20 复制自 main） |
| 图片桶 | `gs://print-482914-images` |

本地 `.env` 与 `backend/.env` 已切到新 dev 分支。本次变更**要部署**到 GCP。

## 2. 功能范围（来自对话）

一、创建线下订单页（`apps/web/src/app/offline-orders/page.tsx`）
1. 去掉第 3 步"文件上传"，代码注释保留（不删除）
2. 把原第 1 步（产品选择）与第 2 步（客人信息）**对调**，使客人信息先录入、产品选择在后
3. 步骤指示器从 3 步缩成 2 步

二、订单管理列表（替换 `/offline-orders/sales/orders`）
1. 宽屏表格布局，列顺序复刻截图一
2. 订单编号列收窄，只显示缩略，鼠标悬停显示完整
3. 每一行任意字段 inline 可编辑（失焦或回车保存）
4. 表格底部"+ 新增行"按钮，出空白行，所有列可 inline 输入（包括产品/数量简化录入），保存即入库
5. Type 下拉：`DTF / EMB / Screen Printing / DTF + EMB`
6. Status 下拉：采用截图三预置值 + 支持用户自定义添加新选项（添加后持久化，下次可继续选）
7. Invoice 下拉：`No / Require / Sent`，默认 `No`
8. Notes 自由文本
9. 截图里的 checkbox 列**本次不做**（那是 Excel 的"是否入系统"标记）
10. 原有的 3 步创建流程保留（现改为 2 步），从详情页可以继续编辑产品明细等信息

**本轮补充**（2026-04-20 新加）：

11. **新增"缩略图"列**：
    - 位置：放在"客户名"之后、"交货日期"之前（或靠近订单编号，具体实现时看视觉平衡）
    - 数据源：该订单 `assets` 关系里**第一个 content-type 以 image/ 开头的 asset** 的 `url`
    - 无图时：显示一个占位灰框（比如 48×48 圆角，里面一个图标 Icon）
    - 点击缩略图 / 占位框 → 打开多图浮层（同下面 12 里"下载"浮层一致）

12. **新增"文件"action 列**（上传 + 下载合并到一个按钮组）：
    - **上传按钮**（📎 icon）：任何有 `SALES / SALES_MANAGER / ADMIN` 角色的用户点击 → 打开文件选择器（支持多选）→ 上传到 `POST /api/admin/offline-orders/:id/assets`（已有接口）→ 上传成功后：
      - 如果是 image，缩略图列实时刷新
      - 如果是 DTF / AI / EPS / PSD / PDF 等非图片文件，仍存入同一张 `OfflineOrderAsset` 表（`contentType` 区分），缩略图不变但文件列表里能看到
    - **下载按钮**（⬇ icon）：点击 → 弹出 popover / 小浮层，列出该订单所有 assets：
      - 图片类：显示小缩略图 + 文件名 + "下载"链接
      - 非图片类（DTF/AI/EPS 等）：显示文件类型 icon + 文件名 + 大小 + "下载"链接
      - 每行都可点击下载，用 `<a href={asset.url} download={asset.fileName}>`
    - **上传也可以从这个浮层进**：浮层底部一个"+ 添加文件"按钮（和最外层的上传按钮等价，方便在浮层里直接补文件）
    - **权限**：上传/下载权限沿用现有后端路由的 `authorizeRoles(...ORDER_MANAGEMENT_ROLES)` 设定，前端按相同逻辑显示/隐藏按钮

13. **行背景色规则**（优先级从高到低，命中即停止）：
    | 条件 | 背景色 | Tailwind 建议 |
    | --- | --- | --- |
    | `status == '已完成'` | 灰色 | `bg-gray-200 text-gray-500` |
    | `rushOrder == true` | 粉色 | `bg-pink-100` |
    | `status == '待确认订单'` | 绿色 | `bg-green-100` |
    | 其他 | 默认 | `bg-white`（hover 时 `bg-gray-50`） |

14. **排序规则**：
    - 默认排序：`status == '已完成'` 的订单排到最后；其余订单按 `dueDate ASC`（交货日期近的在前）
    - 用户点击表头仍可切换排序字段（但"已完成沉底"保持不变 —— 即已完成组永远在下，组内按用户选的字段排序）

三、本次**不做**
- Admin kanban（`/admin/offline-orders`）保持原样
- checkbox 列
- 历史数据归档、status 字段的实时审计日志（除迁移映射外）

## 3. 数据库 Schema 变更

对 `OfflineOrder` 表：

| 字段 | 变更 | 说明 |
| --- | --- | --- |
| `status` | **enum → String** | 老 `OfflineOrderStatus` enum 弃用。String 无长度上限（或 varchar(64)），允许用户自定义值 |
| `type` | **新增** String? | 订单级印花类型标签；默认由产品 positions.method 自动汇总；inline 新增时用户手选 |
| `invoiceStatus` | **新增** String NOT NULL DEFAULT 'No' | 发票状态，值限定于 `No / Require / Sent`（在应用层校验，不用 Prisma enum 以便未来扩展） |
| `totalAmount` | **新增** Decimal(12,2)? | 订单总金额。inline 新增时用户手打；2 步创建流程里由产品明细计算后回填 |

新增表 `OfflineOrderStatusOption`：

```
id          String   @id @default(cuid())
value       String   @unique        // 例如 "待确认订单"（字符串即内部值）
label       String                    // UI 显示文案（默认等同 value）
sortOrder   Int      @default(0)
isSystem    Boolean  @default(false) // 系统预置不可删除
createdBy   String?                   // 用户添加时记录
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### 3.1 老 status 值迁移映射（**请重点确认**）

老 enum 只有 5 个值，我建议映射如下：

| 老值 | 新值 | 理由 |
| --- | --- | --- |
| `ACTIVE` | `待确认订单` | 表示订单在处理但尚未完成 |
| `PRINTED` | `待取货` | 已印完待客户取货 |
| `COMPLETED` | `已完成` | 完全完成 |
| `CANCELLED` | `已取消` | 需要新增此选项（截图三没有但保留语义） |
| `REMINDER` | `需通知` | 对应"提醒"语义 |

**如果映射不对请告诉我改哪个。**

### 3.2 status 预置选项（种子数据）

合并截图一 + 截图三里出现的全部中文状态值，统一预置：

| value | isSystem | 来源 |
| --- | --- | --- |
| 待付定金 | true | 截图三 |
| 待确认订单 | true | 截图三 |
| 需弄设计图 | true | 截图一 |
| 待确认设计 | true | 截图三 |
| 已确认设计 | true | 截图三 |
| 设计样品中 | true | 截图三 |
| 待确认logo | true | 截图三 |
| 已确认logo | true | 截图三 |
| 待出图/出货 | true | 截图三 |
| 等出图 | true | 截图一 |
| 等客人发图 | true | 截图一 |
| 等客人确认 | true | 截图一 |
| 等edwin | true | 截图一（内部流转人） |
| 需订货 | true | 截图三 |
| 已订货 | true | 截图三 |
| 需通知 | true | 截图三 |
| 已通知取货 | true | 截图一 |
| 待取货 | true | 截图三 |
| 已完成 | true | 截图三 |
| 已取消 | true | 迁移所需 |

排序按上表顺序（从订单生命周期早到晚）。

### 3.3 Type 自动汇总规则

从 `configuration.productItems[].colorGroupsByProduct[].positions[].method` 收集所有 method 去重，映射：

| position.method 集合 | Type 值 |
| --- | --- |
| `{DTF}` 或含 DTF 且无其它 | `DTF` |
| `{Embroidery}` 或含 EMB 且无其它 | `EMB` |
| `{Screen Print}` 或含丝网印且无其它 | `Screen Printing` |
| `{DTF, Embroidery}`（任何混合） | `DTF + EMB` |
| 含 UV / Vinyl 等其它 method | **留空**（不自动覆盖），用户 inline 手选 |

inline 新增订单时没有产品明细，用户手选 Type；后续进入 2 步创建流程补产品明细时，如果产品 methods 能明确汇总，前端给出建议值但不强制覆盖用户的手选。

### 3.4 余款/已付金额列逻辑

- 底层字段：`deposit_amount`（已存在）+ `totalAmount`（新增）
- 列显示逻辑：若 `deposit_amount == totalAmount` → 显示 `paid in full`；否则显示 `$deposit_amount` 数字
- inline 录入：用户直接填这一列的数字，后端收到后写入 `deposit_amount`

## 4. 页面与 API 路由清单

### 前端
| 路由 | 变更 |
| --- | --- |
| `/offline-orders` | 创建流程：交换 step1/step2，注释 step3，步骤指示器 2 步 |
| `/offline-orders/sales/orders` | **整体替换**为宽屏 spreadsheet 列表 |
| `/offline-orders/[id]` | 详情页保持现状（inline 创建的精简订单可从此入口编辑产品明细） |
| `/admin/offline-orders` | 本次不动 |

### 后端 API
| 路由 | 方法 | 变更 |
| --- | --- | --- |
| `/api/admin/offline-orders` | GET | 列表接口 — 返回时 include `assets` 关系（至少 url / contentType / fileName / fileSize），用于缩略图和下载浮层 |
| `/api/admin/offline-orders` | POST | **新增**（如未存在）/ 或扩展已有 — 支持 inline 精简创建（允许缺省 productItems） |
| `/api/admin/offline-orders/:id` | PATCH | 扩展 — 支持新字段（type/status/invoiceStatus/totalAmount/deposit_amount/order_notes/quantity/dueDate/contactName）的单字段更新 |
| `/api/admin/offline-orders/:id/assets` | POST | **已有** — 本次直接复用（上传按钮调此接口） |
| `/api/admin/offline-orders/:id/assets/:assetId` | DELETE | **新增**（可选）— 允许从浮层删除误传的文件 |
| `/api/offline-orders/status-options` | GET | 新增 — 返回所有 status 选项 |
| `/api/offline-orders/status-options` | POST | 新增 — 用户添加自定义选项 |

## 5. 开发顺序

1. Prisma schema + migration（新增字段 + 新表 + status enum → String + 数据迁移 SQL）
2. 在本地 dev branch 跑 migration + seed status 选项
3. Backend：OfflineOrder controller 支持新字段；新增 status-options 路由；列表接口 include assets 关系
4. 前端创建页：step1/step2 对调，step3 注释
5. 前端 sales 列表：整体替换为宽屏 spreadsheet 表格（用 `@tanstack/react-table` 基建），支持 inline 编辑、inline 新增、行背景色规则、已完成沉底排序
6. 缩略图列 + 上传/下载 popover（复用现有 `:id/assets` 接口）
7. status 选项自定义入口（下拉底部"+ 添加新选项"弹框）
8. 本地验证：创建页 2 步流程、列表 inline 编辑/新增、自定义 status、type 汇总、缩略图、上传下载、行颜色、排序
9. 生成 DEV-REPORT.md

## 6. 风险点

1. **status 从 enum 迁成 String 的迁移成本**：Prisma 里 enum 字段变 String 会产生一个破坏性迁移（drop column + add column），必须用原生 SQL 迁移实现"保留数据 + 值转换"。我会写成 `migration.sql` 两步：先加 `status_new TEXT` 列 → UPDATE 映射 → 删旧列 → rename。
2. **前端 status 硬编码 51 处引用**：现有代码对 OfflineOrderStatus 的字符串常量引用需要全部扫描替换，遗漏会导致筛选/显示错乱。改完跑一次 `grep -rn 'OfflineOrderStatus\|statusActive\|statusPrinted\|...'` 收尾。
3. **inline 新增的精简订单会缺 `orderCode`**：现有 orderCode 生成逻辑是"创建者专属格式"，精简创建仍走这个生成器，不做特殊处理。
4. **Neon dev branch schema 是否已是最新**：复制自 main 分支的数据，schema 应与 main 一致。migration 跑下去会在 `_prisma_migrations` 表里追加新迁移。如果中间有 drift 会报错，到时候 `prisma migrate resolve` 处理。
5. **宽屏表格在窄屏下的体验**：决定使用横向滚动（而非响应式折叠），和 Google Sheets 一致。
6. **生产部署**：status 字段类型变更在生产跑迁移时会有瞬时锁表，订单表行数评估 < 10 万级应在秒级完成。部署前备份 Neon main 分支（`scripts/neon-backup.sh` 跑一次）。

## 7. 验证清单

- [ ] `npx prisma migrate status` 所有迁移已应用
- [ ] Seed 后 status 选项 ≥ 20 条
- [ ] 创建页显示 2 步，step3 在代码里被注释但代码保留
- [ ] 创建流程：先填客人信息 → 再选产品 → 提交成功
- [ ] 列表页显示所有新列，订单编号悬停 tooltip 正常
- [ ] inline 编辑：点任意格 → 改值 → 回车/失焦 → 数据持久化，刷新后仍在
- [ ] inline 新增：点 "+ 新增行" → 填最少字段（客户名 + 日期 + 总额）→ 保存成功
- [ ] status 下拉"+ 添加新选项"：输入新值保存后，下次打开选项里有它
- [ ] 老订单的 status 显示为新值（迁移成功）
- [ ] Type 自动汇总：创建一个含 DTF + EMB 产品的订单，显示 `DTF + EMB`
- [ ] Invoice 默认 No；切成 Require / Sent 持久化
- [ ] **缩略图**：给某订单上传 1 张图片后，列表对应行显示缩略图；无图订单显示占位图标
- [ ] **上传**：点 📎 → 选多文件（含 1 张 png + 1 个 DTF） → 上传成功后浮层里都能看到
- [ ] **下载**：点 ⬇ → 浮层列出全部文件 → 点任一文件能下载到本地
- [ ] **行颜色**：已完成订单灰色、rush 订单粉色、待确认订单绿色、其他白色，同时命中取最高优先级
- [ ] **排序**：已完成订单始终在列表最底；其余按 dueDate 正序；切换排序字段不影响"已完成沉底"

## 8. 变更文件清单（预计）

核心：
- `prisma/schema.prisma` — 新字段 + 新表 + status 改 String
- `prisma/migrations/<timestamp>_offline_orders_redesign/migration.sql` — 新迁移
- `prisma/seed.ts` 或单独 `prisma/seed-status-options.ts` — 种子数据
- `apps/web/src/app/offline-orders/page.tsx` — 交换 step，注释 step3
- `apps/web/src/app/offline-orders/sales/orders/page.tsx` — 整体替换
- `apps/web/src/app/offline-orders/sales/orders/components/SpreadsheetTable.tsx`（新）— 宽屏表格组件
- `apps/web/src/translations/offlineOrders.ts` — 新增状态/字段翻译
- `backend/src/controllers/offlineOrderController.js` — 新字段处理
- `backend/src/routes/offlineOrders.js` — PATCH 支持 inline 字段
- `backend/src/routes/statusOptions.js`（新）— status 选项 CRUD
- `backend/src/controllers/statusOptionController.js`（新）

扫描替换：
- 前端所有引用 `OfflineOrderStatus` 枚举名的 `.ts/.tsx`（约 15-20 个文件）

---

## 已确认事项（无需再讨论）

- status 老值映射（3.1）：OK
- Type 对 UV/Vinyl 留空：OK
- orderCode 沿用现有生成器：OK

## ⚠️ 还需你确认的 2 点（本轮新需求引出）

1. **行背景色优先级**（见 2 节第 13 条）：已完成 > rush > 待确认订单 > 默认。这个优先级 OK 吗？还是 rush 优先于"已完成"（即已完成的 rush 订单显示粉色）？
2. **缩略图取哪一张**：第一张 image 类型的 asset。如果后续要改（比如让用户指定"首图"），需要加一个 `is_primary` 字段。本次默认用第一张，**不加** `is_primary` 字段。OK 吗？

回复"确认，开始开发"或对以上 2 点的修正意见后我开始执行。
