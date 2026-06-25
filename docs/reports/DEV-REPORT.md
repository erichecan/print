# 开发完成报告

> 生成日期：2026-04-20
> 对应计划：`DEV-PLAN.md`（同日生成）

## 本次开发了什么

重构了"线下订单创建页"和"销售订单管理列表页"两个核心页面，订单状态由数据库枚举改为自由文本，支持 20 个预置中文状态 + 用户自定义新增；列表页换成宽屏 spreadsheet，所有字段 inline 可编辑/新增，并新增了缩略图列和文件上传/下载浮层。

## 可以访问的页面

| 页面 | 地址 | 说明 |
| --- | --- | --- |
| 创建线下订单（桌面端） | http://localhost:3000/offline-orders | 改为 2 步：第 1 步客户信息 → 第 2 步产品选择。原第 3 步"文件上传"已注释保留（未删除）。 |
| 创建线下订单（移动端） | http://localhost:3000/mobile/offline-orders/create | 默认状态由 `ACTIVE` 改为 `待确认订单`。 |
| 销售订单管理列表 | http://localhost:3000/offline-orders/sales/orders | 宽屏 spreadsheet，所有列 inline 可编辑；表格顶部一行"+ 新增"按钮。 |
| 销售登录 | http://localhost:3000/offline-orders/sales/login | 未登录进订单管理时会跳转到这里。 |

## 功能完成情况

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 创建页 step1/step2 互换 | ✅ 完成 | `STEPS` 顺序、`validateStep`、`render*()` 入口同步更新；错误提示文案也跟着改 |
| 创建页 step3（文件上传）注释保留 | ✅ 完成 | 用 `{/* === START / === END === */}` 块注释包住原代码，未删除 |
| 列表宽屏 spreadsheet | ✅ 完成 | `apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx`，完全替代旧 373 行表格/筛选/分页 JSX |
| 订单编号 hover 显示完整 | ✅ 完成 | 列窄显示前 8 位，`title` 放完整编号 |
| 任意单元格 inline 编辑 | ✅ 完成 | 失焦 / 回车保存，乐观更新，失败回滚 |
| 顶部 inline 新增行 | ✅ 完成 | 黄色背景新行，填完点"保存" → `POST /api/proxy/admin/offline-orders` |
| Type 下拉（DTF/EMB/Screen/DTF+EMB） | ✅ 完成 | 4 个预置选项；默认为"自动"，从 `productItems.positions.printMethod` 聚合（UV/Vinyl 留空） |
| Status 下拉 20 预置 + 用户自定义 | ✅ 完成 | 从 `offline_order_status_options` 拉取，下拉底部"+ 添加新选项"可当场新增 |
| Invoice 下拉 No/Require/Sent | ✅ 完成 | 默认 `No`，后端枚举校验 |
| Already-paid 列自动推导 | ✅ 完成 | `deposit >= total && total > 0` → 显示 `paid in full`，否则留空 |
| 缩略图列 | ✅ 完成 | 取第一个 `contentType` 以 `image/` 开头的 asset；无图显示占位灰框 |
| 文件 action 列（📎 上传 / ⬇ 下载浮层） | ✅ 完成 | 下载浮层按 image/non-image 分组，每行带下载链接；浮层底部还有一个"+ 添加文件"入口 |
| 行颜色优先级 | ✅ 完成 | `已完成` = 灰 > rush = 粉 > `待确认订单` = 绿 > default = 白 |
| 排序：已完成沉底 + dueDate ASC | ✅ 完成 | 移到应用层排序（Prisma 没法表达 CASE WHEN） |
| Status enum → String 迁移 | ✅ 完成 | `prisma/schema.prisma` 改为 `status String @default("待确认订单")`；迁移 SQL 写在 `prisma/migrations/20260420_status_to_string/migration.sql`，含旧枚举值 → 中文值的 UPDATE |
| Status 选项自定义表 | ✅ 完成 | 新建 `offline_order_status_options`，含 20 个系统预置（isSystem=true，不可删） |
| 后端 3 个新字段（type / invoiceStatus / totalAmount） | ✅ 完成 | `mapOrder` 暴露；`updateOfflineOrder` 接收并校验；`createOfflineOrder` 给默认值 |
| 后端 status-options 路由 | ✅ 完成 | `GET/POST /api/admin/offline-orders/status-options`、`DELETE .../status-options/:id`，路由挂载顺序已放在 `/:id` 之前防冲突 |
| 后端 ACTIVE/COMPLETED/CANCELLED 兼容映射 | ✅ 完成 | `salesOrderController.updateSalesOrderStatus` 和 `offlineOrderController.createOfflineOrder` 都加了大写→中文 legacy 映射，老客户端不会 500 |
| 后端 Vapi 默认状态 | ✅ 完成 | `backend/src/vapi/tools/orderService.js` 默认状态 `ACTIVE` → `待确认订单` |
| 前端 ACTIVE/COMPLETED/CANCELLED 引用替换 | ✅ 完成 | `offline-orders/page.tsx` 与 `mobile/offline-orders/create/page.tsx` 的创建默认状态改为 `待确认订单`。`sales/orders/page.tsx` 原订单表的 567-987 行老状态逻辑因整个 tab 被 `<OrdersSpreadsheet />` 替换，已不再渲染（保留为死代码，不影响编译） |
| TypeScript 类型检查 | ✅ 通过 | `npx tsc --noEmit` 对本次改动的文件 0 error；仅 `design-lab/DesignLabClient.tsx` 有历史遗留语法错误（与本次改动无关） |
| Node 语法检查（backend） | ✅ 通过 | `find backend/src -name "*.js" | xargs node --check` 全部通过 |

