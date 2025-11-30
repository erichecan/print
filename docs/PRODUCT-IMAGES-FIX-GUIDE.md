# 商品图片修复指南
# [2025-01-29 19:40:00]

## 问题总结

商品图片无法正常显示，原因是：
1. ✅ 图片文件已正确部署到前端服务
2. ⚠️  数据库中的 `product_images` 表可能为空或记录不完整
3. ⚠️  API 返回的 `images` 数组为空

## 解决方案

### 方案 A：修复数据库图片记录（快速修复）

**脚本位置**：`backend/scripts/fix-product-images-db.js`

**功能**：
- 检查数据库中的图片记录
- 对比本地图片文件
- 为缺失的商品插入图片记录
- 更新图片 URL 为正确的前端服务 URL

**使用方法**：

1. **本地测试**（在本地运行）：
```bash
cd backend
node scripts/fix-product-images-db.js
```

2. **在 GCP Cloud Run 上运行**（需要连接到数据库）：
```bash
# 需要先设置 DATABASE_URL 环境变量
export DATABASE_URL="your-database-url"
node scripts/fix-product-images-db.js
```

**脚本会**：
1. 扫描所有激活的商品
2. 检查本地 `apps/web/public/assets/products/` 目录中的图片文件
3. 对比数据库中的图片记录
4. 如果数据库中没有记录或记录不完整，会自动插入/更新

**预期结果**：
- 每个商品都会有对应的图片记录
- 图片 URL 格式：`https://print-main-frontend-234065158862.us-central1.run.app/assets/products/{slug}/image-1.jpg`

### 方案 B：将图片迁移到 GCP Cloud Storage（长期方案）

**优点**：
- ✅ 更可靠（不受容器重启影响）
- ✅ 更好的性能（CDN 加速）
- ✅ 更容易管理（独立存储）
- ✅ 支持动态上传新图片

**步骤**：

1. **创建 Cloud Storage Bucket**：
```bash
gsutil mb -p moonlit-gamma-479502-r6 -l us-central1 gs://print-main-product-images
```

2. **设置公共访问权限**：
```bash
gsutil iam ch allUsers:objectViewer gs://print-main-product-images
```

3. **上传图片**：
```bash
gsutil -m cp -r apps/web/public/assets/products/* gs://print-main-product-images/products/
```

4. **更新数据库 URL**（需要修改脚本）：
   - 图片 URL 格式：`https://storage.googleapis.com/print-main-product-images/products/{slug}/image-1.jpg`

## 验证修复

修复后，检查 API 响应：

```bash
curl "https://print-main-backend-234065158862.us-central1.run.app/api/products?page=1&limit=1" \
  -H "Origin: https://print-main-frontend-234065158862.us-central1.run.app"
```

应该看到：
- `primaryImage.url` 有值
- `images` 数组不为空，包含所有图片

## 推荐方案

**当前推荐：方案 A（快速修复）**

理由：
1. 图片文件已经存在并可以访问
2. 只需要修复数据库记录
3. 可以立即解决问题
4. 后续可以再迁移到 Cloud Storage

**未来考虑：方案 B（迁移到 Cloud Storage）**

当需要：
- 支持动态上传新图片
- 更好的性能和可扩展性
- 独立管理图片存储

---

**创建时间**: 2025-01-29 19:40:00
**状态**: 待执行修复脚本

