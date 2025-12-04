# 促销产品图片爬取和 GCS 上传完整指南

## [2025-01-29 14:00:00] 使用说明

### 功能说明

1. **爬虫脚本**: 爬取 Custom Ink 促销产品页面的所有图片
2. **GCS 上传**: 自动将下载的图片上传到 Google Cloud Storage
3. **图片分类**: 自动将图片分类到不同目录（categories、banners、products等）

### 前置要求

#### 1. 安装依赖

确保已安装 Playwright 和相关依赖：

```bash
cd /Users/apony-it/Downloads/print-main
npm install
```

#### 2. 配置 GCP 认证

上传到 GCS 需要 GCP 认证凭证。有两种方式：

##### 方式 A：使用应用默认凭证（推荐）

```bash
# 登录 GCP
gcloud auth application-default login

# 设置项目
gcloud config set project 275911787144
```

##### 方式 B：使用服务账号密钥文件

1. 在 GCP 控制台创建服务账号并下载密钥文件
2. 设置环境变量：
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

#### 3. 配置环境变量

设置 GCS bucket 信息：

```bash
export GCP_IMAGE_BUCKET=print-main-product-images
export GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images
export GCP_PROJECT_ID=275911787144
```

或者创建 `.env` 文件（在 `backend/.env` 或根目录）：

```env
GCP_IMAGE_BUCKET=print-main-product-images
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images
GCP_PROJECT_ID=275911787144
```

### 使用方法

#### 方法 1：运行爬虫并自动上传到 GCS

```bash
cd /Users/apony-it/Downloads/print-main

# 设置环境变量
export GCP_IMAGE_BUCKET=print-main-product-images
export GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images

# 运行爬虫（会自动上传到 GCS）
node scripts/crawl-customink-promotional-products.js
```

#### 方法 2：使用便捷脚本

```bash
cd /Users/apony-it/Downloads/print-main
./scripts/run-crawler-with-gcs.sh
```

#### 方法 3：先下载，后上传

如果图片已经下载到本地，只想上传到 GCS：

```bash
cd /Users/apony-it/Downloads/print-main

# 设置环境变量
export GCP_IMAGE_BUCKET=print-main-product-images
export GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images

# 上传已下载的图片
node scripts/upload-promotional-images-to-gcs.js
```

### 输出文件

#### 1. 本地图片
- 目录: `customink-images/promotional-products/`
- 结构:
  ```
  promotional-products/
  ├── categories/    # 类别图标
  ├── banners/       # Banner图片
  ├── products/      # 产品图片
  ├── logos/         # Logo图片
  ├── icons/         # 图标
  └── misc/          # 其他图片
  ```

#### 2. 图片清单
- 文件: `docs/customink-analysis/promotional-products-image-inventory.json`
- 包含: 所有图片的URL、本地路径、GCS URL等信息

#### 3. GCS 上传结果
- 文件: `docs/customink-analysis/gcs-upload-results.json`
- 包含: 上传统计和结果

### GCS 存储结构

图片在 GCS 中的路径格式：
```
gs://print-main-product-images/promotional-products/{category}/{filename}
```

访问 URL 格式：
```
https://storage.googleapis.com/print-main-product-images/promotional-products/{category}/{filename}
```

### 故障排除

#### 问题 1: GCP 认证失败

**错误信息**: `Could not load the default credentials`

**解决方法**:
```bash
# 运行 GCP 认证
gcloud auth application-default login

# 验证认证
gcloud auth list
```

#### 问题 2: Bucket 不存在

**错误信息**: `Bucket 不存在`

**解决方法**:
1. 在 GCP 控制台创建 bucket: `print-main-product-images`
2. 设置公开读取权限
3. 参考: `docs/GCS-BUCKET-SETUP-GUIDE.md`

#### 问题 3: 权限不足

**错误信息**: `Permission denied`

**解决方法**:
- 确保服务账号或用户账号有 `storage.objects.create` 和 `storage.objects.setIamPolicy` 权限

### 后续步骤

1. **更新图片路径**: 爬取完成后，可以更新 `apps/web/src/data/promotional-categories.ts` 中的图片路径，使用 GCS URL

2. **测试页面**: 访问 `/promotional-products` 页面查看效果

3. **清理本地文件**（可选）: 如果所有图片都已上传到 GCS，可以删除本地文件以节省空间

### 相关文件

- 爬虫脚本: `scripts/crawl-customink-promotional-products.js`
- GCS 上传脚本: `scripts/upload-promotional-images-to-gcs.js`
- 运行脚本: `scripts/run-crawler-with-gcs.sh`
- GCS 工具: `backend/src/utils/gcsStorage.js`
- 类别数据: `apps/web/src/data/promotional-categories.ts`

### 注意事项

1. 爬虫需要一定时间完成（取决于图片数量和网络速度）
2. 已下载的图片会自动跳过
3. data URI 图片（base64编码）不会上传到 GCS
4. 图片会自动设置为公共可读
5. 建议在稳定的网络环境下运行

