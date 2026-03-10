# 数据库备份与恢复（Cloud SQL + GCS）

本文描述生产环境使用 **Cloud SQL for PostgreSQL** 时的每日快照策略、冷备份与恢复流程。  
**部署前请确认 GCP 项目 ID**（如 `GCP_PROJECT_ID` / Cloud Build 的 `PROJECT_ID`），避免部署到错误项目。

---

## 1. 备份策略概览

| 项目 | 说明 |
|------|------|
| 备份内容 | 全库逻辑快照（SQL 导出，与 pg_dump 等价） |
| 触发 | 每日 02:00 UTC，由 Cloud Scheduler 调用 Cloud Function |
| 执行 | Cloud Function 调用 Cloud SQL Admin API 导出到 GCS |
| 路径 | `gs://{PROJECT_ID}-db-backups/daily/YYYYMMDD.sql.gz` |
| 30 天内 | 对象保留在桶内，视为「热」快照，便于随时恢复 |
| 30 天后 | GCS 生命周期将对象转为 **Coldline**，长期冷备份 |
| 可选 | 365 天后删除，控制成本（见 `scripts/setup-gcp-resources.sh` 生命周期） |

---

## 2. 前置条件与权限

- 已创建 **Cloud SQL** 实例与数据库，且 **Secret Manager** 中 `database-url` 为 Cloud SQL Unix socket 格式：
  - `postgresql://APP_USER:PASSWORD@/suvernireplus?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- 已创建备份桶（如 `scripts/setup-gcp-resources.sh` 中的 `{PROJECT_ID}-db-backups`）并配置生命周期。
- Cloud Function `db-export` 运行身份（默认 compute SA）需具备：
  - Cloud SQL 实例的 **导出** 权限（如 `roles/cloudsql.admin` 或仅导出权限）
  - 备份桶的 **写** 权限（如 `roles/storage.objectAdmin` 或 `objectCreator`）

---

## 3. 部署每日备份（一次性）

```bash
# 确认项目 ID
export GCP_PROJECT_ID=your-project-id

# 创建桶与生命周期（若尚未执行）
./scripts/setup-gcp-resources.sh

# 部署 Cloud Function + Cloud Scheduler
./scripts/setup-db-backup-scheduler.sh
```

完成后，每日 02:00 UTC 会自动导出到 `gs://{PROJECT_ID}-db-backups/daily/YYYYMMDD.sql.gz`。

---

## 4. 恢复流程

### 4.1 从 GCS 快照恢复到 Cloud SQL（同实例或新实例）

1. 在 GCS 中找到目标日期文件，例如：
   - `gs://{PROJECT_ID}-db-backups/daily/20260305.sql.gz`

2. 使用 Cloud SQL 导入（推荐，无需本机 pg 客户端）：

   ```bash
   gcloud sql import sql INSTANCE_NAME gs://BUCKET/daily/YYYYMMDD.sql.gz \
     --database=suvernireplus \
     --project=PROJECT_ID
   ```

   若需先恢复到**新库**再切换，可在实例上新建数据库后指定 `--database=新库名`。

3. 或下载到本机后用 `psql`/`pg_restore`（若为 .sql.gz，先解压后 `psql ... -f file.sql`）：

   ```bash
   gsutil cp gs://BUCKET/daily/YYYYMMDD.sql.gz .
   gunzip -c YYYYMMDD.sql.gz | psql "$DATABASE_URL" -f -
   ```

### 4.2 30 天后的冷备份（Coldline）

对象仍在同一路径下，仅存储类别变为 Coldline。恢复方式同上，读取时可能略慢，无需改命令。

---

## 5. 本地/临时备份（可选）

保留的 `scripts/db-backup.sh` 可用于从**当前配置的数据库**（如通过 Cloud SQL Auth Proxy 连到本机）做本地 pg_dump，或紧急拉取一份到本机：

```bash
# 本机需能访问 DB（例如 Cloud SQL Auth Proxy 监听 5432）
export DATABASE_URL='postgresql://app:PASSWORD@127.0.0.1:5432/suvernireplus'
./scripts/db-backup.sh ./backups
```

生产环境的**每日自动化快照**以 GCS + 生命周期为准，不依赖该脚本的 7 份本地保留逻辑。

---

## 6. 部署前确认项目 ID

所有 GCP 资源（Cloud SQL、GCS、Secret Manager、Cloud Run、Cloud Function、Cloud Scheduler）必须使用**同一项目 ID**。部署前请：

- 设置并确认：`echo $GCP_PROJECT_ID` 或 `gcloud config get-value project`
- Cloud Build 触发器或 `gcloud builds submit` 使用正确的 `PROJECT_ID` substitution
- 在 `cloudbuild.yaml` 的 substitutions 中如需覆盖 `_DB_INSTANCE_NAME`，与当前项目中的 Cloud SQL 实例名一致

避免将生产部署到错误项目导致无法连接数据库或备份写入错误桶。
