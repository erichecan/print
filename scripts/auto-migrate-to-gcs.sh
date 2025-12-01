#!/bin/bash
# [2025-12-01 22:45:00] 自动执行 GCS 迁移脚本
# 前提：Bucket 必须已存在（如果不存在，请先手动创建或使用有权限的账号）

set -e

BUCKET_NAME="print-main-product-images"
PROJECT_ID="275911787144"
BASE_URL="https://storage.googleapis.com/${BUCKET_NAME}"

echo "🚀 GCS 图片迁移自动化脚本"
echo "================================"
echo "Bucket: ${BUCKET_NAME}"
echo "项目: ${PROJECT_ID}"
echo "基础 URL: ${BASE_URL}"
echo ""

# 步骤 1: 检查 Bucket 是否存在
echo "📋 步骤 1: 检查 Bucket 是否存在..."
if gsutil ls -b gs://${BUCKET_NAME} > /dev/null 2>&1; then
    echo "✅ Bucket 已存在"
else
    echo "❌ Bucket 不存在: gs://${BUCKET_NAME}"
    echo ""
    echo "请先创建 Bucket："
    echo "  方法 1: 通过 GCP 控制台 (推荐)"
    echo "    - 访问: https://console.cloud.google.com/storage/browser?project=${PROJECT_ID}"
    echo "    - 点击 '创建存储分区'"
    echo "    - 名称: ${BUCKET_NAME}"
    echo "    - 位置: us-central1"
    echo "    - 访问控制: 统一"
    echo ""
    echo "  方法 2: 使用有权限的账号运行"
    echo "    gcloud storage buckets create gs://${BUCKET_NAME} --project=${PROJECT_ID} --location=us-central1"
    echo ""
    echo "创建完成后，请再次运行此脚本。"
    exit 1
fi

# 步骤 2: 检查 Bucket 权限
echo ""
echo "📋 步骤 2: 检查 Bucket 公开读取权限..."
echo "（如果权限未设置，上传后图片可能无法公开访问）"

# 步骤 3: 上传静态图片
echo ""
echo "📋 步骤 3: 上传本地静态图片到 GCS..."
cd "$(dirname "$0")/.."
GCP_IMAGE_BUCKET=${BUCKET_NAME} \
GCP_IMAGE_BASE_URL=${BASE_URL} \
NODE_ENV=production \
node backend/scripts/upload-static-images-to-gcs.js

if [ $? -ne 0 ]; then
    echo "❌ 上传失败，请检查错误信息"
    exit 1
fi

echo ""
echo "✅ 静态图片上传完成！"

# 步骤 4: 迁移数据库 URL（Dry-run）
echo ""
echo "📋 步骤 4: 数据库 URL 迁移（预览模式）..."
echo "正在检查需要迁移的 URL..."
DRY_RUN=true \
GCP_IMAGE_BUCKET=${BUCKET_NAME} \
GCP_IMAGE_BASE_URL=${BASE_URL} \
node backend/scripts/migrate-image-urls-to-gcs.js

if [ $? -ne 0 ]; then
    echo "❌ 迁移预览失败，请检查错误信息"
    exit 1
fi

# 步骤 5: 确认后正式迁移
echo ""
echo "================================"
echo "📋 预览完成！"
echo ""
read -p "是否继续执行正式迁移？(y/N): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 步骤 5: 执行正式数据库 URL 迁移..."
    DRY_RUN=false \
    GCP_IMAGE_BUCKET=${BUCKET_NAME} \
    GCP_IMAGE_BASE_URL=${BASE_URL} \
    node backend/scripts/migrate-image-urls-to-gcs.js
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 数据库迁移完成！"
        echo ""
        echo "🎉 迁移全部完成！"
        echo ""
        echo "📝 后续步骤："
        echo "  1. 在 Cloud Run 后端服务中设置环境变量："
        echo "     - GCP_IMAGE_BUCKET=${BUCKET_NAME}"
        echo "     - GCP_IMAGE_BASE_URL=${BASE_URL}"
        echo "  2. 重新部署后端服务"
        echo "  3. 验证前端图片显示是否正常"
    else
        echo "❌ 迁移失败，请检查错误信息"
        exit 1
    fi
else
    echo ""
    echo "⏸️  已取消正式迁移"
    echo "可以稍后手动运行："
    echo "  DRY_RUN=false GCP_IMAGE_BUCKET=${BUCKET_NAME} GCP_IMAGE_BASE_URL=${BASE_URL} node backend/scripts/migrate-image-urls-to-gcs.js"
fi

