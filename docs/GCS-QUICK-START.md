# GCS 图片迁移快速开始指南

## 🎯 目标
将所有站点图片迁移到 GCP Cloud Storage，确保商品列表和详情页图片正常显示。

## ⚠️ 当前状态

由于账号权限限制，无法通过命令行创建 Bucket。请按照以下步骤操作：

## 📝 步骤 1：创建 GCS Bucket（必须手动完成）

### 方法 A：通过 GCP 控制台（推荐，5分钟）

1. **打开 GCP 控制台**
   - 直接访问：https://console.cloud.google.com/storage/browser?project=275911787144
   - 或访问：https://console.cloud.google.com/ → 选择项目 `275911787144`

2. **创建 Bucket**
   - 点击 "创建存储分区" 按钮
   - 填写配置：
     ```
     名称: print-main-product-images
     位置类型: 区域
     位置: us-central1
     存储类别: 标准
     访问控制: 统一
     公开访问防护: 已强制执行
     ```
   - 点击 "创建"

3. **设置公开读取权限**
   - 进入刚创建的 Bucket
   - 点击 "权限" 标签
   - 点击 "授予访问权限"
   - 配置：
     ```
     新主体: allUsers
     角色: Storage Object Viewer（存储对象查看者）
     ```
   - 点击 "保存"
   - 确认警告提示

### 方法 B：使用有权限的账号或服务账号

如果你有其他有 `storage.buckets.create` 权限的账号，可以运行：

```bash
gcloud storage buckets create gs://print-main-product-images \
  --project=275911787144 \
  --location=us-central1

# 设置公开读取
gsutil iam ch allUsers:objectViewer gs://print-main-product-images
```

## 🚀 步骤 2：执行自动迁移（Bucket 创建后）

Bucket 创建完成后，运行自动化脚本：

```bash
cd /Users/apony-it/Downloads/print-main
./scripts/auto-migrate-to-gcs.sh
```

这个脚本会自动执行：
1. ✅ 检查 Bucket 是否存在
2. ✅ 上传所有本地静态图片到 GCS
3. ✅ 预览数据库 URL 迁移计划
4. ✅ 确认后执行正式迁移

### 手动执行（如果自动脚本有问题）

```bash
# 1. 上传静态图片
cd /Users/apony-it/Downloads/print-main
GCP_IMAGE_BUCKET=print-main-product-images \
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
NODE_ENV=production \
node backend/scripts/upload-static-images-to-gcs.js

# 2. 预览迁移计划（不修改数据库）
DRY_RUN=true \
GCP_IMAGE_BUCKET=print-main-product-images \
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
node backend/scripts/migrate-image-urls-to-gcs.js

# 3. 正式迁移（修改数据库）
DRY_RUN=false \
GCP_IMAGE_BUCKET=print-main-product-images \
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
node backend/scripts/migrate-image-urls-to-gcs.js
```

## ⚙️ 步骤 3：配置 Cloud Run 环境变量

在 Cloud Run 后端服务中添加以下环境变量：

- `GCP_IMAGE_BUCKET=print-main-product-images`
- `GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images`

## ✅ 步骤 4：验证

1. 检查 GCS Bucket 中是否有图片文件
2. 访问商品列表页，检查图片是否正常显示
3. 访问商品详情页，检查图片是否正常显示
4. 检查图片 URL 是否为 GCS 域名

## 🐛 故障排除

### Bucket 创建权限不足
- 使用项目 Owner 账号创建
- 或在 GCP 控制台使用有权限的账号创建

### 上传失败
- 检查 gcloud 认证：`gcloud auth list`
- 检查权限：确保账号有 `storage.objects.create` 权限

### 迁移脚本失败
- 检查数据库连接：确保 `DATABASE_URL` 正确
- 检查环境变量：确保 `GCP_IMAGE_BUCKET` 和 `GCP_IMAGE_BASE_URL` 已设置

## 📚 相关文档

- [详细 Bucket 创建指南](./GCS-BUCKET-SETUP-GUIDE.md)
- [环境变量配置清单](./ENVIRONMENT-VARIABLES-CHECKLIST.md)

