# Neon → Cloud SQL (print1600) 迁移检查清单

实例信息（你已提供）：

- **实例 ID**：print1600  
- **连接名称**：print-482914:us-central1:print1600  
- **项目**：print-482914，**区域**：us-central1  
- **公共 IP**：35.225.159.99，**端口**：5432  

---

## 还需要你准备的信息

| 需要 | 说明 | 如何获取 |
|------|------|----------|
| **1. Neon 连接串** | 当前生产库，用来导出 | 从 `backend/.env` 的 `DATABASE_URL` 复制，或：<br>`gcloud secrets versions access latest --secret=database-url --project=print-482914`（若当前 Secret 存的是 Neon） |
| **2. Cloud SQL 的 postgres 密码** | 创建实例时设的 root 密码 | 若忘记：在控制台「用户」里给 postgres 重置密码，或执行：<br>`gcloud sql users set-password postgres --instance=print1600 --project=print-482914 --prompt-for-password` |
| **3. 本机能否连上 Cloud SQL** | 从你电脑执行迁移 | **方式 A（推荐）**：本机安装并运行 Cloud SQL Auth Proxy，不开放公网 IP。<br>**方式 B**：用公共 IP 连接时，需在 Cloud SQL 控制台「连接」→「网络」里把**本机公网 IP** 加入「已授权的网络」。 |

---

## 迁移步骤（按顺序执行）

### 步骤 1：在 Cloud SQL 上创建数据库（若尚未创建）

```bash
cd /path/to/print-main
chmod +x scripts/prepare-cloudsql-for-migration.sh
GCP_PROJECT_ID=print-482914 CLOUD_SQL_INSTANCE=print1600 ./scripts/prepare-cloudsql-for-migration.sh
```

### 步骤 2：设置两个环境变量

**Neon（源）：**

```bash
# 从 .env 或 Secret 拿到当前 Neon 连接串
export NEON_DATABASE_URL='postgresql://用户:密码@ep-xxx.neon.tech/neondb?sslmode=require'
```

**Cloud SQL（目标）：**

- **若用 Auth Proxy**（先在本机执行：`cloud_sql_proxy -instances=print-482914:us-central1:print1600=tcp:5432`）：

  ```bash
  export CLOUD_SQL_DATABASE_URL='postgresql://postgres:你的Cloud_SQL密码@127.0.0.1:5432/suvernireplus'
  ```

- **若用公共 IP**（且本机 IP 已加入已授权网络）：

  ```bash
  export CLOUD_SQL_DATABASE_URL='postgresql://postgres:你的Cloud_SQL密码@35.225.159.99:5432/suvernireplus?sslmode=require'
  ```

### 步骤 3：执行迁移脚本

```bash
./scripts/migrate-neon-to-cloudsql.sh
```

脚本会：从 Neon 做 pg_dump → 用 pg_restore 导入 Cloud SQL → 在 Cloud SQL 上执行 `prisma migrate deploy`。确认提示时输入 `yes`。

### 步骤 4：迁移完成后（应用改用 Cloud SQL）

1. **创建应用用户（可选但推荐）**：用 postgres 登录 Cloud SQL 后创建 `app` 用户并授权，或：
   ```bash
   gcloud sql users create app --instance=print1600 --password=你设定的密码 --project=print-482914
   ```
2. **更新 Secret Manager**：把 `database-url` 改为 Cloud SQL 连接串。  
   - Cloud Run 用 Unix socket 时格式为：  
     `postgresql://app:密码@/suvernireplus?host=/cloudsql/print-482914:us-central1:print1600`  
   - **重要**：若密码含特殊字符（如 `@`、`#`、`$`、`|`、`+`），必须对密码做 **URL 编码** 再写入连接串，否则会被误解析导致连不上库。  
     例：密码为 `Yj+b|frS#8$qK@g8` 时，应写成  
     `postgresql://app:Yj%2Bb%7CfrS%238%24qK%40g8@/suvernireplus?host=/cloudsql/print-482914:us-central1:print1600`  
     （`+`→`%2B`，`|`→`%7C`，`#`→`%23`，`$`→`%24`，`@`→`%40`）  
   - 若仍出现 503/500 且健康检查里 database 为 disconnected，请用**已编码**的密码更新 Secret 并重新部署后端。**一键执行**（将密码换成你的 app 密码）：  
     `APP_DB_PASSWORD='你的app密码' ./scripts/update-database-url-secret-and-deploy-backend.sh`  
     该脚本会：对密码做 URL 编码 → 更新 `database-url` 新版本 → 仅部署后端（使用完整 `--set-secrets`，无占位符）。
3. **部署配置**：你的实例是 **print1600**。部署时需指定该实例：  
   - Cloud Build：触发器里增加 substitution `_DB_INSTANCE_NAME=print1600`，或提交前在 `cloudbuild.yaml` 的 `substitutions` 里把 `_DB_INSTANCE_NAME` 改为 `print1600`。  
   - 本地部署：`DB_INSTANCE_NAME=print1600 ./scripts/deploy-gcp.sh`。  
   然后重新部署后端。

---

## 修复 500：为 app 用户授予表权限

迁移后若接口返回 500（如 /api/categories、/api/testimonials/active），多半是 **app** 用户没有表权限。以 **postgres** 执行以下 SQL 即可（任选一种方式）：

**方式一：本机终端用 postgres 连接（推荐，避免 Cloud Studio 用错用户）**

在**本机**执行（会提示输入 postgres 密码），连接成功后在 `psql` 里粘贴下面的 SQL 并回车：

```bash
gcloud sql connect print1600 --user=postgres --database=suvernireplus --project=print-482914
# 输入 postgres 的密码后，在 psql 提示符下粘贴并执行：
```

```sql
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
```

**方式二：GCP 控制台（必须用 postgres，不能用 IAM）**

1. 打开 [Cloud SQL](https://console.cloud.google.com/sql/instances) → 实例 **print1600**。
2. 左侧点 **Cloud SQL Studio**（或「连接」→ 使用 Cloud SQL Studio）。
3. 连接时务必选 **「内置数据库身份验证」**，用户名 **postgres**，密码填你为 postgres 设置的密码；**不要选 Cloud IAM**，否则当前用户不是 postgres，会报 `permission denied for table SequelizeMeta`。
4. 数据库选 **suvernireplus**，在查询窗口执行上面同一段 SQL。

**方式三：本机已开 Auth Proxy**

```bash
CLOUD_SQL_POSTGRES_PASSWORD='postgres的密码' ./scripts/run-grant-app-permissions.sh
```

---

## 小结：你还缺什么

- **NEON_DATABASE_URL**：从现有 .env 或 Secret 复制。  
- **Cloud SQL 的 postgres 密码**：创建实例时设的，忘了就按上面重置。  
- **连接方式**：二选一——用 Auth Proxy（推荐），或公共 IP + 本机 IP 加入已授权网络。  

有这三项后，按步骤 1～3 执行即可完成自动迁移。
