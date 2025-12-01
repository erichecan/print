# GCP Cloud Storage Bucket 创建指南

## 目标
创建用于存储所有站点图片的 GCS Bucket: `print-main-product-images`

## 创建步骤

### 方法 1：通过 GCP 控制台（推荐）

1. **登录 GCP 控制台**
   - 访问：https://console.cloud.google.com/
   - 选择项目：`275911787144`

2. **创建 Storage Bucket**
   - 导航到：Storage → Buckets
   - 点击 "Create bucket"
   - 配置如下：
     - **Name**: `print-main-product-images`
     - **Location type**: `Region`
     - **Location**: `us-central1` (与 Cloud Run 服务同一区域)
     - **Storage class**: `Standard`
     - **Access control**: `Uniform` (统一访问控制)
     - **Public access prevention**: `Enforced` (防止公开访问)
     - 点击 "Create"

3. **设置对象级别公开读取权限**
   - 进入刚创建的 Bucket
   - 点击 "Permissions" 标签
   - 点击 "Grant Access"
   - 添加以下权限：
     - **New principals**: `allUsers`
     - **Role**: `Storage Object Viewer`
     - 点击 "Save"

### 方法 2：通过 gcloud 命令行（需要权限）

如果你有 `storage.buckets.create` 权限，可以运行：

```bash
# 创建 Bucket
gcloud storage buckets create gs://print-main-product-images \
  --project=275911787144 \
  --location=us-central1

# 设置对象级别公开读取
gsutil iam ch allUsers:objectViewer gs://print-main-product-images
```

## 验证 Bucket 已创建

运行以下命令验证：

```bash
gsutil ls gs://print-main-product-images
```

应该能列出 Bucket 内容（即使为空）。

## 后续步骤

Bucket 创建完成后，可以继续执行：

1. **上传静态图片到 GCS**
   ```bash
   cd /Users/apony-it/Downloads/print-main
   GCP_IMAGE_BUCKET=print-main-product-images \
   GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
   NODE_ENV=production \
   node backend/scripts/upload-static-images-to-gcs.js
   ```

2. **迁移数据库 URL 到 GCS**
   ```bash
   # 先 dry-run
   DRY_RUN=true \
   GCP_IMAGE_BUCKET=print-main-product-images \
   GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
   node backend/scripts/migrate-image-urls-to-gcs.js
   
   # 确认无误后正式执行
   DRY_RUN=false \
   GCP_IMAGE_BUCKET=print-main-product-images \
   GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
   node backend/scripts/migrate-image-urls-to-gcs.js
   ```

## 环境变量配置

在 Cloud Run 后端服务中设置以下环境变量：

- `GCP_IMAGE_BUCKET=print-main-product-images`
- `GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images`

## 注意事项

- Bucket 名称必须全局唯一
- 如果 `print-main-product-images` 已被占用，可以选择其他名称（如 `print-main-images-275911787144`）
- 确保 Bucket 区域与 Cloud Run 服务在同一区域（`us-central1`）以获得最佳性能

