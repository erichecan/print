# GCP 免费部署关键要点总结

这是避免 GCP 意外费用的完整检查清单

---

## ⚠️⚠️⚠️ 最关键的 3 个要点

### 1. ✅ 必须设置费用预算告警

**这是最重要的！如果只做一件事，就做这个！**

```bash
# 运行脚本自动设置
./scripts/setup-billing-alerts.sh

# 或者访问控制台手动设置
# https://console.cloud.google.com/billing/budgets
# 预算金额：$5/月
# 告警阈值：50%, 90%, 100%
```

**为什么重要：**
- 可以在费用超标前收到通知
- 可以自动停止服务
- 是防止意外费用的最后防线

---

### 2. ✅ 必须使用 `minScale: 0`

**这是免费的关键配置！**

```bash
# ✅ 正确（免费）
--min-instances 0

# ❌ 错误（会产生费用）
--min-instances 1    # 这会导致持续运行，约 $25-50/月
```

**费用对比：**
- `minScale: 0` → 无请求时完全停止 → **$0/月** ✅
- `minScale: 1` → 24/7 持续运行 → **~$25-50/月** ❌

**已更新的配置文件：**
- ✅ `scripts/deploy-gcp.sh` - 默认使用 `min-instances 0`
- ✅ `scripts/deploy-gcp-free.sh` - 免费部署脚本
- ✅ `backend/cloud-run.yaml` - 默认 `minScale: "0"`
- ✅ `apps/web/cloud-run.yaml` - 默认 `minScale: "0"`
- ✅ `cloudbuild.yaml` - 部署时使用 `--min-instances 0`

---

### 3. ✅ 不要使用 Cloud SQL（使用外部免费数据库）

**Cloud SQL 没有免费层，最便宜的也要 ~$7-10/月！**

**推荐替代方案：**

| 服务 | 免费配额 | 注册链接 |
|------|---------|---------|
| **Supabase** | 500MB PostgreSQL | https://supabase.com |
| **Neon** | 免费 PostgreSQL | https://neon.tech |
| **Railway** | $5 免费额度 | https://railway.app |
| **ElephantSQL** | 20MB PostgreSQL | https://www.elephantsql.com |

**配置步骤：**
1. 注册并创建数据库
2. 获取连接字符串（格式：`postgresql://user:pass@host:5432/dbname`）
3. 保存到 Secret Manager：
   ```bash
   echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
   ```

**已更新的配置：**
- ✅ `cloudbuild.yaml` - 移除了 Cloud SQL 连接
- ✅ `scripts/deploy-gcp-free.sh` - 不使用 Cloud SQL
- ✅ `backend/cloud-run.yaml` - 移除了 Cloud SQL 配置

---

## 💰 费用对比表

| 配置项 | ❌ 之前的配置 | ✅ 现在的配置 | 费用差异 |
|--------|--------------|--------------|---------|
| **Cloud Run minScale** | `1` (持续运行) | `0` (缩放到零) | **节省 ~$25-50/月** |
| **数据库** | Cloud SQL (~$8/月) | 外部免费数据库 | **节省 ~$8/月** |
| **后端内存** | 1Gi | 512Mi | 节省少量费用 |
| **前端内存** | 2Gi | 1Gi | 节省少量费用 |
| **最大实例数** | 10 | 5 | 降低峰值费用 |

**之前总计：~$33-58/月**  
**现在总计：$0/月**（如果 < 200万请求/月）  
**节省：~$33-58/月**

---

## 📋 完整的费用检查清单

### 部署前必须检查

- [ ] ✅ **已设置费用预算告警**（$5/月上限）
  ```bash
  ./scripts/setup-billing-alerts.sh
  ```

- [ ] ✅ **已创建免费外部数据库**（Supabase/Neon）
  - 不要创建 Cloud SQL 实例
  - 使用外部免费 PostgreSQL 服务

- [ ] ✅ **已配置数据库连接字符串到 Secret Manager**
  ```bash
  echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
  ```

- [ ] ✅ **将使用免费部署脚本**
  ```bash
  ./scripts/deploy-gcp-free.sh
  ```

### 部署时检查

- [ ] ✅ **Cloud Run 使用 `--min-instances 0`**
  ```bash
  # 检查部署命令中是否有
  --min-instances 0    # ✅ 正确
  --min-instances 1    # ❌ 错误
  ```

- [ ] ✅ **不使用 `--add-cloudsql-instances`**
  ```bash
  # 检查部署命令，不应该有：
  --add-cloudsql-instances ...    # ❌ 不要使用
  ```

- [ ] ✅ **使用最小内存配置**
  ```bash
  --memory 512Mi    # ✅ 后端（最小）
  --memory 1Gi      # ✅ 前端（Next.js 最小需求）
  ```

- [ ] ✅ **限制最大实例数**
  ```bash
  --max-instances 5    # ✅ 限制峰值
  ```

### 部署后验证

- [ ] ✅ **验证 minScale = 0**
  ```bash
  gcloud run services describe print-main-backend \
    --region us-central1 \
    --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"
  # 应该显示：0
  ```

- [ ] ✅ **检查费用报告**
  - 访问：https://console.cloud.google.com/billing
  - 第一个月应该接近 $0

