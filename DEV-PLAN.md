# 开发计划 — 打印页面优化（Offline Order Print Page）

> 目标页面：`/offline-orders/sales/orders/[id]?print=true`
> 本计划针对本次会话中用户提出的 4 项打印页面优化需求，未读取额外 PRD 文档（本次为在既有代码库上的增量功能开发，非新项目初始化，产品文档以对话中用户描述 + 已澄清的决策为准）。

## 需求来源与已澄清决策

用户原始 4 项需求：
1. Product List / 产品明细模块的 position 部分，增加显示客户要印刷的图片；运营上传图片时需选择该图片对应的印刷位置；鼠标悬停显示该图片在 T 恤上的示意图。
2. 衣服尺码按 S/M/L/XL 一组、2XL/3XL 单独一列、小孩尺码单独一列，均从小到大排序。
3. 去掉 Billing Detail / 计费明细。
4. Pricing / 价格模块：在 Total 上面加 Deposit/定金，Total 下面加 Balance/余额。

经调研 + `AskUserQuestion` 逐项确认，锁定以下范围：
- 悬停示意图 = **预设的位置示意图**（每个印刷位置一张固定线稿，与图片具体设计内容无关），采用用户提供的示例风格（黑白线稿 + FRONT/BACK 标签）。
- 上传入口 = **复用现有位置编辑弹窗 `PositionEditorModal`**（第 323-325 行 `fileUploadComingSoon` 占位符处，替换为真实上传控件）。
- 上传需**同时支持创建订单流程和编辑已有订单流程**（订单创建前没有 ID，图片需本地暂存预览，随整单提交一起上传，后端建单/更新时把每张图关联回对应位置）。
- 尺码分组改动**仅影响打印页面**渲染，不改创建/编辑订单时的数量填写表单。
- 去掉 Billing Detail **仅影响打印输出**，订单详情页正常浏览（非打印）时保留 `BillingDetails` 组件。

## 功能模块拆解（按开发顺序）

### 模块 A：位置设计图上传 + 打印页展示 + 悬停示意图（本次工作量最大，见下方架构评估）

**后端**
- `backend/src/controllers/offlineOrderController.js`
  - `createOfflineOrder`：解析新增表单字段 `assetPositionMap`（JSON 字符串，形如 `[{fileIndex, productItemId, colorGroupId, positionKey}]`），在 `processAssetUpload` 批量上传完成、拿到每个 asset 的 `id` 后，回写进 `configuration.colorGroupsByProduct[...].positions[]` 对应项的 `designAssetId` 字段，再保存订单。
  - `updateOfflineOrder`：同样逻辑，处理追加上传的位置图片。
  - 不新增 Prisma 表/字段——复用现成的 `OfflineOrderAsset`（`assets` 数组）+ JSON 里已有的 `designAssetId` 字符串字段做关联，避免不必要的 schema 变更。

**前端（web + 对应的 mobile 镜像目录）**
- `apps/web/src/types/order.ts`：新增统一常量 `POSITION_KEYS` / `POSITION_LABELS` / `POSITION_DIAGRAM_MAP`（当前这些散落在各组件里重复维护，顺手统一，减少后续维护成本）；`PositionConfig` 增加一个**仅前端本地态**字段（如 `_pendingDesignFile?: File`）用于暂存未上传的文件，不落库。
- `apps/web/src/app/offline-orders/components/PositionEditorModal.tsx`：替换 `fileUploadComingSoon` 占位符为真实的文件选择 + 本地预览（`URL.createObjectURL`）；已有 `designAssetId` 时显示已上传缩略图 + 可替换/删除。
- `apps/web/src/app/offline-orders/components/PrintPositionsPanel.tsx` / `PositionList.tsx` / `PositionCell.tsx`：卡片上渲染缩略图（原来只显示"已上传文件"文字）。
- `apps/web/src/app/mobile/offline-orders/create/components/` 下同名四个文件：同步镜像改动。
- `apps/web/src/app/offline-orders/page.tsx`（+ mobile 对应页面）：提交订单（创建/更新）时，把各位置暂存的 `_pendingDesignFile` 一并塞进 multipart `assets` 字段，附带 `assetPositionMap` 字段描述文件与位置的对应关系。
- `apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx`（打印页）：
  - Product List 的 position 表格（紧凑版 664-875 行、完整版 1379-1470 行附近）新增图片缩略图列，根据 `designAssetId` 从 `order.assets` 里查出 `url` 渲染 `<img>`。
  - 缩略图旁加悬停触发的示意图 tooltip（纯 CSS `:hover` + 绝对定位，不引入新依赖），按 `positionKey` 显示对应静态 SVG。
