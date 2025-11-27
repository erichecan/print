# 部署问题分析和修复方案

[2025-01-27] 完整的问题分析和解决方案文档

## 📋 问题总结

### 问题 1: 前端连接 localhost:3001 ❌

**错误信息：**
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3001/api/products/filters/options
```

**原因：**
- `NEXT_PUBLIC_API_URL` 环境变量需要在**构建时**传入（Next.js 的 `NEXT_PUBLIC_*` 变量是在构建时注入的）
- 前端镜像在构建时没有传入正确的 API URL，所以使用了默认值 `localhost:3001`

**修复方案：** ✅ 已完成
1. 修改了 `apps/web/Dockerfile`，添加了 `ARG NEXT_PUBLIC_API_URL` 支持构建参数
2. 修改了 `cloudbuild.yaml`，在构建前端时传入正确的 API URL
3. 正在重新构建前端镜像

**下一步：**
- 等待前端构建完成（Cloud Build 正在运行中）
- 构建完成后前端会自动部署

---

### 问题 2: 免费策略配置 ✅

**状态：** ✅ 已正确配置

**验证：**
```bash
# 后端
min-instances=0  # ✅ 已设置
max-instances=5

# 前端
min-instances=0  # ✅ 已设置
max-instances=5
```

**说明：**
- `minScale: 0` 表示服务在无请求时自动停止，**完全免费**
- 只有有请求时才会启动，首次请求可能有 2-5 秒的冷启动延迟
- 每月免费额度：200万请求

---

### 问题 3: 费用告警设置 ⚠️

**状态：** ⚠️ 需要手动设置

**已完成：**
- ✅ Billing Budget API 已启用
- ✅ 脚本已准备（`scripts/setup-billing-alerts.sh`）

**需要手动操作：**
1. 访问：https://console.cloud.google.com/billing/budgets
2. 点击"创建预算"
3. 配置：
   - 预算金额：$5 USD/月
   - 通知阈值：50%, 90%, 100%
   - 项目筛选：`moonlit-gamma-479502-r6`
   - 通知邮箱：你的 Gmail 地址

**或者使用命令行（如果权限足够）：**
```bash
cd /Users/eric/Desktop/print-main
./scripts/setup-billing-alerts.sh
```

---

### 问题 4: 数据库迁移和数据 ⚠️

**状态：** ⚠️ 需要检查和执行

**当前配置：**
- 数据库：Neon PostgreSQL（免费层）
- 连接：已配置在 Secret Manager
- 迁移：后端代码支持自动迁移（需要设置环境变量）

**需要执行的步骤：**

1. **启用自动迁移**（推荐）：
   ```bash
   gcloud run services update print-main-backend \
     --region=us-central1 \
     --update-env-vars AUTO_MIGRATE=true \
     --project=moonlit-gamma-479502-r6
   ```
   这会自动重启后端，并在启动时运行数据库迁移

2. **或手动运行迁移**：
   ```bash
   # 连接到后端服务并运行迁移
   gcloud run jobs create db-migrate \
     --image=us-central1-docker.pkg.dev/moonlit-gamma-479502-r6/print-main/backend:latest \
     --region=us-central1 \
     --set-env-vars DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url) \
     --command="node" \
     --args="scripts/run-migrations.js" \
     --project=moonlit-gamma-479502-r6
   ```

3. **检查数据库连接**：
   - 后端日志中应该显示数据库连接状态
   - 如果连接失败，检查 Secret Manager 中的 `database-url`

4. **添加初始数据**（如果需要）：
   - 如果有种子数据脚本，可以手动运行

---

## 🎯 立即需要执行的步骤

### 1. 等待前端重新构建完成 ✅（进行中）

当前 Cloud Build 正在重新构建前端镜像（包含正确的 API URL）。

**检查构建状态：**
```bash
gcloud builds list --project=moonlit-gamma-479502-r6 --limit=1
```

### 2. 设置费用告警 ⚠️（手动）

访问：https://console.cloud.google.com/billing/budgets

### 3. 运行数据库迁移 ⚠️（重要）

```bash
# 启用自动迁移
gcloud run services update print-main-backend \
  --region=us-central1 \
  --update-env-vars AUTO_MIGRATE=true \
  --project=moonlit-gamma-479502-r6
```

### 4. 验证部署 ✅

等待前端构建完成后，访问：
- 前端：https://print-main-frontend-234065158862.us-central1.run.app
- 后端：https://print-main-backend-234065158862.us-central1.run.app/api

---

## 💰 费用说明

### 当前配置（完全免费）

1. **Cloud Run**：
   - `minScale: 0` = 无请求时不收费
   - 每月免费 200万请求
   - 免费 360,000 vCPU 秒
   - 免费 180,000 GiB 秒内存

2. **Artifact Registry**：
   - 存储 < 0.5GB = 免费

3. **Secret Manager**：
   - < 10,000 版本 = 免费

4. **Cloud Build**：
   - 每天 120 分钟构建时间 = 免费

5. **数据库**：
   - Neon 免费层（500MB 存储）

### 预期费用：$0/月 ✅

---

## 🔍 故障排查

### 如果前端仍然连接 localhost:3001

1. 检查构建日志，确认 `NEXT_PUBLIC_API_URL` 是否正确传入
2. 检查前端服务环境变量：
   ```bash
   gcloud run services describe print-main-frontend \
     --region=us-central1 \
     --format="get(spec.template.spec.containers[0].env)" \
     --project=moonlit-gamma-479502-r6
   ```
3. 可能需要清除浏览器缓存

### 如果 API 请求返回 404

1. 检查后端服务是否正常运行
2. 检查数据库迁移是否已运行
3. 查看后端日志：
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-backend" \
     --limit=50 \
     --project=moonlit-gamma-479502-r6
   ```

### 如果数据库连接失败

1. 检查 Secret Manager 中的 `database-url` 是否正确
2. 测试数据库连接：
   ```bash
   DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url --project=moonlit-gamma-479502-r6)
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

---

## 📝 后续优化建议

1. **使用 Cloud Build Triggers**：当代码推送到 GitHub 时自动构建和部署
2. **设置自定义域名**：为前后端服务配置自定义域名
3. **添加监控和告警**：使用 Cloud Monitoring 监控服务健康状态
4. **定期备份数据库**：虽然 Neon 免费层有备份，但建议定期导出数据

---

**最后更新：** 2025-01-27

