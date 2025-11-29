# 快速修复 Admin 用户

**更新时间**: 2025-11-28 12:45:00

---

## 问题

Admin 登录时显示 "Invalid email or password"，原因是：
1. Admin 用户不存在（seed 未运行或失败）
2. 迁移失败导致 seed 未执行

---

## 快速修复方法

### 方法 1: 通过 Cloud Run 执行脚本（推荐）

```bash
# 在 Cloud Run 服务上执行创建 admin 用户的脚本
gcloud run services update print-main-backend \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --exec-command="node" \
  --exec-args="scripts/create-admin-user.js"
```

### 方法 2: 使用 Cloud Run Jobs（更可靠）

```bash
# 创建一个临时 Job 来执行脚本
gcloud run jobs create create-admin-user \
  --image=us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6 \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --set-env-vars="NODE_ENV=production" \
  --command="node" \
  --args="scripts/create-admin-user.js" \
  --max-retries=0 \
  --task-timeout=300

# 执行 Job
gcloud run jobs execute create-admin-user \
  --region=us-central1 \
  --project=moonlit-gamma-479502-r6

# 查看日志
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=create-admin-user" \
  --limit=50 \
  --project=moonlit-gamma-479502-r6 \
  --format=json
```

### 方法 3: 通过 Cloud SQL Proxy 直接连接数据库

如果需要直接操作数据库，可以使用 Cloud SQL Proxy。

---

## Admin 用户信息

创建后的用户信息：
- **邮箱**: `admin@suvernireplus.com`
- **密码**: `admin123`
- **角色**: `ADMIN`

---

## 验证修复

修复后，访问登录页面测试：
```
https://print-main-frontend-hsbqzlnkxa-uc.a.run.app/admin/login
```

使用以上凭据登录。

