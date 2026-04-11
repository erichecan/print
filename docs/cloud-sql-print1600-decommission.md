# Cloud SQL print1600 下线记录

**操作日期**：2026-04-11  
**操作人**：erichecan@gmail.com  
**GCP 项目**：print-482914  

---

## 背景

生产环境（https://printngoplus.com）始终连接的是 **Neon PostgreSQL**，Cloud SQL 实例 `print1600` 是当时计划迁移时创建的，迁移未完成，实例一直处于运行状态持续产生费用（约 $4,379/月）。

本次操作目标：
1. 将 Cloud SQL 内的数据导出备份到 GCS
2. 建立 Neon 数据库的定时备份机制（替代 Neon 付费自动备份）
3. 从 Cloud Run 后端移除 Cloud SQL 依赖注解
4. 删除 Cloud SQL 实例，彻底停止计费

---

## 一、Cloud SQL 实例信息（已删除）

| 属性 | 值 |
|------|----|
| 实例 ID | `print1600` |
| 连接名称 | `print-482914:us-central1:print1600` |
| PostgreSQL 版本 | 18 |
| 规格 | `db-perf-optimized-N-8`（Enterprise Plus，8 vCPU / 64GB RAM） |
| 存储 | 100GB SSD |
| 区域 | us-central1-a |
| 公网 IP | 35.225.159.99（已释放） |
| 自动备份 | 关闭 |
| 月费用 | 约 $4,379/月（计算 ~$4,360 + 存储 ~$19） |

**Cloud SQL 内的数据库：**

| 数据库名 | 说明 |
|---------|------|
| `postgres` | 系统默认库，无业务数据 |
| `suvernireplus` | 迁移目标库（生产数据副本，迁移未完成） |
| `suvernireplus_dev` | 开发测试库 |

---

## 二、生产数据库确认（Neon）

删除 Cloud SQL 前，通过 GCP Secret Manager 和 Cloud Run 健康检查确认生产使用 Neon：

```bash
# 确认 SECRET 指向 Neon
gcloud secrets versions access latest --secret=database-url --project=print-482914
# 结果：ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb

# 健康检查确认数据库正常
curl https://printngoplus.com/api/health
# 结果：{"status":"ok","checks":{"database":"ok"}}
```

---

## 三、Neon 数据库备份机制（新建）

由于不使用 Neon 付费自动备份，自建以下备份方案：

### 备份架构

```
Cloud Scheduler (两个定时触发)
    ↓
Cloud Run Job: neon-daily-backup
    ↓
备份镜像: us-central1-docker.pkg.dev/print-482914/print-main/neon-backup:latest
    ↓
执行 pg_dump (postgresql-client-17，匹配 Neon 服务端 17.8)
    ↓
上传至 GCS: gs://print-482914-images/neon-backups/
```

### 备份时间

| 任务名 | 触发时间 | Cron 表达式 |
|--------|----------|------------|
| `daily-db-backup` | 美国纽约时间 12:00 PM | `0 17 * * *`（UTC） |
| `neon-backup-evening` | 美国纽约时间 7:00 PM | `0 0 * * *`（UTC，夏令时偏移） |

### 备份脚本

- 路径：`scripts/neon-backup.sh`
- 格式：`backup-YYYYMMDD-HHMMSS.dump`（pg_dump custom format）
- 保留策略：最近 30 天，自动清理超过 30 天的旧备份

### 备份镜像 Dockerfile

- 路径：`backup.Dockerfile`
- 基础镜像：`google/cloud-sdk:slim`
- 关键：通过 PGDG apt 源安装 `postgresql-client-17`，避免版本不匹配导致 pg_dump 失败

### 已验证备份文件

```
gs://print-482914-images/neon-backups/backup-20260411-020851.dump  (554KB)
```

---

## 四、Cloud SQL 数据导出备份

删除实例前，将所有业务数据库导出至 GCS 永久保存：

```bash
# 导出 suvernireplus
gcloud sql export sql print1600 \
  gs://print-482914-images/cloudsql-backups/suvernireplus-final-20260410.sql \
  --database=suvernireplus \
  --project=print-482914

# 导出 suvernireplus_dev
gcloud sql export sql print1600 \
  gs://print-482914-images/cloudsql-backups/suvernireplus_dev-final-20260410.sql \
  --database=suvernireplus_dev \
  --project=print-482914
```

**备份文件位置：**

| 文件 | GCS 路径 |
|------|---------|
| suvernireplus | `gs://print-482914-images/cloudsql-backups/suvernireplus-final-20260410.sql` |
| suvernireplus_dev | `gs://print-482914-images/cloudsql-backups/suvernireplus_dev-final-20260410.sql` |

如需还原，执行：

```bash
# 下载备份
gsutil cp gs://print-482914-images/cloudsql-backups/suvernireplus-final-20260410.sql ./

# 还原到 PostgreSQL
psql -h <host> -U <user> -d <dbname> -f suvernireplus-final-20260410.sql
```

---

## 五、移除 Cloud Run 后端 Cloud SQL 注解

Cloud Run 后端 `print-main-backend` 存在注解：

```
run.googleapis.com/cloudsql-instances: print-482914:us-central1:print1600
```

该注解会让每个容器实例启动 Cloud SQL Auth Proxy sidecar。虽然 `DATABASE_URL` 始终指向 Neon，sidecar 不实际传递数据，但删除 Cloud SQL 实例前必须先移除该注解，否则容器启动时 sidecar 连接失败可能造成延迟或错误。

```bash
gcloud run services update print-main-backend \
  --project=print-482914 \
  --region=us-central1 \
  --clear-cloudsql-instances
```

执行后新版本 `print-main-backend-00282-rl2` 部署完成，健康检查通过：

```json
{"status":"ok","checks":{"database":"ok"},"bootstrapping":false}
```

---

## 六、删除 Cloud SQL 实例

```bash
gcloud sql instances delete print1600 --project=print-482914 --quiet
# 输出：Deleted [https://sqladmin.googleapis.com/sql/v1beta4/projects/print-482914/instances/print1600]
```

删除时间：2026-04-11 UTC 02:30  
删除后生产健康状态：`{"status":"ok","database":"ok"}` — 生产完全不受影响。

---

## 七、费用影响

| 项目 | 操作前 | 操作后 |
|------|--------|--------|
| Cloud SQL `print1600` | ~$4,379/月 | $0（已删除） |
| Neon 备份（GCS 存储） | $0（无备份） | 约 $0.01/月（几百 KB/次） |
| **月节省** | | **约 $4,379** |

本月（4 月）账单：Cloud SQL 计费至 4 月 11 日，预计本月 Cloud SQL 费用约 $1,460。

---

## 八、当前生产架构（Cloud SQL 删除后）

```
用户请求
    ↓
Cloud Run: print-main-frontend (Next.js)
    ↓
Cloud Run: print-main-backend (Node.js)
    ↓
Neon PostgreSQL (ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb)
```

**备份路径：**

```
Cloud Scheduler (12:00 PM / 7:00 PM 纽约时间)
    ↓
Cloud Run Job: neon-daily-backup
    ↓
GCS: gs://print-482914-images/neon-backups/
```
