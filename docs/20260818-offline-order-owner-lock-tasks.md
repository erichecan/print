# 线下订单「非创建者只读」权限改造 — 任务台账

日期：2026-08-18
背景：线下销售管理模块目前任何 SALES/SALES_MANAGER/ADMIN 都能改任何人的订单。

## 已确认的规则（用户 2026-08-18 拍板）

- **所有人一视同仁**（含 ADMIN）：对「别人创建的订单」只能修改 `Status`，其余只读预览。
- 一并禁止（非创建者）：改阶段 stage、上传/删除/改备注 附件、编辑生产工单。
- 仍允许（非创建者）：添加订单备注 note、修改 Status、查看/打印/导出。
- 删除订单 `DELETE /:id` 维持现状（仅 ADMIN），本次不改 —— 已在报告中标注待用户决定。
- 归属判定：`OfflineOrder.metadata.submittedByUserId`。
  **历史订单若无该字段（无归属）→ 保持所有人可编辑**，避免旧数据被永久锁死。

## 任务

- [x] T1 后端：`utils/offlineOrderOwnership.js`（归属判定 + 两个中间件）；`mapOrder` 暴露 `creatorId`
      验收：单测/手工 curl 确认 helper 行为；列表与详情接口返回 creatorId
      产出：backend/src/utils/offlineOrderOwnership.js, backend/src/controllers/offlineOrderController.js
- [x] T2 后端：路由挂载 owner 校验（stage / assets×3 / production）
      验收：非创建者调这些接口返回 403 OFFLINE_ORDER_NOT_OWNER
      产出：backend/src/routes/adminOfflineOrders.js
- [x] T3 后端：`PATCH /:id` 字段级校验 —— 非创建者仅允许 status/note
      验收：非创建者 PATCH {status} → 200；PATCH {quantity} → 403；带文件上传 → 403
      产出：backend/src/routes/adminOfflineOrders.js（multer 之后挂中间件）
      commit: 9f1c357
- [x] T4 前端：列表 inline 编辑按归属禁用（仅 Status 可改）
      验收：别人的订单行除 Status 外全部 disabled；附件浮层只读；批量选择/全选/补充成本跳过非本人订单
      产出：apps/web/src/app/offline-orders/sales/orders/components/OrdersSpreadsheet.tsx
      commit: cd11b5b
- [x] T5 前端：详情页 stage 下拉 + 附件上传/删除按归属禁用
      验收：别人的订单详情页无法改阶段、无法传/删附件，显示只读提示
      产出：apps/web/src/app/offline-orders/sales/orders/[id]/page.tsx
      commit: cd11b5b
- [x] T6 前端：编辑向导（desktop + mobile）非创建者拦截
      验收：`/offline-orders?editId=别人的单` 显示无权限提示并可返回，不进入表单
      产出：apps/web/src/app/offline-orders/page.tsx, apps/web/src/app/mobile/offline-orders/create/page.tsx
      commit: cd11b5b
- [x] T7 验证：前端 build + 后端鉴权测试
      结果：apps/web `npm run build` ✓ Compiled successfully（无新增类型错误，
            残留的 tsc 报错在改动前就存在）；backend `npx jest tests/unit` →
            114 用例中 112 通过，新增的 offlineOrderOwnership 12/12 全通过；
            仅 authController 2 个用例失败，改动前同样失败（与本次无关）。
      commit: 649d5c8

- [x] T8（追加）admin 看板 + 移动端订单详情的 UI 门控
      验收：他人订单卡片不可拖拽、阶段/附件/生产工单控件禁用
      产出：apps/web/src/app/admin/offline-orders/page.tsx,
            apps/web/src/app/mobile/orders/[id]/page.tsx
      commit: 649d5c8

## 未解决 / 待用户决定

- `DELETE /api/admin/offline-orders/:id` 仍是 ADMIN 可删任何人的订单（本次未改）。
- 创建者本人编辑时 `metadata` 会被整体覆盖，需保证 `submittedByUserId` 不丢（已在 T3 中加保护）。
