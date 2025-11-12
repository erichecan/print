# 核心电商 MVP 路线图

## 1. 范围与目标
- 覆盖商品与分类管理、前端商品体验、购物车、结账支付、订单生成以及后台订单运营。
- 与 `docs/PRD.md`、`docs/API-CONTRACTS.md` 一致，确保可在生产环境上线。
- 交付成果包含功能清单、接口契约、数据流、关键技术改进与验证要点。

## 2. 商品与分类管理（Admin）

### 2.1 必须功能
- 管理员登录、Token 校验、角色控制。
- 商品列表/搜索/过滤、分页。
- 商品创建/编辑：基本信息、定价、库存、图像上传（含主图与图库）、多变体（尺码/颜色 SKU）。
- 商品上下架、软删除、草稿状态。
- 分类（Collection）CRUD、排序、商品归属管理、分类展示图。

### 2.2 数据流 / API
- 前端：`apps/web/src/app/admin` 中使用 React Server Components + Client 组件混合，推荐 Zustand/React Query 管理 Admin 状态。
- 后端接口（参考 `docs/API-CONTRACTS.md`）：
  - `POST /auth/login` / `GET /auth/me` / `POST /auth/logout`
  - `GET /admin/products`（分页 + 搜索 + 状态过滤）
  - `POST /admin/products`、`PUT /admin/products/:id`、`DELETE /admin/products/:id`
  - `PUT /admin/products/:id/status`（上下架）、`POST /admin/products/:id/images`
  - `GET /admin/collections`、`POST /admin/collections`、`PUT /admin/collections/:id`、`DELETE /admin/collections/:id`
  - `POST /admin/collections/:id/products` 维护归属关系
- 数据库：`Product`、`ProductVariant`、`Collection`、`CollectionProduct`、`Asset`、`Inventory` 表必须完备，具备审计字段（`createdAt`/`updatedAt`/`publishedAt`）。
- 上传：使用 S3 (推荐) 或本地存储，需包含文件类型、大小限制、病毒扫描。

### 2.3 技术改进
- 后端启用 `requireAdmin` 中间件，结合 JWT + `role` 字段。
- 统一错误响应结构（`{ error: { code, message, details } }`），支持前端展示。
- 增加库存阈值触发的后台提醒（待办，可记录到 `notifications` 表）。

## 3. 前端商品展示与浏览（Storefront）

### 3.1 必须功能
- 首页导航：响应式菜单、用户/购物车入口状态、动态内容（CMS 配置或 JSON）。
- 商品列表：分页、排序、筛选、搜索、加载骨架、空态、错误重试、路由参数保留。
- 商品详情：变体切换、库存显示、缺货/预售提醒、相关商品推荐、SEO Meta、JSON-LD、错误边界。
- 分类页：根据 slug 展示关联商品，支持 SSR + 静态预生成。

### 3.2 数据流 / API
- 使用 Next.js App Router + Server Actions / React Query：
  - `GET /products`（支持 query），`GET /products/:slug`
  - `GET /collections`、`GET /collections/:slug`
  - 推荐数据预取：`getServerSideProps` 等价的 Server Component fetch。
- 全局状态：使用 Zustand/Redux 管理 `auth`、`cart`、`ui`，保证导航栏实时更新。
- SEO：在 `app/products/[slug]/page.tsx` 中注入 `generateMetadata`、结构化数据 Schema。

### 3.3 技术改进
- 引入 Suspense + Skeleton 组件，复用 `apps/web/src/components`。
- 建立错误边界组件捕获数据异常，展示重试按钮。
- 动态内容源设计：优先读取 `assets/content-config.json`，预留 CMS API 接口。

## 4. 购物车与结账流程

### 4.1 必须功能
- 购物车：增删改、跨会话持久化（guest session + 用户同步）、价格实时刷新。
- 结账：收货/账单地址、配送方式、税费计算、条款勾选。
- Stripe：填入 publishable key、后端 secret，调用 Payment Element，处理意图确认与错误提示。
- 支付结果页：成功/失败状态展示、失败重试入口、订单号/摘要。

### 4.2 数据流 / API
- 购物车操作：`GET/POST/PATCH/DELETE /cart` 系列接口。
- 结账步骤：
  1. `POST /checkout/prepare` → 验证库存 & 价格快照；
  2. `POST /checkout/shipping-rates` → 计算运费；
  3. `POST /checkout/create-payment-intent` → 获取 `clientSecret`；
  4. 前端 Stripe Elements 确认支付；
  5. `POST /checkout/confirm` → 写入订单、持久化地址、清空购物车。
- 税费：在 `prepare` 或 `confirm` 阶段由后端调用税率服务（本期可按省份静态配置）。
- 会话：guest 使用 `sessionId` cookie；登录用户同步 `userId` 购物车。

