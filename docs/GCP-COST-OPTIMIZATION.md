# GCP 成本优化指南 - 免费/低成本部署

[2025-01-27] 本指南帮助您在 GCP 上以最低成本或免费方式部署应用。

## ⚠️ 重要：避免意外费用的关键措施

### 1. 启用费用预算和告警

**必须立即配置！** 这是防止意外费用的第一道防线：

```bash
# 设置每月预算上限（例如 $5）
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Print Main Budget" \
  --budget-amount=5USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --all-updates-rule-pubsub-topic=projects/YOUR_PROJECT/topics/billing-alerts
```

### 2. 使用免费试用账户（新用户）

- GCP 新用户可获得 **$300 免费试用额度**，有效期 90 天
- 在此期间所有服务都可以使用

### 3. 始终免费的服务和配额

以下服务有永久免费层：

| 服务 | 免费配额 |
|------|---------|
| Cloud Run | 每月 200 万次请求，前 360,000 GB-秒，前 180,000 vCPU-秒 |
| Artifact Registry | 前 0.5 GB 存储免费 |
| Secret Manager | 前 10,000 个 secret 版本免费 |
| Cloud Build | 每天 120 构建分钟数免费 |
| Cloud Logging | 前 50 GB 日志免费 |
| Cloud Monitoring | 前 150 MB 指标数据免费 |

---

## 💰 成本优化配置

### 1. Cloud Run 配置优化

#### ❌ 避免的配置（会产生持续费用）

```yaml
# 不要这样做！
annotations:
  autoscaling.knative.dev/minScale: "1"  # ❌ 会导致持续运行费用
```

#### ✅ 免费/低成本配置

```yaml
# 推荐配置
annotations:
  autoscaling.knative.dev/minScale: "0"  # ✅ 无请求时缩放到零
  autoscaling.knative.dev/maxScale: "5"  # ✅ 限制最大实例数
  run.googleapis.com/memory: "512Mi"     # ✅ 使用最小内存
  run.googleapis.com/cpu: "1"            # ✅ 使用 1 CPU
```

**关键点：**
- `minScale: "0"` = 无请求时完全停止，**零费用**
- 首次请求会有冷启动（2-5秒），但完全免费
- 每月 200 万次请求以内完全免费

### 2. Cloud SQL 成本优化

#### ⚠️ Cloud SQL 没有免费层！

Cloud SQL 是最容易产生费用的服务。建议：

#### 选项 A：使用外部数据库（推荐，完全免费）

```bash
# 使用免费的 PostgreSQL 托管服务：
# - Supabase (免费 500MB 数据库)
# - Railway (免费 $5 额度)
# - Neon (免费层)
# - ElephantSQL (免费 20MB)

# 然后只需配置 DATABASE_URL 环境变量
```

#### 选项 B：使用 Cloud SQL 最小实例（仍有费用）

```bash
# 如果必须使用 Cloud SQL，使用最小配置：
# - 实例类型: db-f1-micro (共享 CPU，512MB RAM)
# - 区域: us-central1 (最便宜区域)
# - 存储: 10GB (最小)
# 预计费用: ~$7-10/月
```

#### 选项 C：使用 Cloud Build 临时连接（仅迁移时）

```bash
# 只在部署时连接外部数据库，平时不使用 Cloud SQL
# 费用: $0
```

### 3. 资源配置优化

#### 后端 (Backend) - 最低配置

```yaml
resources:
  limits:
    cpu: "1000m"      # 1 CPU
    memory: "512Mi"   # 最小内存（如果应用支持）
    # 或 "1Gi" 如果 512Mi 不够
```

#### 前端 (Frontend) - 最低配置

```yaml
resources:
  limits:
    cpu: "1000m"
    memory: "1Gi"     # Next.js 需要至少 1GB
```

### 4. 禁用不必要的服务

```bash
# 不要启用这些（除非真的需要）：
# - Cloud CDN（除非有高流量）
# - Cloud Load Balancing（Cloud Run 自带）
# - Cloud Armor（除非有安全需求）
# - Cloud Monitoring 高级功能
```

### 5. 日志和监控优化

```bash
# 限制日志保留期
gcloud logging sinks create \
  --log-filter="resource.type=cloud_run_revision" \
  --destination=storage.googleapis.com/YOUR_BUCKET \
  --retention=7d  # 只保留 7 天

# 或完全禁用日志导出（使用免费层）
# 免费层: 50GB/月，足够小项目使用
```

---

## 📊 预期成本（优化后）

### 场景 1：完全免费部署（推荐）

