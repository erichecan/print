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
1.  **AUTO_MIGRATE 未开启** (Critical):
    -   即使代码中包含 `runMigrationsIfEnabled`，如果环境变量 `AUTO_MIGRATE` 不为 `true`，**迁移根本不会运行**。
    -   `deploy_clean.sh` 曾缺失此变量配置，导致所有迁移被跳过，引发 Schema Drift。
    -   **修复**：确保部署命令包含 `--set-env-vars AUTO_MIGRATE=true`。

2.  **静默迁移失败 (Silent Migration Failure)**：
    -   **机制**：`backend/scripts/run-migrations.js` 配置了 `allowFailure: true`。
    -   **后果**：即使 `prisma migrate deploy` 失败（如超时、连接问题），服务器**也会启动**。
    -   **结果**：代码使用的是新生成的 Prisma Client（包含新字段如 `printable_areas`），但数据库表结构很旧（缺少该列）。
    -   **报错**：
        -   `POST /products`: 尝试写入不存在的列 -> DB 拒绝 -> 500。
        -   `GET /cart`: `include` 查询生成的 SQL 包含不存在的列 -> DB 拒绝 -> 500。

3.  **Schema 漂移 (Schema Drift)**：
    -   本地 `prisma migrate dev` 修改了 DB 结构，但生成的 migration 文件夹未被提交到 Git，导致 Cloud Build 只有 schema 却没有 SQL 文件来执行变更。

4.  **环境隔离问题**：
    -   前端构建时注入的环境变量 (`NEXT_PUBLIC_*`) 与运行时 Secret 不一致。

5.  **失败的迁移阻止后续迁移执行** (2026-01-06 发现并修复):
    -   **现象**：生产环境持续出现 500 错误，即使代码修复已部署。
    -   **根因分析**：
        -   迁移 `20250131_add_color_size_overrides` 在 2026-01-06 08:08:54 开始执行但失败。
        -   Prisma 检测到失败的迁移后，会阻止所有后续迁移的执行。
        -   错误信息：`migrate found failed migrations in the target database, new migrations will not be applied`。
        -   由于 `allowFailure: true`，服务器继续启动，但数据库 Schema 与代码不匹配，导致 500 错误。
    -   **影响范围**：
        -   所有需要数据库查询的接口都可能返回 500。
        -   新功能无法使用（因为 Schema 变更未应用）。
    -   **解决方案**：
        1.  **使用 prisma migrate resolve**：标记失败的迁移为已应用或回滚。
        2.  **直接 SQL 方式**：使用 `scripts/resolve-migration-direct-sql.sql` 直接更新迁移表。
        3.  **API 端点方式**：调用 `POST /api/admin-seed/resolve-migration` 端点。
        4.  **Cloud Run Job 方式**：使用 `scripts/resolve-failed-migration-20250131.sh`。
    -   **修复步骤**：
        ```bash
        # 方法 1: 使用 API 端点（推荐）
        curl -X POST https://printngoplus.com/api/admin-seed/resolve-migration \
          -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"migrationName": "20250131_add_color_size_overrides", "action": "applied"}'
        
        # 方法 2: 使用 Cloud Run Job
        ./scripts/resolve-failed-migration-20250131.sh
        
        # 方法 3: 直接执行 SQL（需要数据库访问）
        psql $DATABASE_URL -f scripts/resolve-migration-direct-sql.sql
        ```
    -   **修复文件**：
        -   `scripts/resolve-failed-migration-20250131.sh` - Cloud Run Job 脚本
        -   `scripts/resolve-migration-direct-sql.sql` - 直接 SQL 脚本
        -   `scripts/resolve-migration-via-api.sh` - API 调用脚本
        -   `backend/src/routes/admin-seed.js` - 新增 resolve-migration 端点
    -   **修复时间**：2026-01-06T23:20:00.000Z
    -   **经验教训**：
        -   失败的迁移必须及时解决，否则会阻止所有后续迁移。
        -   在生产环境部署前，应该检查迁移状态。
        -   考虑在部署脚本中添加迁移状态检查步骤。

