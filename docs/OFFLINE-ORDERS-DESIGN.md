<!-- [2025-11-12 00:30:00] Offline order intake & production design notes -->
# Offline Order Intake & Production Design Notes

## 1. 需求摘要

- **用户入口**：`prototype/static-pages/offline-pod-intake.html` 与 `offline-pod-intake.js` 已定义多步信息收集与附件上传体验，需要迁移至 Next.js `apps/web`.
- **提交内容**：
  - 基本项目字段：项目名称、交付时间、主打产品、数量。
  - 联系人与沟通渠道（公司、姓名、邮箱、电话）。
  - 工艺/配置：需要 mockups、实物打样、加急等布尔配置。
  - 说明备注与附件（AI/EPS/SVG/PDF/PNG…，默认上限 10 个、50MB）。
- **后台需求**：
  - 审批看板按阶段管理线下订单（Intake → Review → Production → …）。
  - 查看订单详情、附件、历史记录；可添加备注、修改字段、推进阶段。
  - 统计摘要：阶段分布、状态分布、加急数量等。
- **生产衔接**：
  - 线下订单应能生成/关联“生产工单”，体现生产状态机（生产中、质检、发货等）。
  - 状态流转需保留操作人、时间、备注。

## 2. 现有后端能力评估

| 功能 | 状态 | 文件 |
| --- | --- | --- |
| Intake API (`POST /api/offline-orders`) | ✅ 已实现 | `backend/src/controllers/offlineOrderController.js` |
| 管理端列表 / 详情 / 指标 | ✅ 已实现 | 同上 |
| 阶段配置存储 | ✅ `offlineWorkflowService` + `settings` seeder | `backend/src/services/offlineWorkflowService.js` |
| 阶段流转 / 备注记录 | ✅ `offline_order_stage_history` | `prisma/schema.prisma` |
| 生产工单关联 | ❌ 未实现 | 需要新增模型和服务 |
| 上传存储 | 临时：本地磁盘 `uploads/offline-orders` | `routes/offlineOrders.js` |
| 安全控制 | 待完善：`requireAdmin` 暂注释 | `routes/adminOfflineOrders.js` |

## 3. 数据模型与接口契约

### 3.1 核心模型（Prisma）

- `OfflineOrder`：已包含项目字段、stage、status、配置、元数据。
- `OfflineOrderAsset`：附件记录（文件名、大小、ContentType、存储 Key）。
- `OfflineOrderStageHistory`：阶段变更/备注日志。
- **新增需求**：
  - `ProductionWorkOrder`（建议）：关联 `OfflineOrder`, 包含生产阶段、预计起止时间、责任人、外部系统引用。
  - `ProductionWorkOrderEvent`：记录生产状态变更、责任人与备注。
  - `ProductionTask`（可选）：细分工序追踪。

### 3.2 API 扩展建议

| Endpoint | Method | 说明 |
| --- | --- | --- |
| `/api/admin/offline-orders/:id/notes` | POST | 仅写备注，便于区分阶段更新 |
| `/api/admin/offline-orders/:id/assets` | POST | 后台补充附件上传（与 S3/签名流程一致） |
| `/api/admin/offline-orders/:id/production` | POST | 创建/更新生产工单（幂等） |
| `/api/admin/production-work-orders` | GET | 生产看板数据源（预留） |

> 详细字段定义见附录（建议在 API Contracts 文档追加）。

## 4. 技术方案 & 选型

### 4.1 上传策略

- **推荐**：迁移至对象存储（S3 兼容），使用预签名 URL；前端多段上传支持断点重传。
- 本地 `multer` 方案可作为开发环境 fallback。
- 引入防病毒扫描流程（ClamAV 或第三方 API）。

### 4.2 权限模型

- 所有 `/api/admin/offline-orders/*` 恢复 `requireAdmin` 中间件。
- 备注/阶段更新需 audit log（现有 histories 可满足）。
- 在 Next.js Admin 前端使用 `authApi.me` 校验角色，未授权重定向登录。

### 4.3 后台前端框架

- **栈**：Next.js App Router + React Server Components + `use client` 页面组合。
- **UI 库**：建议引入成熟表格/看板组件（如 MUI X DataGrid 或 TanStack Table + 自建组件）。
- **状态管理**：SWR/React Query + 轻量全局 store（Zustand）处理会话信息。
- **文件预览**：使用 file viewer（PDF.js、Image preview）+ 外链下载。

### 4.4 生产看板

- 结构：列表示阶段（看板视图），卡片展示订单关键信息与附件计数。
- 支持拖拽变更阶段（前端发起 PATCH `/admin/offline-orders/:id/stage`）。
- 高优先级：加急订单视觉标记。

## 5. 风险与对策

- **附件安全**：上线前完成病毒扫描接入；限制类型/大小 + 扫描结果写入元数据。
- **状态机一致性**：在 service 层集中处理阶段流转与历史记录，避免重复逻辑分散在 controller。
- **并发更新**：所有写操作采用 Prisma 事务 + 乐观更新，避免 stagePosition 冲突。
- **外部系统集成**：预留 `metadata.externalRefs` 字段同步 ERP/OMS，实施时与运营确认。

## 6. 下一步

1. 通过本设计文档复盘确认需求无遗漏。
2. 进入阶段 2：实现生产工单模型与 API、完善上传策略。
3. 输出详细的 API 契约和前端类型定义，供前后端协作。

---

> 文档同步路径：`docs/OFFLINE-ORDERS-DESIGN.md`。跟进时请更新版本号与变更说明。 