```
Cloud Run: $0（< 200 万请求/月）
Artifact Registry: $0（< 0.5GB）
Secret Manager: $0（< 10,000 版本）
Cloud Build: $0（< 120 分钟/天）
外部数据库 (Supabase/Neon): $0
日志和监控: $0（< 50GB/月）

总计: $0/月 ✅
```

### 场景 2：最小费用部署

```
Cloud Run: $0
Artifact Registry: $0
Secret Manager: $0
Cloud SQL (最小实例): ~$8/月
日志和监控: $0

总计: ~$8/月
```

### 场景 3：之前可能的费用来源

```
❌ minScale: "1" → 持续运行 → ~$25-50/月
❌ Cloud SQL 标准实例 → ~$50-100/月
❌ 高内存配置 (2GB+) → 额外 CPU/内存费用
❌ 未设置预算告警 → 意外费用累积
❌ 启用了不必要的服务 → 额外费用

总计: $100+/月 ❌
```

---

## 🚀 免费部署配置步骤

### 1. 使用免费外部数据库

```bash
# 推荐: Supabase (PostgreSQL，免费 500MB)
# 1. 注册 https://supabase.com
# 2. 创建新项目
# 3. 获取连接字符串（格式：postgresql://...）
# 4. 保存为 Secret Manager secret
```

### 2. 部署到 Cloud Run（免费配置）

我已经更新了配置文件，使用以下设置：

- ✅ `minScale: "0"` - 无请求时缩放到零
- ✅ 最小内存和 CPU 配置
- ✅ 合理的超时设置

### 3. 监控费用

```bash
# 查看当前费用
gcloud billing accounts list
gcloud billing projects describe YOUR_PROJECT_ID

# 设置每日费用提醒
gcloud alpha billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Daily Alert" \
  --budget-amount=1USD \
  --threshold-rule=percent=100 \
  --calendar-period=day
```

---

## ⚙️ 更新后的配置文件

我已经创建了成本优化版本的配置文件：

1. `cloudbuild-free.yaml` - 免费构建配置
2. `backend/cloud-run-free.yaml` - 免费后端配置
3. `apps/web/cloud-run-free.yaml` - 免费前端配置

这些配置使用：
- ✅ `minScale: "0"` - 完全免费
- ✅ 最小资源限制
- ✅ 不依赖 Cloud SQL
- ✅ 优化的构建配置

---

## 📝 成本检查清单

部署前检查：

- [ ] ✅ 已设置预算告警（$5-10/月上限）
- [ ] ✅ Cloud Run 使用 `minScale: "0"`
- [ ] ✅ 使用免费外部数据库（Supabase/Neon）
- [ ] ✅ 不使用 Cloud SQL（或使用最小实例）
- [ ] ✅ 资源限制设置为最小值
- [ ] ✅ 已禁用不必要的服务
- [ ] ✅ 日志保留期设置为 7 天或更短
- [ ] ✅ 启用了费用预算通知

部署后检查：

- [ ] ✅ 验证 Cloud Run 实例可以缩放到零
- [ ] ✅ 检查第一个月的费用（应该接近 $0）
- [ ] ✅ 设置成本异常告警
- [ ] ✅ 定期检查 GCP Console 的费用报告

---

## 🆘 如果看到意外费用

### 立即检查：

```bash
# 1. 查看当前费用
gcloud billing accounts list
gcloud billing projects describe YOUR_PROJECT_ID

# 2. 查看哪些服务产生费用
# 访问: https://console.cloud.google.com/billing

# 3. 检查 Cloud Run 实例状态
gcloud run services list --region=us-central1

# 4. 检查是否有持续运行的实例
gcloud run services describe SERVICE_NAME --region=us-central1 \
  --format="value(status.conditions)"
```

### 常见费用来源：

1. **Cloud SQL 持续运行** → 停止或删除实例
2. **Cloud Run minScale > 0** → 改为 0
3. **存储空间超出免费层** → 清理 Artifact Registry
4. **构建时间超过免费配额** → 优化构建流程
5. **网络出口费用** → 检查数据出口量

---

## 📚 相关资源

- [GCP 免费层详情](https://cloud.google.com/free/docs/free-cloud-features)
- [Cloud Run 定价](https://cloud.google.com/run/pricing)
- [Cloud SQL 定价](https://cloud.google.com/sql/pricing)
- [免费试用](https://cloud.google.com/free)

---

**重要提醒**: 定期检查 GCP Console 的费用报告，设置预算告警，这是避免意外费用的最有效方法！

---

**最后更新**: [2025-01-27]

