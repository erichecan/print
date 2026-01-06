# Antigravity: 项目开发与部署核心文档

## 1. 项目概览 (Project Overview)
本平台是一个全栈电子商务解决方案，专为定制商品（Print-on-Demand）业务设计。
- **核心功能**：支持在线定制设计、购物车流程、Stripe 支付、线下订单管理及管理员后台。
- **技术栈**：
  - **Frontend**: Next.js (Pages Router & App Router), TailwindCSS, Fabric.js (Canvas Design).
  - **Backend**: Node.js, Express, Prisma (ORM), PostgreSQL.
  - **Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL, Cloud Build).

## 2. 模块说明 (Module Description)

### Frontend (`apps/web`)
- **路径**：`src/pages` (旧路由) & `src/app` (新路由，如 `offline-orders`).
- **关键组件**：
  - `ProductWizard`: 产品定制向导。
  - `Canvas`: Fabric.js 画布逻辑，用于用户设计。
  - `OfflineOrders`: 线下订单录入系统，状态管理复杂。

### Backend (`backend`)
- **架构**：典型的 MVC 结构 (Controllers, Services, Routes).
- **数据库交互**：主要使用 Prisma Client，部分旧逻辑可能遗留 Sequelize。
- **关键服务**：
  - `adminProductController`: 处理产品 CRUD，近期频繁变更。
  - `cartController`: 购物车逻辑，包含库存检查。
  - `inventoryService`: 库存管理。

## 3. 编码约定 / 风格指南 (Coding Conventions)

### 数据库变更
- **Golden Rule**: 任何 `schema.prisma` 的修改 **必须** 伴随一个新的 migration 文件 (`prisma/migrations/...`).
- **禁止**：仅修改 `schema.prisma` 而不生成 migration SQL。
- **流程**：
  1. 修改 `schema`。
  2. `npx prisma migrate dev --name <description>`。
  3. 提交生成的 SQL 文件。

### 错误处理
- 后端 Controller 必须使用 `try...catch` 包裹，并记录详细日志 (Console 或 Logger)。
- 前端 API 调用需处理非 200 响应，避免白屏。

### 命名规范
- 数据库字段：`camelCase` (Prisma 层) -> `snake_case` (DB 层，由 Prisma 映射)。
- API 路由：RESTful 风格，如 `/api/admin/products`。

## 4. 常见坑 / 已知问题 (Common Pitfalls)

### 🔴 生产环境 "Internal Server Error" (500)
**现象**：本地运行正常，GCP 上某些接口（如创建产品、查看购物车）报错 500。
**原因分析**：
1.  **静默迁移失败 (Silent Migration Failure)**：
    -   **机制**：`backend/scripts/run-migrations.js` 配置了 `allowFailure: true`。
    -   **后果**：即使 `prisma migrate deploy` 失败（如超时、连接问题），服务器**也会启动**。
    -   **结果**：代码使用的是新生成的 Prisma Client（包含新字段如 `printable_areas`），但数据库表结构很旧（缺少该列）。
    -   **报错**：
        -   `POST /products`: 尝试写入不存在的列 -> DB 拒绝 -> 500。
        -   `GET /cart`: `include` 查询生成的 SQL 包含不存在的列 -> DB 拒绝 -> 500。

2.  **Schema 漂移 (Schema Drift)**：
    -   本地 `prisma migrate dev` 修改了 DB 结构，但生成的 migration 文件夹未被提交到 Git，导致 Cloud Build 只有 schema 却没有 SQL 文件来执行变更。

3.  **环境隔离问题**：
    -   前端构建时注入的环境变量 (`NEXT_PUBLIC_*`) 与运行时 Secret 不一致。

### 🟡 文件系统只读
- **现象**：上传文件报错 `EROFS`。
- **原因**：Cloud Run 容器文件系统只读。
- **解法**：必须使用 GCS (Google Cloud Storage) 存储上传文件。

## 5. 重要决策记录 (ADR - Simplified)

### ADR-001: 允许迁移失败继续启动
- **决策**：在部署脚本中设置 `allowFailure: true`。
- **背景**：为了防止因瞬时数据库连接问题导致整个服务无法启动（特别是自动扩缩容时）。
- **代价**：如果发生 Schema 变更且迁移真正的失败了，服务会带着错误的状态启动，导致 500 错误。
- **修正建议**：在涉及重大 Schema 变更（如添加必填列、重构表）的部署中，应暂时关闭此宽容策略，或部署后立即人工验证迁移日志。

### ADR-002: Monorepo 结构
- **决策**：前端后端同库管理。
- **影响**：部署脚本需要分别构建前后端。共享类型定义需谨慎处理。

## 6. 典型任务 Best Practices

### 🚀 部署新数据库字段
1.  **本地**：
    -   `npx prisma migrate dev --name add_printable_areas`
    -   验证 `prisma/migrations` 下生成了新文件夹。
2.  **提交**：
    -   `git add prisma/migrations`
    -   `git commit -m "chore: db migration for printable areas"`
3.  **部署后验证**：
    -   去 GCP Logs 搜索 "Prisma migrate deploy"。
    -   如果看到 "失败" 但 "服务器继续启动"，**立即手动干预**（手动连接 DB 运行 SQL 或重新部署）。

### 🐛 调试 GCP 上的 500 错误
1.  **不要只看前端**：前端的 `500` 是掩盖后的信息。
2.  **查阅 Cloud Run 日志**：
    -   过滤 `Severity: Error`。
    -   搜索关键字 `Column ... does not exist` (表明迁移没跑) 或 `P2002` (唯一性冲突)。
3.  **检查环境变量**：确认 `AUTO_MIGRATE` 是否开启。
