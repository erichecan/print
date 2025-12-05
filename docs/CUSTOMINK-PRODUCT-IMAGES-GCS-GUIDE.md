# Custom Ink 产品图片爬取并上传到 GCS 指南

[2025-01-31 14:00:00] 确保 Design Lab 不会出现图片 404 错误

## 目标

从 Custom Ink 爬取所有产品图片并上传到 GCS，确保 Design Lab 始终有可用的图片显示。

## 步骤

### 1. 设置环境变量

```bash
export GCP_IMAGE_BUCKET=print-main-product-images
export GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images
export GCP_PROJECT_ID=275911787144
```

### 2. 运行爬取和上传脚本

```bash
cd /Users/eric/Desktop/print-main

GCP_IMAGE_BUCKET=print-main-product-images \
GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
node scripts/scrape-and-upload-customink-product-images.js
```

### 3. 脚本功能

脚本会：
1. 从 Custom Ink 下载所有产品图片（所有颜色 × 所有视图）
2. 上传到 GCS bucket: `print-main-product-images`
3. 生成图片 URL 映射文件: `docs/customink-product-images-gcs.json`

### 4. 更新代码使用 GCS URL

图片 URL 生成逻辑已更新，会优先使用 GCS URL：
- 如果 GCS URL 存在，使用 GCS URL
- 如果不存在，回退到 Custom Ink 原始 URL

### 5. 结果文件

脚本完成后会生成：
- `docs/customink-product-images-gcs.json` - 包含所有图片的 GCS URL 映射

## GCS 路径结构

```
print-main-product-images/
└── design-lab-products/
    └── gildan-softstyle-tshirt/
        ├── white/
        │   ├── front-large_extended.png
        │   ├── back-large_extended.png
        │   └── sleeve-large_extended.png
        ├── navy/
        │   ├── front-large_extended.png
        │   ├── back-large_extended.png
        │   └── sleeve-large_extended.png
        └── ...
```

## 图片 URL 映射格式

```json
{
  "gildan-softstyle-tshirt:White:front": {
    "gcsUrl": "https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png",
    "colorName": "White",
    "view": "front"
  }
}
```

## 验证

运行脚本后，检查：
1. GCS bucket 中是否有图片文件
2. 图片是否可以公开访问
3. Design Lab 页面是否正常显示图片

## 注意事项

1. **首次运行时间较长**：需要下载和上传所有图片，可能需要 5-10 分钟
2. **网络稳定性**：确保网络连接稳定，脚本有重试机制
3. **GCS 权限**：确保有 GCS 写入权限
4. **临时文件**：下载的图片会保存在 `temp-customink-images/` 目录，可以保留或删除

## 后续优化

1. 可以添加更多产品到 `PRODUCTS` 配置
2. 可以添加更多颜色
3. 可以定期运行脚本更新图片

## 故障排除

### 问题：GCS 上传失败
- 检查环境变量是否正确设置
- 检查 GCS bucket 是否存在
- 检查 GCS 权限

### 问题：图片下载失败
- 检查网络连接
- 检查 Custom Ink URL 是否有效
- 查看错误日志

### 问题：图片 URL 映射未加载
- 检查映射文件是否存在
- 检查文件格式是否正确
- 查看浏览器控制台错误