6.  **imageHelper.js 中 req 对象无效导致 500 错误** (2026-01-06 修复):
    -   **现象**：反复出现的 500 错误，涉及 `/api/cart`、`/api/proxy/admin/products`、创建产品等接口。
    -   **根因分析**：
        -   `backend/src/utils/imageHelper.js` 中的 `normalizeImageUrl` 函数在调用 `req.get('host')` 和 `req.protocol` 时，如果 `req` 不是有效的 Express 请求对象（如 `undefined`、`null` 或格式不正确），会抛出错误。
        -   在代理路由或某些特殊场景下，传递给 `optimizeImageUrl` 的 `req` 对象可能不是标准的 Express 请求对象，导致调用不存在的方法时抛出异常。
        -   错误传播到整个请求处理流程，最终返回 500 Internal Server Error。
    -   **影响范围**：
        -   `GET /api/cart` - 购物车获取失败
        -   `GET /api/proxy/admin/products` - 商品列表加载失败
        -   `POST /api/proxy/admin/products` - 创建产品失败
        -   所有涉及图片 URL 优化的接口都可能受影响
    -   **修复方案**：
        1.  **防御性检查**：在 `normalizeImageUrl` 函数中添加对 `req` 对象的有效性验证，确保它是对象且具有 `get` 方法。
        2.  **错误隔离**：使用 try-catch 包装所有可能抛出错误的调用，确保图片 URL 优化失败不会导致整个 API 请求失败。
        3.  **降级处理**：当优化失败时，回退到原始 URL，保证功能可用性。
        4.  **增强错误处理**：在 `adminProductController.js` 中所有调用 `optimizeImageUrl` 的地方添加 try-catch，记录警告日志但不中断请求。
    -   **修复文件**：
        -   `backend/src/utils/imageHelper.js` - 核心修复，添加防御性检查和错误处理
        -   `backend/src/controllers/adminProductController.js` - 增强所有图片优化调用的错误处理
    -   **修复时间**：2026-01-06T22:30:00.000Z
    -   **经验教训**：
        -   在处理可能为 `null` 或 `undefined` 的对象时，必须添加防御性检查。
        -   工具函数（如 `optimizeImageUrl`）应该能够优雅地处理各种边界情况，不应该因为单个功能失败而导致整个请求失败。
        -   在代理路由或中间件中传递请求对象时，需要确保对象格式的一致性。

### 🟡 文件系统只读
- **现象**：上传文件报错 `EROFS`。
- **原因**：Cloud Run 容器文件系统只读。
- **解法**：必须使用 GCS (Google Cloud Storage) 存储上传文件。
    -   **关键配置**：确保部署脚本中包含 `GCP_IMAGE_BUCKET` 环境变量（例如 `print-482914-images`）。缺少此变量会导致 "Storage configuration error"。

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
3.  **部署命令**：
    -   确保运行 `deploy_clean.sh` 时，脚本中包含 `AUTO_MIGRATE=true`。
    -   或者手动运行：`gcloud run deploy ... --set-env-vars AUTO_MIGRATE=true ...`

### 🐛 调试 GCP 上的 500 错误
1.  **不要只看前端**：前端的 `500` 是掩盖后的信息。
2.  **查阅 Cloud Run 日志**：
    -   过滤 `Severity: Error`。
    -   搜索关键字 `Column ... does not exist` (表明迁移没跑) 或 `P2002` (唯一性冲突)。
3.  **检查环境变量**：确认 `AUTO_MIGRATE` 是否开启。

### 🔍 500 错误诊断检查清单 (2026-01-06 更新)
**当生产环境出现 500 错误时，按以下顺序检查：**

#### 步骤 1: 检查代码是否已部署
```bash
# 检查最新部署的代码版本
gcloud run services describe print-main-backend \
  --region us-central1 \
  --project print-482914 \
  --format='value(spec.template.spec.containers[0].image)'

# 检查 Git 提交历史，确认修复是否已提交
git log --oneline -5
```

