# GCP 免费部署检查清单

[2025-01-27] 逐步检查清单，确保部署后费用接近 $0

## ✅ 部署前检查

### 1. 费用预算和告警（必须！）

```bash
# 运行预算告警设置脚本
./scripts/setup-billing-alerts.sh

# 或手动设置：
# 1. 访问: https://console.cloud.google.com/billing/budgets
# 2. 创建预算：$5/月
# 3. 设置告警：50%, 90%, 100%
```

**重要性**: ⚠️⚠️⚠️ **这是防止意外费用的最重要措施！**

---

### 2. 数据库选择（关键成本因素）

#### ❌ 不要使用 Cloud SQL（会产生费用）

Cloud SQL 没有免费层，最便宜的实例也要 ~$7-10/月

#### ✅ 使用免费外部数据库（推荐）

**选项 A: Supabase（推荐）**
- ✅ 免费 500MB PostgreSQL 数据库
- ✅ 注册: https://supabase.com
- ✅ 获取连接字符串，保存到 Secret Manager

**选项 B: Neon**
- ✅ 免费 PostgreSQL 数据库
- ✅ 注册: https://neon.tech

**选项 C: Railway**
- ✅ 免费 $5 额度
- ✅ 注册: https://railway.app

**配置步骤：**
```bash
# 1. 注册并创建数据库
# 2. 获取连接字符串（格式：postgresql://user:pass@host:5432/dbname）
# 3. 保存到 Secret Manager
echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
```

---

### 3. Cloud Run 配置（确保使用免费层）

#### ✅ 必须使用以下配置：

```bash
# 后端
--min-instances 0      # ✅ 关键！缩放到零 = 免费
--max-instances 5      # ✅ 限制最大实例
--memory 512Mi         # ✅ 最小内存
--cpu 1                # ✅ 1 CPU

# 前端
--min-instances 0      # ✅ 关键！缩放到零 = 免费
--max-instances 5      # ✅ 限制最大实例
--memory 1Gi           # ✅ Next.js 最小需求
--cpu 1                # ✅ 1 CPU
```

#### ❌ 避免这些配置（会产生费用）：

```bash
--min-instances 1      # ❌ 持续运行 = $$$
--memory 2Gi+          # ❌ 超出需求 = 更多费用
--add-cloudsql-instances  # ❌ Cloud SQL = $$$
```

---

### 4. 使用免费部署脚本

```bash
# 使用优化后的免费部署脚本
./scripts/deploy-gcp-free.sh
```

这个脚本已经配置了所有免费选项。

---

## 📊 费用检查表

### 每月免费配额

| 服务 | 免费配额 | 超出后的费用 |
|------|---------|-------------|
| Cloud Run | 200万请求, 360K GB-秒, 180K vCPU-秒 | 非常便宜 |
| Artifact Registry | 0.5GB 存储 | ~$0.10/GB/月 |
| Secret Manager | 10,000 版本 | ~$0.06/版本 |
| Cloud Build | 120 分钟/天 | ~$0.003/分钟 |
| Cloud Logging | 50GB/月 | ~$0.50/GB |
| Cloud SQL | **0（无免费层）** | ~$7-10/月（最小实例） |

### 预期费用计算

**场景：每月 10,000 请求**

```
Cloud Run:
  - 请求：10,000 < 2,000,000 → FREE ✅
  - 实例时间：假设平均 2GB-秒/请求
  - 总使用：20,000 GB-秒 < 360,000 → FREE ✅
  - 费用：$0

Artifact Registry:
  - 镜像大小：~500MB < 0.5GB → FREE ✅
  - 费用：$0

Secret Manager:
  - 版本数：< 100 < 10,000 → FREE ✅
  - 费用：$0

Cloud Build:
  - 构建时间：~10分钟/构建 < 120分钟/天 → FREE ✅
  - 费用：$0

总计：$0/月 ✅
```

---

## 🔍 部署后验证

### 1. 验证 Cloud Run 配置

```bash
# 检查后端配置
gcloud run services describe print-main-backend \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# 应该显示：0（不是 1！）

# 检查前端配置
gcloud run services describe print-main-frontend \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# 应该显示：0
```

### 2. 测试缩放到零

```bash
# 1. 访问服务，确认可以正常运行
# 2. 等待 15 分钟（无请求）
# 3. 检查实例数量
gcloud run services describe print-main-backend \
  --region us-central1 \
  --format="value(status.url)"

# 4. 再次访问，应该会触发冷启动（2-5秒延迟）
# 这是正常的，表示正在使用免费层
```

### 3. 监控费用（第一个月）

```bash
# 每天检查费用
# 访问: https://console.cloud.google.com/billing

# 使用 gcloud 检查
gcloud billing accounts list
```

---

## 🆘 如果看到费用

### 立即检查清单：

1. **Cloud Run minScale = 0？**
   ```bash
   # 如果不是 0，立即修改
   gcloud run services update print-main-backend \
     --min-instances 0 \
     --region us-central1
   ```

2. **是否有 Cloud SQL 实例运行？**
   ```bash
   # 检查并停止
   gcloud sql instances list
   # 如果不需要，删除：
   gcloud sql instances delete INSTANCE_NAME
   ```

3. **Artifact Registry 存储是否超出？**
   ```bash
   # 清理旧镜像
   gcloud artifacts docker images list \
     REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/backend
   ```

4. **是否有其他服务在运行？**
   ```bash
   # 列出所有服务
   gcloud run services list --all-regions
   ```

---

## 📋 完整检查清单

### 部署前

- [ ] ✅ 已设置预算告警（$5/月）
- [ ] ✅ 已创建免费外部数据库（Supabase/Neon）
- [ ] ✅ 已配置数据库连接字符串到 Secret Manager
- [ ] ✅ 已确认不使用 Cloud SQL
- [ ] ✅ 已准备使用免费部署脚本

### 部署时

- [ ] ✅ 使用 `--min-instances 0`
- [ ] ✅ 使用最小内存配置（512Mi/1Gi）
- [ ] ✅ 不使用 `--add-cloudsql-instances`
- [ ] ✅ 限制最大实例数（--max-instances 5）

### 部署后

- [ ] ✅ 验证 minScale = 0
- [ ] ✅ 测试服务可以正常访问
- [ ] ✅ 验证服务可以缩放到零
- [ ] ✅ 检查第一天费用（应该接近 $0）
- [ ] ✅ 设置每日费用检查提醒

---

## 💡 省钱技巧

1. **使用 `minScale: 0`** - 这是最重要的！无请求时完全免费
2. **使用外部免费数据库** - 避免 Cloud SQL 费用
3. **限制日志保留** - 只保留 7 天
4. **定期清理 Artifact Registry** - 删除旧镜像
5. **监控费用** - 每天检查，设置告警

---

## 📚 相关文档

- [成本优化详细指南](./GCP-COST-OPTIMIZATION.md)
- [完整部署指南](./GCP-DEPLOYMENT.md)
- [GCP 免费层详情](https://cloud.google.com/free/docs/free-cloud-features)

---

**记住**: `minScale: 0` = 免费，`minScale: 1` = 费用！

---

**最后更新**: [2025-01-27]