- [ ] ✅ **验证服务可以缩放到零**
  - 访问服务确认可以正常运行
  - 等待 15 分钟（无请求）
  - 再次访问，应该有冷启动延迟（2-5秒）
  - 这是正常的，表示正在使用免费层

- [ ] ✅ **确认没有 Cloud SQL 实例**
  ```bash
  gcloud sql instances list
  # 应该显示：Listed 0 items
  ```

---

## 🔍 常见费用来源检查

### 1. Cloud Run 持续运行费用

**症状：** 即使没有请求，实例仍在运行

**检查：**
```bash
gcloud run services describe SERVICE_NAME \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"
```

**修复：**
```bash
gcloud run services update SERVICE_NAME \
  --min-instances 0 \
  --region us-central1
```

---

### 2. Cloud SQL 费用

**症状：** 看到数据库服务费用

**检查：**
```bash
gcloud sql instances list
```

**修复：**
```bash
# 如果不需要，删除实例
gcloud sql instances delete INSTANCE_NAME

# 注意：这会永久删除数据！确保已备份
```

---

### 3. Artifact Registry 存储费用

**症状：** 存储超出免费层（> 0.5GB）

**检查：**
```bash
gcloud artifacts docker images list \
  REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/backend
```

**修复：**
```bash
# 删除旧镜像
gcloud artifacts docker images delete \
  REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/backend:OLD_TAG
```

---

### 4. Cloud Build 超出免费配额

**症状：** 构建时间超过 120 分钟/天

**检查：**
- 访问：https://console.cloud.google.com/cloud-build/builds

**修复：**
- 优化 Dockerfile 构建速度
- 使用缓存
- 减少构建频率

---

## 📊 预期费用计算示例

### 场景：小流量网站（每月 10,000 请求）

```
Cloud Run:
  - 请求数：10,000 < 2,000,000 → FREE ✅
  - 实例时间：~20,000 GB-秒 < 360,000 → FREE ✅
  - 费用：$0

Artifact Registry:
  - 存储：~500MB < 0.5GB → FREE ✅
  - 费用：$0

Secret Manager:
  - 版本：< 100 < 10,000 → FREE ✅
  - 费用：$0

外部数据库 (Supabase):
  - 免费层 → FREE ✅
  - 费用：$0

总计：$0/月 ✅
```

### 场景：中等流量（每月 100,000 请求）

```
Cloud Run:
  - 请求数：100,000 < 2,000,000 → FREE ✅
  - 实例时间：~200,000 GB-秒 < 360,000 → FREE ✅
  - 费用：$0

其他服务：同样免费

总计：$0/月 ✅
```

---

## 🎯 所有配置文件已更新

### 已优化的文件：

1. ✅ `scripts/deploy-gcp.sh` - 默认使用免费配置
2. ✅ `scripts/deploy-gcp-free.sh` - 专用免费部署脚本
3. ✅ `scripts/setup-billing-alerts.sh` - 自动设置预算告警
4. ✅ `backend/cloud-run.yaml` - `minScale: "0"`，移除 Cloud SQL
5. ✅ `apps/web/cloud-run.yaml` - `minScale: "0"`，最小内存
6. ✅ `cloudbuild.yaml` - 免费构建和部署配置

### 新增文档：

1. ✅ `docs/GCP-COST-OPTIMIZATION.md` - 详细成本优化指南
2. ✅ `docs/GCP-FREE-DEPLOYMENT-CHECKLIST.md` - 部署检查清单
3. ✅ `README-GCP-FREE.md` - 快速开始指南
4. ✅ `GCP-FREE-DEPLOYMENT-KEY-POINTS.md` - 本文档（关键要点总结）

---

## ⚠️ 重要提醒

1. **部署前必须设置预算告警** - 这是最重要的！
2. **使用 `minScale: 0`** - 这是免费的关键
3. **不要使用 Cloud SQL** - 使用外部免费数据库
4. **部署后立即检查费用** - 确认接近 $0
5. **定期检查费用报告** - 每周至少一次

---

## 🆘 如果仍然看到费用

### 立即执行：

```bash
# 1. 检查所有 Cloud Run 服务的 minScale
gcloud run services list --format="table(metadata.name,status.url,spec.template.metadata.annotations.autoscaling\.knative\.dev/minScale)"

# 2. 检查是否有 Cloud SQL 实例
gcloud sql instances list

# 3. 检查费用详情
# 访问：https://console.cloud.google.com/billing

# 4. 查看详细的费用报告
# 访问：https://console.cloud.google.com/billing/reports
```

### 快速修复：

```bash
# 如果 minScale 不是 0，立即修改
gcloud run services update print-main-backend \
  --min-instances 0 \
  --region us-central1

gcloud run services update print-main-frontend \
  --min-instances 0 \
  --region us-central1
```

---

## 📚 相关文档

- [免费部署快速指南](./README-GCP-FREE.md)
- [详细成本优化指南](./docs/GCP-COST-OPTIMIZATION.md)
- [部署检查清单](./docs/GCP-FREE-DEPLOYMENT-CHECKLIST.md)
- [完整部署指南](./docs/GCP-DEPLOYMENT.md)

---

**记住：`minScale: 0` + 外部免费数据库 + 预算告警 = 安全的免费部署！**

---

**最后更新**: 

