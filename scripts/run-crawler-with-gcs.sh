#!/bin/bash

# 运行爬虫脚本并上传到 GCS
# 设置 GCS 环境变量并运行爬虫

cd "$(dirname "$0")/.."

# GCS 配置
export GCP_IMAGE_BUCKET="${GCP_IMAGE_BUCKET:-print-main-product-images}"
export GCP_IMAGE_BASE_URL="${GCP_IMAGE_BASE_URL:-https://storage.googleapis.com/print-main-product-images}"
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-275911787144}"

echo "🚀 开始运行爬虫（支持 GCS 上传）"
echo ""
echo "📦 配置信息:"
echo "   - GCS Bucket: $GCP_IMAGE_BUCKET"
echo "   - GCS Base URL: $GCP_IMAGE_BASE_URL"
echo "   - GCP Project ID: $GCP_PROJECT_ID"
echo ""

# 运行爬虫脚本
node scripts/crawl-customink-promotional-products.js

