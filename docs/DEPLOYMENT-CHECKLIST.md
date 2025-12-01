# 部署检查清单

**日期**: 2025-12-01  
**目标**: 部署 CORS 修复和图片迁移完成

## ✅ 代码修复完成

### 1. CORS 配置修复
- [x] 更新 `backend/src/app.js` 允许所有必要的请求头
- [x] 添加 `x-playwright-e2e` 到允许列表
- [x] 代码已提交到 Git

### 2. 图片迁移完成
- [x] 107 个图片已上传到 GCS
- [x] 数据库中商品图片 URL 已迁移（58/60 为 GCS URL）
- [x] 后端代码支持 GCS URL
- [x] 前端配置允许 GCS 域名

## 📋 部署前检查

### 后端环境变量
确认 Cloud Run 后端服务中设置了：
- [ ] `FRONTEND_URL=https://print-main-frontend-234065158862.us-central1.run.app`
- [ ] `GCP_IMAGE_BUCKET=print-main-product-images`
- [ ] `GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images`
- [ ] `CORS_ORIGINS` (可选，CORS 配置已经支持 .run.app 域名)

### GCS Bucket 权限
- [x] Bucket 已创建: `print-main-product-images`
- [ ] 确认 Bucket 已设置公开读取权限（allUsers: Storage Object Viewer）
- [ ] 确认后端服务账号有上传权限

## 🚀 部署步骤

### 步骤 1: 触发后端构建和部署

```bash
# 方式 1: 通过 Cloud Build（推荐）
cd /Users/apony-it/Downloads/print-main
gcloud builds submit --config cloudbuild.yaml --substitutions=_BACKEND_ONLY=true

# 方式 2: 使用部署脚本
./scripts/deploy-auto.sh
```

### 步骤 2: 验证部署

1. **检查后端服务状态**:
   ```bash
   gcloud run services describe print-main-backend-234065158862 \
     --region us-central1 \
     --format="value(status.conditions)"
   ```

2. **测试健康检查**:
   ```bash
   curl https://print-main-backend-234065158862.us-central1.run.app/api/health
   ```

3. **测试 CORS**:
   ```bash
   curl -H "Origin: https://print-main-frontend-234065158862.us-central1.run.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: x-playwright-e2e" \
        -X OPTIONS \
        https://print-main-backend-234065158862.us-central1.run.app/api/products \
        -v
   ```

### 步骤 3: 验证图片显示

1. 访问前端首页
2. 检查商品图片是否从 GCS 加载
3. 打开浏览器 DevTools，检查 Network 标签中的图片请求

### 步骤 4: 重新运行 E2E 测试

```bash
cd apps/web
npm run test:gcp -- tests/e2e/gcp-production-deep-analysis.spec.ts
```

## ✅ 验证清单

部署完成后验证：

- [ ] 后端服务正常运行
- [ ] CORS 错误消失
- [ ] API 请求成功（/api/products, /api/cart 等）
- [ ] 商品图片正常显示（从 GCS 加载）
- [ ] 购物车功能正常
- [ ] Buy Now 功能正常
- [ ] 支付流程可以开始（至少可以看到结账页）

## 🐛 如果出现问题

### CORS 仍然失败
1. 检查后端日志：`gcloud logging read "resource.type=cloud_run_revision"`
2. 验证环境变量 `FRONTEND_URL` 是否正确设置
3. 检查 CORS 配置代码是否正确部署

### 图片不显示
1. 检查 GCS Bucket 权限
2. 验证图片 URL 是否正确（应该是 `storage.googleapis.com` 域名）
3. 检查浏览器控制台是否有 CORS 或 403 错误

### API 连接失败
1. 检查后端服务是否运行
2. 查看 Cloud Run 服务日志
3. 验证数据库连接

## 📞 联系信息

如果遇到问题，参考：
- 后端 CORS 配置: `backend/src/app.js`
- 图片迁移脚本: `backend/scripts/migrate-image-urls-to-gcs.js`
- 环境变量清单: `docs/ENVIRONMENT-VARIABLES-CHECKLIST.md`

