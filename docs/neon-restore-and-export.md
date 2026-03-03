# Neon 恢复分支 + Restore + Export 一键流程

## 你需要提供的内容

### 1. 本地 / 服务器一键命令

在项目根目录执行前，请先设置环境变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| **NEON_API_KEY** | ✅ | Neon 控制台 → Account settings → API keys 中创建（创建后只显示一次，请妥善保存） |
| **NEON_PROJECT_ID** | ✅ | Neon 控制台 → 项目 Settings 页中的 Project ID（形如 `autumn-disk-484331`） |

可选（多数情况可省略）：

| 变量 | 说明 |
|------|------|
| NEON_PARENT_BRANCH_ID | 从指定分支创建恢复分支；不设则从项目默认分支（如 main）创建 |
| NEON_DATABASE_NAME | 新分支上的数据库名；不设则自动取该分支第一个数据库（通常为 `neondb`） |
| NEON_ROLE_NAME | 连接使用的角色名；不设则自动取该分支第一个角色 |
| NEON_RESTORE_BRANCH_NAME | 恢复分支名称；不设则自动生成 `restore-YYYY-MM-DD-xxx` |

一键命令示例：

```bash
cd /path/to/print-main
export NEON_API_KEY="你的 API Key"
export NEON_PROJECT_ID="你的 Project ID"
node scripts/neon-restore-branch-and-run.js
```

脚本会依次：创建新分支 → 等待就绪 → 对该分支执行 restore 流水线（含自检）→ 导出快照到 `snapshots/catalog-YYYYMMDD.json`。

---

### 2. GitHub Action 自动执行

在 GitHub 仓库中配置 **Secrets**（Settings → Secrets and variables → Actions）：

| Secret 名称 | 必填 | 说明 |
|-------------|------|------|
| **NEON_API_KEY** | ✅ | 同上，Neon API Key |
| **NEON_PROJECT_ID** | ✅ | 同上，Neon Project ID |

配置完成后：

- 打开仓库 **Actions** 页，选择 **Neon Restore Branch and Export**
- 点击 **Run workflow** 手动触发
- 运行结束后可在该次 run 的 **Artifacts** 中下载 `catalog-snapshot-<run_id>`（内含 `snapshots/` 下的快照文件）

当前工作流仅支持 **手动触发**（`workflow_dispatch`）。若需每日自动执行，可在 `.github/workflows/neon-restore-and-export.yml` 中取消注释 `schedule` 并设置 cron。

---

## 流程说明

1. **创建 Neon 恢复分支**：通过 Neon API 从默认（或指定）父分支创建新分支，并创建 read_write endpoint。
2. **等待分支就绪**：轮询 Neon 的 operations 直至创建/启动完成。
3. **获取连接串**：查询新分支的 database/role，拿到 `connection_uri` 并设为 `DATABASE_URL`。
4. **执行 restore**：运行 `restore-core-config-and-catalog.js`（L1/L2 恢复 + 自检），脚本内会使用 `RESTORE_ALLOW_PROD=1` 与 `RESTORE_CONFIRM_TOKEN=core-catalog` 以允许对 Neon 连接执行。
5. **导出快照**：运行 `export-catalog-snapshot.js`，在项目根目录生成 `snapshots/catalog-YYYYMMDD.json`。

所有操作均在 **新分支** 上进行，不会修改你当前的生产或默认分支数据。

---

## 使用 CustomInk 爬虫数据恢复商品（可选）

仓库里已有从 CustomInk 爬回来的数据，恢复时可以用它们替代 demo 数据，导入更多真实商品/变体/图片。

### 爬虫数据位置

| 位置 | 说明 |
|------|------|
| **customink-crawler/output_v2/** | CSV：`products.csv`（约 166 条）、`product_variants.csv`（约 1440 条）、`product_images.csv`（约 1152 条），供 `import_cink_v2.js` 使用 |
| **backend/data/scraped-products/** | JSON：`all-products.json` 及按 ID 的单个商品 JSON，为另一套爬虫产出 |

### 用爬虫数据跑恢复

在已有类目、并执行过 `clear_catalog` 的前提下，若希望用 **output_v2 的 CSV** 作为商品来源，可设置环境变量后执行恢复流水线：

```bash
export DATABASE_URL='你的连接串'
export RESTORE_ALLOW_PROD=1
export RESTORE_CONFIRM_TOKEN=core-catalog
export RESTORE_USE_CUSTOMINK=1
node backend/scripts/restore-core-config-and-catalog.js
```

- 当 `RESTORE_USE_CUSTOMINK=1` 且存在 `customink-crawler/output_v2/products.csv` 时，流水线会调用 **import_cink_v2.js**，导入 CSV 中的商品/变体/图片，并**不再**执行 `seed-full-test-data` 与 `seed-variants`。
- 不设置或设为 0 时，仍使用原来的 demo 数据（seed-full-test-data + seed-variants）。
- `import_cink_v2.js` 已改为使用当前库中 **t-shirts** 类目（按 slug 查找），无需旧 UUID。