- 新增静态资源 `apps/web/public/assets/position-diagrams/*.svg`：11 个位置各一张（`front_left_chest / front_middle / front / back_middle / back / left_sleeve / right_sleeve / pocket / tag_inside / tag_outside`），沿用用户提供的示例风格；`custom` 无固定示意图，悬停不显示或显示通用占位提示。

### 模块 B：打印页尺码分组排序（仅打印页）
- `[id]/page.tsx`：新增排序/分组工具函数——按尺码字符串归类到「S/M/L/XL」「2XL/3XL 及以上」「Youth/小孩」三组，组内从小到大排序；应用到紧凑版尺码表（约 814-834 行）和 `compactBillingLines`/`billingData` 构造中涉及尺码遍历的地方。
- 分类依据：优先用订单/全局 `sizeFees`（`size_type` 字段）做 Youth 判定；若打印页当前拿不到该字典，退化为按尺码字符串前缀做规则匹配（开发时用真实订单数据核实）。

### 模块 C：打印页去掉 Billing Detail（小改）
- `[id]/page.tsx`：删除 `renderCompactInvoice()` 中 Billing Details 区块（约 910-939 行）及其数据依赖（若 `compactBillingLines` 不再被其他地方使用则一并清理）。

### 模块 D：打印页 Pricing 加 Deposit / Balance（小改）
- `[id]/page.tsx`：在紧凑版价格盒（约 877-908 行）里，仿照完整版已有逻辑（约 1680-1721 行），在 Total 上方加 Deposit 行（`order.payment.depositAmount > 0` 时显示），Total 下方加 Balance 行（`total - depositAmount`，不持久化，纯前端计算，与完整版口径一致）。

## 数据库 schema 设计

**无 Prisma schema 变更。** 全部改动基于既有的 `OfflineOrder.configuration`（JSON）+ 既有 `OfflineOrderAsset` 表 + 既有 `deposit_amount` 字段，通过后端逻辑把上传后的 asset id 写入 JSON 里的 `designAssetId`，前端渲染时按 id 在 `order.assets` 数组里查找对应 `url`。

## 页面 / API 路由清单

- 无新增页面路由。
- 无新增独立 API 路由（复用 `createOfflineOrder` / `updateOfflineOrder` 现有接口，仅扩展其表单解析逻辑）。

## 大改评估（按项目规则，触发 >5 文件 + 新功能模块）

1. **架构**：位置图片的关联关系刻意不引入新表/新外键，而是复用"JSON 存 designAssetId 字符串 + assets 数组按 id 查找"的既有模式，边界清晰，不产生新的单点故障；创建流程"本地暂存 → 整单提交时随 assets 一起上传"与现有订单级附件上传机制完全一致，不新增上传管线。
2. **质量**：`POSITION_KEYS`/`POSITION_LABELS` 目前在 4+ 个组件里重复硬编码（web + mobile 各一份），本次顺带抽成共享常量，减少 DRY 违反；示意图 SVG 与位置 key 做成一个映射表统一维护。
3. **性能**：位置图片走已有的 GCS/本地回退上传逻辑，数量级为个位数张/订单，无 N+1 查询风险；打印页渲染是按已加载的 `order.assets` 数组做内存查找（O(n) 且 n 很小），不产生新增接口调用。

## 风险点

- **创建流程的文件-位置映射**是本次实现细节最容易出错的地方（依赖 `assetPositionMap` 与实际上传顺序对应），需要重点测试：新建订单、多个颜色组、多个位置各传一张图，提交后打印页图片是否对得上号。
- 尺码分组的 Youth/Adult 判定依据，需要用真实订单数据核实当前 `quantities` 里的 key 到底是"S/M/L/XL/2XL/3XL"这类还是还有别的写法（如"Youth-S"前缀），避免分组逻辑写死后对不上实际数据。
- mobile 端有一套镜像组件，需要同步改，否则移动端创建订单会缺失新功能（且两套代码本身是否严格同步过，之前未确认，实现时需要对比）。

---

📋 开发计划已生成（DEV-PLAN.md），请确认以下信息后我再开始开发：

1. 功能范围是否如上无误？（尤其模块 A 的"创建订单时暂存文件、提交后端一起处理"这套方案）
2. 本次改动无需部署（不涉及 GCP Cloud Run / DB 迁移），如后续需要部署请单独告知。

回复"确认，开始开发"后我才会继续。
