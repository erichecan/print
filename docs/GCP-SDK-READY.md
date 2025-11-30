# ✅ GCP SDK 已完全配置好！

## 当前状态

- ✅ **gcloud SDK 已安装**: 版本 543.0.0
- ✅ **已登录**: itsouvenir1600@gmail.com
- ✅ **项目已设置**: 234065158862

## 🎉 现在你可以执行所有命令了！

### 常用的部署和管理命令

#### 查看构建状态
```bash
# 查看所有构建
gcloud builds list --limit=10

# 查看正在进行的构建
gcloud builds list --ongoing
```

#### 查看服务状态
```bash
# 列出所有 Cloud Run 服务
gcloud run services list --region=us-central1

# 查看特定服务详情
gcloud run services describe print-main-backend --region=us-central1
gcloud run services describe print-main-frontend --region=us-central1
```

#### 触发部署
```bash
# 使用 Cloud Build 手动触发部署
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_ARTIFACT_REGISTRY=print-main
```

#### 查看日志
```bash
# 查看后端日志
gcloud run services logs read print-main-backend \
  --region=us-central1 --limit=50

# 查看前端日志
gcloud run services logs read print-main-frontend \
  --region=us-central1 --limit=50
```

#### 管理 Secret Manager
```bash
# 列出所有 secrets
gcloud secrets list

# 查看特定 secret
gcloud secrets versions access latest --secret=database-url
```

## 📚 更多命令

所有命令都可以通过 `--help` 查看帮助：
```bash
gcloud run --help
gcloud builds --help
gcloud secrets --help
```

---

**配置完成时间**: 2025-01-29 14:15:00

