# Antigravity: GCP 部署与调试手册

本文档总结了部署到 Google Cloud Platform (GCP) 时反复出现 500 错误的经验教训。我们将解释为什么在本地运行正常的代码在生产环境中会失败，并提供一份检查清单以防止这些问题再次发生。

## 💎 开发黄金法则 (Golden Rules)

### 涉及数据库修改的功能开发流程
当你添加新功能并修改了 `schema.prisma`（如增加字段）时，必须严格遵守以下流程：

1.  **本地修改**：修改 `schema.prisma`。
2.  **生成迁移**：运行 `npx prisma migrate dev --name <descriptive_name>`。
    *   *重要*：这不仅会更新本地 DB，还会生成 `prisma/migrations/xxxxxxxx_name/migration.sql` 文件。
3.  **检查文件**：**必须**确认 `prisma/migrations` 目录下生成了新的文件夹和 SQL 文件。
    *   *检查点*：如果只有 `schema.prisma` 变了，但没有新 migration 文件，**不要部署**！
4.  **提交代码**：将新生成的 migration 文件夹和 `schema.prisma` 一起提交到 Git。
5.  **部署验证**：部署系统（Cloud Run / Cloud Build）依赖这些 SQL 文件来更新生产数据库。如果不提交这些文件，生产数据库永远不会更新，导致“Column not found” 500 错误。

---

## 🛑 为什么 GCP 上会出现 500 错误（而本地没有）

“在我的机器上是好的”这种现象通常源于以下几个关键差异：

### 1. 数据库结构漂移（头号杀手）
*   **症状**：“Column not found”（找不到列）、“Relation does not exist”（关系不存在），或保存/提交时出现通用的 500 错误。
*   **原因**：你在本地修改了 `schema.prisma` 并运行了 `prisma migrate dev`。但在 GCP 上，`AUTO_MIGRATE` 逻辑运行的是 `prisma migrate deploy`。
*   **严重风险**：在 `server.js` 中，迁移逻辑被包裹在 `try...catch` 块中，这会导致**即使迁移失败，服务器也会记录警告但继续启动**。
    *   *结果*：应用状态显示为“健康”（绿色对勾），但当你尝试写入一个不存在的列（如最近更改的 `printableAreas` 或 `extraFields`）时，应用会立即崩溃。
*   **修复**：部署后立即检查 Cloud Run 日志，搜索“Database migrations failed”。

### 2. 缺少环境变量
*   **症状**：在特定操作（例如 Stripe 支付、图片上传）时崩溃。
*   **原因**：本地 `.env` 文件中的密钥没有添加到 **GCP Secrets Manager** 或 **Cloud Run 环境变量**中。
*   **陷阱**：`NEXT_PUBLIC_API_URL` 在 `cloudbuild.yaml`（第 83 行）和 `deploy_clean.sh` 中是硬编码的。如果你更改了后端服务名称，前端就会断开连接。

### 3. 文件系统是只读的
*   **症状**：“EROFS: read-only file system”。
*   **原因**：Cloud Run 容器是不可变的。你不能在运行时写入 `./uploads/` 或修改文件。
*   **修复**：所有动态资源（图片）**必须**上传到 Google Cloud Storage (GCS)。

### 4. 硬编码的前端构建参数
*   **症状**：前端调用了错误的 API URL 或使用了旧的 Stripe 密钥。
*   **原因**：前端环境变量（以 `NEXT_PUBLIC_` 开头）是在**构建时（Build Time）**注入的。在 GCP 中更改 Secret *不会更新正在运行的前端*，直到你**重新构建**容器。

---

## 🔍 深度案例分析：`POST /api/proxy/admin/products` 返回 500

### 错误现象
用户报告前端控制台报错：
```
POST https://printngoplus.com/api/proxy/admin/products 500 (Internal Server Error)
```
而本地测试一切正常。

### 根本原因分析
这是典型的**请求/响应不匹配**或**未捕获的后端异常**。由于本地是好的，几乎可以肯定是环境差异。

**最可能的罪魁祸首：**
1.  **Schema 漂移（Schema Drift）：** 
    代码试图写入一个新字段（例如 `printableAreas`，定义在 Prisma Schema 第 145 行），但生产数据库并没有这个列。
    *   *为什么？* 开发时没有生成或提交 Migration 文件，或者生产环境迁移失败。
    *   *后端行为*：Prisma 抛出 "Column does not exist" 异常 -> `adminProductController` 捕获异常 -> 返回 500。

2.  **数据校验差异：**
    本地可能使用的是宽松的数据校验，而生产环境数据可能触发了不同的路径。

### 解决方案
1.  **查看后端的一手日志**：不要猜。去 GCP Console -> Cloud Run -> Logs。搜索 `createProduct error`。
2.  **验证数据库结构**：如果确认是 "Column does not exist"，你需要手动运行迁移或者修复 `AUTO_MIGRATE`。

---

## ✅ 部署检查清单（每次部署前必做）

### 1. 数据库有变更吗？
- [ ] 你是否修改了 `schema.prisma`？
- [ ] 如果是，请在本地针对**生产数据库**（使用代理或临时连接）运行 `npx prisma migrate deploy`，或者确保设置了 `AUTO_MIGRATE=true` 并监控日志。
- [ ] **监控提示**：在启动后的前 30 秒内观察 Cloud Run 的“日志”标签页。

### 2. 有新的环境变量吗？
- [ ] 你是否添加了 `process.env.NEW_KEY`？
- [ ] **操作**：将其添加到 `cloudbuild.yaml`（如果是构建时需要）或者更新 Cloud Run 服务的修订版本以包含新变量/Secret。

### 3. 前端需要重新构建吗？
- [ ] 如果你更改了 `NEXT_PUBLIC_API_URL` 或任何公共配置，你**必须触发一次新的 Cloud Build**。仅仅重启服务是不够的。

---

## 🛠 如何像专家一样调试 500 错误

当前端显示“500 Internal Server Error”时：

1.  **不要相信前端**：浏览器控制台只会显示 `500`。为了安全起见，它屏蔽了真实的错误信息。
2.  **前往 Cloud Run 控制台**：
    *   找到你的后端服务（`print-main-backend`）。
    *   点击 **日志 (Logs)**。
    *   过滤 **严重性 (Severity): Error**。
3.  **寻找这些关键字**：
    *   `P2002`: 唯一约束冲突（重复的 Slug 或 SKU）。
    *   `P2025`: 记录未找到。
    *   `Column "..." does not exist`: **这是最常见的原因！** 意味着迁移失败。
    *   `Timeout`: 如果错误正好在 10s 或 30s 后发生，是网络超时。

## 🚀 紧急指令

如果你怀疑 DB 不同步且 `AUTO_MIGRATE` 失败：
1.  **查看日志**：确认是否是 "Column does not exist"。
2.  **手动修复**：连接到云 SQL 实例并手动执行 SQL `ALTER TABLE products ADD COLUMN ...`。
3.  **更安全的方法**：补全缺失的迁移文件，提交代码，并重新触发部署。