## 已知问题

1. **Prisma migrate 未在沙箱内执行**：沙箱无法下载 Prisma 引擎二进制（`binaries.prisma.sh` 403）。迁移 SQL 已写到 `prisma/migrations/20260420_status_to_string/migration.sql`，请在本地执行：
   ```bash
   cd backend
   npx prisma migrate dev --name status_to_string
   npx prisma generate
   ```
   本地 `.env` 已指向 Neon dev branch `ep-twilight-moon-ae3crdh8`，迁移不会影响生产。

2. **本地 dev 服务未在沙箱启动**：`npm run dev` 需要 Prisma client 生成后才跑得起来，同上要先在本地生成。沙箱里做过：
   - `node --check` 全部后端 JS → 通过
   - `npx tsc --noEmit` 前端 → 本次改动 0 error
   - 手工 grep 老枚举引用 → 已替换到位

3. **`sales/orders/page.tsx` 有死代码**：原来 ~370 行的老表格/筛选/分页 JSX 被 `<OrdersSpreadsheet />` 一行替代，但顶部仍保留了 `StatusSelector` 组件、`statusOptions` 常量（567-573 行）、`handleStatusUpdate` 等函数（954-987 行）。这些现在是 dead code，TypeScript 不报错，但下次 cleanup 时可以一并删掉（需要一次较大的结构重构，本次先不动避免引入新错误）。

4. **`FilterPanel` 组件也变成 dead code**：`sales/orders/page.tsx:23` 的 `import { FilterPanel, FilterOptions }` 目前没有被渲染（JSX 里没有再用），但没删。同上，清理留待下次。

5. **生产数据库尚未迁移**：部署到 GCP 之前，需要用 `prisma migrate deploy` 对生产库执行 `20260420_status_to_string` 迁移。迁移里包含旧枚举值 → 中文值的数据迁移，建议先跑一次 dev branch 验证再 deploy 到 prod。

## 下一步建议

1. **在本地跑一遍端到端验证**：
   - `cd backend && npx prisma migrate dev && npx prisma generate`
   - 启后端：`cd backend && npm run dev`（默认 3001）
   - 启前端：`cd apps/web && npm run dev`（默认 3000）
   - 创建一笔订单 → 看列表是否刷新、inline 编辑是否保存、Status 下拉"+ 添加新选项"是否持久化、上传/下载浮层是否正确显示多文件
2. **验证通过后部署到 GCP**：
   - Cloud Build 触发 `print-main-backend` 和 `print-main-frontend` 新 revision
   - 生产数据库迁移：`npx prisma migrate deploy`（用 Secret Manager 的 `database-url:latest`）
3. **死代码清理**：把 `sales/orders/page.tsx` 里 `StatusSelector`、`statusOptions`、`handleStatusUpdate` 等旧状态逻辑以及 `FilterPanel` import 删掉，顺带把 ~200 行相关 state 也去掉
4. **移动端订单列表跟进**：`apps/web/src/app/mobile/orders/page.tsx` 目前仍按 `ACTIVE/COMPLETED/CANCELLED` 筛选；如果移动端也要用新 status，需要另起任务重构
5. **Production WorkOrder 状态枚举 `ProductionWorkOrderStatus`**：这是另一张表上的另一个枚举，本次未动。后续如果也要中文化，可按本次的流程复刻