### 4.3 技术改进
- 后端需校验库存 & 价格，防止篡改。
- Stripe webhook `/webhooks/stripe` 完成 `payment_intent.succeeded`/`failed` 状态更新。
- 结账页面引入 Form schema 校验（Zod/React Hook Form）。

## 5. 订单生成与后台订单管理

### 5.1 必须功能
- 用户端：订单确认页、订单历史列表、订单详情、发票下载/邮件重发、订单状态追踪。
- 后台：订单列表、筛选、详情、状态流转（待处理 → 生产 → 发货 → 完成）、取消/退款、备注/内部评论。

### 5.2 数据流 / API
- 用户端：
  - `GET /orders`（分页+鉴权）、`GET /orders/:id`、`GET /orders/number/:orderNumber`
  - 发票下载：生成 PDF（可调用后端 `/orders/:id/invoice`）
- 后台：
  - `GET /admin/orders`（分页+过滤）、`GET /admin/orders/:id`
  - `PATCH /admin/orders/:id/status`、`POST /admin/orders/:id/refund`
  - `POST /admin/orders/:id/notes`
- 数据模型：`Order`、`OrderItem`、`OrderAddress`、`Payment`, `Shipment`、`OrderNote`。
- 日志：订单状态变更写入审计表。

### 5.3 技术改进
- 实施事件驱动（如 `order_status_changed`）→ 通知邮件 & 生产流程。
- 定义 EasyShip 集成占位实现（Phase 2），当前先用静态运费。
- 管理端 UI 使用表格组件 + 服务端分页，结合权限控制。

## 6. 支撑能力

### 6.1 测试策略
- 单元测试：商品服务、购物车、订单服务。
- 集成测试：Checkout 流程、Stripe Webhook、订单状态更新。
- E2E 测试：Cypress/Playwright 覆盖“浏览 → 加购 → 结账 → 支付 → 查看订单”。

### 6.2 监控与部署
- CI/CD：安装依赖 → 单元测试 → 构建 → E2E（可选）→ Docker 镜像 → 部署。
- 监控：Sentry (FE/BE)、Prometheus + Grafana（或 Logtail/ELK），Stripe Dashboard 警报。
- 日志：结构化 JSON 日志，记录关键操作。
- 环境变量：集中管理（`.env.production` 模板）+ Secret Manager。

### 6.3 安全与合规
- JWT 生命周期管理（刷新、登出立即失效）。
- CSRF/CORS、速率限制、防暴力破解。
- 文件上传安全策略（MIME、大小、扫描、签名 URL）。
- 数据备份与恢复：PostgreSQL 备份脚本，Stripe/EasyShip Webhook 重放机制。

## 7. 里程碑建议
- **Sprint 1**：后台认证 & 商品/分类 CRUD，Storefront 商品展示优化。
- **Sprint 2**：购物车持久化、结账流程、Stripe 集成、订单生成。
- **Sprint 3**：用户订单中心、后台订单管理、审计/通知。
- **Sprint 4**：测试、性能优化、监控与部署、上线准备。

---

> 文档后续可与 Design Lab 与线下订单路线图对接，形成全链路发布计划。

## 附录：行动项清单（测试 / 部署 / 增强）

### 测试与质量
- 建立单元测试覆盖率目标（后端服务 ≥70%，前端关键组件 ≥60%），补齐购物车、结账、订单服务测试。
- 编排 Playwright/Cypress 场景：产品浏览 → 加购 → 结账 → 支付 → 查看订单。
- 集成 Stripe CLI 进行 webhook 回放测试；EasyShip sandbox 在 Phase 2 前完成。
- 引入 Lighthouse 自动化检查（CI 中跑阈值 90/90/90/100）。

### 部署与运维
- 完成 Docker 多阶段构建，前后端分别生成镜像，撰写 `docker-compose`/K8s 部署样例。
- 配置 GitHub Actions/GitLab CI：安装 → lint/test → build → artifact → 部署。
- 建立环境变量模板与 Secret 管理策略（本地 `.env`, 生产使用 Azure Key Vault/AWS Secrets Manager）。
- 部署监控：前端/后端接入 Sentry，API 结合 Prometheus 导出器，日志集中到 ELK/CloudWatch。
- 制定数据库备份与恢复流程（pg_dump + 恢复演练）。

### 后续增强
- 设计 Lab 核心路线图：锁定状态管理方案、画布技术选型、后端渲染/报价 API 实施里程碑。
- 线下订单流程：Next.js 表单迁移、附件存储、后台审批 UI 迭代计划。
- 后台运营：增加成本与经营分析仪表盘、生产工单管理、Feature Flags 配置中心。
- 安全与合规：渗透测试计划、依赖扫描自动化、权限审计脚本。



