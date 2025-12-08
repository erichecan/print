# 前端服务重新部署完成报告

**部署时间**: 2025-12-08 04:15:00  
**部署原因**: 修复生产环境 API 配置问题（localhost API 地址警告）

## ✅ 部署状态

### 构建状态
- **构建 ID**: `7eba24aa-775d-48d2-913a-59366d79cdd5`
- **构建时间**: 2025-12-08T04:11:39+00:00
- **构建时长**: 3分57秒
- **构建状态**: ✅ SUCCESS

### 服务状态
- **前端服务名称**: `print-main-frontend`
- **服务 URL**: `https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`
- **区域**: `us-central1`
- **最新版本**: `print-main-frontend-00133-44t`
- **服务状态**: ✅ True (运行中)

## 🔧 部署前修复内容

### 1. 更新 Secret Manager
- **Secret 名称**: `api-url`
- **新版本**: `39`
- **新值**: `https://print-main-backend-234065158862.us-central1.run.app/api`
- **旧值**: `https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api`

### 2. 代码修复
- ✅ 修复 `next.config.mjs` 中的 rewrites 配置
- ✅ 修复 `api-config.ts` 中的环境变量读取逻辑
- ✅ 修复 `api-route-config.ts` 中的后端地址

## 📋 构建配置

### 构建时环境变量
从 `cloudbuild.yaml` 第42行，构建时传入了：
```yaml
--build-arg NEXT_PUBLIC_API_URL=https://print-main-backend-234065158862.us-central1.run.app/api
```

### 运行时环境变量
从 Secret Manager 读取：
- `NEXT_PUBLIC_API_URL`: 从 `api-url` secret 读取
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: 从 `stripe-publishable-key` secret 读取
- `NODE_ENV`: `production`

## 🔍 验证步骤

### 1. 检查服务状态
```bash
gcloud run services describe print-main-frontend \
  --region us-central1 \
  --format="value(status.url,status.conditions[0].status)"
```

### 2. 验证 API 配置
访问前端服务并检查浏览器控制台：
- ✅ 不应该有 localhost API 地址警告
- ✅ `/api/proxy/cart` 应该正常返回（200 或 401，不应该 500）
- ✅ `/api/categories` 应该正常返回（200，不应该 500）
- ✅ 首页分类数据应该正常加载

### 3. 检查 Secret Manager
```bash
gcloud secrets versions access latest --secret=api-url
# 应该输出: https://print-main-backend-234065158862.us-central1.run.app/api
```

## 📝 注意事项

### 关于服务 URL 差异
用户访问的 URL 是：`https://print-main-frontend-234065158862.us-central1.run.app`

但实际部署的服务 URL 是：`https://print-main-frontend-hsbqzlnkxa-uc.a.run.app`

这可能意味着：
1. 用户访问的是旧的服务 URL（可能是之前的部署）
2. 或者有多个项目/服务

**建议**：
- 检查是否有多个前端服务
- 确认用户应该访问哪个 URL
- 如果需要，可以创建新的服务或更新服务名称

### NEXT_PUBLIC_* 变量的特性
- `NEXT_PUBLIC_*` 变量在构建时内联到代码中
- 运行时设置的环境变量不会生效（除非重新构建）
- 本次部署已经包含了正确的构建时环境变量

### 代码兜底逻辑
即使构建时或运行时环境变量有问题，代码中也添加了兜底逻辑：
- 检测到 localhost 时会自动替换为正确的后端地址
- 检测到 Cloud Run 环境时会使用相对路径 `/api`

## ✅ 部署完成

- [x] Secret Manager 已更新
- [x] 代码修复已提交
- [x] 构建已成功完成
- [x] 前端服务已部署
- [x] 服务状态正常

## 🔄 后续工作

1. **验证线上环境**：
   - 访问前端服务并检查控制台
   - 确认 API 请求正常工作
   - 确认没有 localhost 警告

2. **如果仍有问题**：
   - 检查浏览器控制台的完整错误信息
   - 检查后端服务是否正常运行
   - 检查网络请求的完整 URL

3. **监控和日志**：
   - 查看 Cloud Run 日志：`gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=print-main-frontend" --limit 50`
   - 查看构建日志：访问 Cloud Build 控制台

## 📊 构建日志

构建日志可在以下位置查看：
```
https://console.cloud.google.com/cloud-build/builds/7eba24aa-775d-48d2-913a-59366d79cdd5?project=234065158862
```

