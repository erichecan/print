# GCP 免费部署快速指南

[2025-01-27] 专注于零成本部署的快速参考

## ⚠️ 最重要的 3 个要点

### 1. ✅ 设置费用预算告警（必须！）

**这是防止意外费用的最重要措施！**

```bash
# 运行预算告警脚本
./scripts/setup-billing-alerts.sh

# 或访问：https://console.cloud.google.com/billing/budgets
# 设置预算：$5/月，告警：50%, 90%, 100%
```

### 2. ✅ 使用 minScale: 0（关键！）

**这是免费的关键配置！**

```bash
# ✅ 正确（免费）
--min-instances 0    # 无请求时缩放到零 = FREE

# ❌ 错误（会产生费用）
--min-instances 1    # 持续运行 = $$$ (约 $25-50/月)
```

### 3. ✅ 使用免费外部数据库（不要用 Cloud SQL）

**Cloud SQL 没有免费层，最便宜也要 ~$7-10/月**

**推荐选项：**
- **Supabase** - 免费 500MB PostgreSQL
- **Neon** - 免费 PostgreSQL
- **Railway** - 免费 $5 额度

---

## 🚀 快速部署（免费配置）

### 步骤 1：设置预算告警

```bash
./scripts/setup-billing-alerts.sh
```

### 步骤 2：创建免费数据库

1. 注册 Supabase: https://supabase.com
2. 创建新项目
3. 获取连接字符串
4. 保存到 Secret Manager:
   ```bash
   echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
   ```

### 步骤 3：部署应用

```bash
# 使用免费部署脚本
./scripts/deploy-gcp-free.sh
```

这个脚本已经配置了所有免费选项：
- ✅ `minScale: 0` - 缩放到零
- ✅ 最小内存配置
- ✅ 不使用 Cloud SQL
- ✅ 合理的资源限制

---

## 💰 费用对比

### ❌ 之前的配置（会产生费用）

```
minScale: 1          → 持续运行 → ~$25-50/月
Cloud SQL            → 数据库服务 → ~$7-10/月
高内存配置 (2GB+)    → 额外费用 → ~$10-20/月

总计: ~$42-80/月 ❌
```

### ✅ 现在的配置（接近免费）

```
minScale: 0          → 缩放到零 → $0/月 ✅
外部数据库 (Supabase) → 免费层 → $0/月 ✅
最小内存配置         → 免费层内 → $0/月 ✅

总计: $0/月 ✅ (如果 < 200万请求/月)
```

---

## 📊 免费配额

| 服务 | 免费配额 | 您的使用量 |
|------|---------|-----------|
| Cloud Run | 200万请求/月 | ✅ 通常在免费层内 |
| Cloud Run | 360K GB-秒/月 | ✅ 通常在免费层内 |
| Artifact Registry | 0.5GB 存储 | ✅ 通常在免费层内 |
| Secret Manager | 10,000 版本 | ✅ 通常在免费层内 |

**预期费用：$0/月**（如果使用量在免费配额内）

---

## 🔍 部署后验证

### 检查是否使用免费配置

```bash
# 检查后端 minScale（应该显示 0）
gcloud run services describe print-main-backend \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# 检查前端 minScale（应该显示 0）
gcloud run services describe print-main-frontend \
  --region us-central1 \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"
```

### 检查费用

```bash
# 访问费用控制台
# https://console.cloud.google.com/billing

# 使用 gcloud 检查
gcloud billing accounts list
```

---

## 🆘 如果看到费用

### 立即检查：

1. **minScale 是否为 0？**
   ```bash
   # 如果不是，立即修改
   gcloud run services update print-main-backend \
     --min-instances 0 --region us-central1
   ```

2. **是否有 Cloud SQL 实例？**
   ```bash
   # 检查并删除（如果不需要）
   gcloud sql instances list
   gcloud sql instances delete INSTANCE_NAME
   ```

3. **是否有其他服务在运行？**
   ```bash
   gcloud run services list --all-regions
   ```

---

## 📚 详细文档

- [完整成本优化指南](./docs/GCP-COST-OPTIMIZATION.md)
- [免费部署检查清单](./docs/GCP-FREE-DEPLOYMENT-CHECKLIST.md)
- [完整部署指南](./docs/GCP-DEPLOYMENT.md)

---

**记住：`minScale: 0` + 外部免费数据库 = $0/月！**