#### 步骤 2: 检查环境变量配置
```bash
# 检查 AUTO_MIGRATE 是否开启
gcloud run services describe print-main-backend \
  --region us-central1 \
  --project print-482914 \
  --format='value(spec.template.spec.containers[0].env)'

# 应该看到 AUTO_MIGRATE=true
```

#### 步骤 3: 检查数据库连接
```bash
# 查看 Cloud Run 日志中的数据库连接错误
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=print-main-backend AND \
  severity>=ERROR" \
  --limit 50 \
  --format json \
  --project print-482914 | \
  grep -i "database\|connection\|P1001\|P1002\|P1017"

# 检查是否有连接超时或连接被拒绝的错误
```

#### 步骤 4: 检查数据库迁移状态
```bash
# 方法 1: 通过 API 检查数据库状态（如果服务可访问）
curl https://printngoplus.com/api/admin-seed/status

# 方法 2: 手动运行迁移检查
# 在本地或 Cloud Shell 中：
cd backend
export DATABASE_URL="your-production-database-url"
npx prisma migrate status

# 如果显示 "Database schema is out of sync"，需要运行迁移
npx prisma migrate deploy
```

#### 步骤 5: 验证 Schema 是否匹配
```bash
# 检查 Prisma Schema 和数据库是否同步
cd backend
export DATABASE_URL="your-production-database-url"
npx prisma db pull  # 这会显示差异
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

#### 步骤 6: 检查 Cloud Run 日志中的具体错误
```bash
# 查看最近的错误日志
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=print-main-backend AND \
  severity>=ERROR AND \
  timestamp>=\"$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)\"" \
  --limit 100 \
  --format json \
  --project print-482914

# 搜索特定错误模式
# - "Column ... does not exist" -> Schema 不匹配
# - "P1001" -> 数据库连接失败
# - "P2002" -> 唯一性约束冲突
# - "P2025" -> 记录不存在
# - "req.get is not a function" -> imageHelper.js 问题（已修复）
```

#### 步骤 7: 手动触发数据库迁移（如果需要）
```bash
# 如果 AUTO_MIGRATE 未开启或迁移失败，手动运行：
# 1. 通过 API 端点触发（如果可用）
curl -X POST https://printngoplus.com/api/admin-seed/migrate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 2. 或者在 Cloud Shell 中直接运行
gcloud run jobs execute migrate-database \
  --region us-central1 \
  --project print-482914

# 3. 或者通过 Cloud Run 服务手动执行
gcloud run services update print-main-backend \
  --set-env-vars AUTO_MIGRATE=true \
  --region us-central1 \
  --project print-482914
```

#### 步骤 8: 验证修复是否生效
```bash
# 重新部署服务（确保包含所有修复）
./deploy_clean.sh

# 等待部署完成后，检查日志
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=print-main-backend AND \
  textPayload=~\"migration\" OR textPayload=~\"AUTO_MIGRATE\"" \
  --limit 20 \
  --format json \
  --project print-482914

# 测试 API 端点
curl https://printngoplus.com/api/cart
curl https://printngoplus.com/api/proxy/admin/products?page=1
```

#### 常见问题快速修复
1. **AUTO_MIGRATE 未开启**：
   ```bash
   gcloud run services update print-main-backend \
     --set-env-vars AUTO_MIGRATE=true \
     --region us-central1 \
     --project print-482914
   ```

2. **Schema 不匹配**：
   ```bash
   # 在本地或 Cloud Shell 中运行迁移
   cd backend
   export DATABASE_URL="your-production-database-url"
   npx prisma migrate deploy
   ```

3. **数据库连接问题**：
   - 检查 `DATABASE_URL` Secret 是否正确配置
   - 检查 Cloud SQL 实例是否运行
   - 检查网络连接和防火墙规则

4. **代码未部署**：
   ```bash
   # 重新部署
   ./deploy_clean.sh
   ```
