#!/bin/bash
# [2025-12-01 22:40:00] GCS Bucket 创建脚本
# 如果命令行无法创建，请使用 GCP 控制台手动创建

set -e

PROJECT_ID="275911787144"
BUCKET_NAME="print-main-product-images"
LOCATION="us-central1"

echo "🔧 尝试创建 GCS Bucket: gs://${BUCKET_NAME}..."
echo "   项目 ID: ${PROJECT_ID}"
echo "   区域: ${LOCATION}"
echo ""

# 方法 1: 使用 gsutil
echo "方法 1: 使用 gsutil..."
gsutil mb -p ${PROJECT_ID} -c STANDARD -l ${LOCATION} gs://${BUCKET_NAME} 2>&1 || {
    echo "⚠️  gsutil 创建失败，尝试方法 2..."
    
    # 方法 2: 使用 gcloud storage
    echo "方法 2: 使用 gcloud storage..."
    gcloud storage buckets create gs://${BUCKET_NAME} \
        --project=${PROJECT_ID} \
        --location=${LOCATION} 2>&1 || {
        echo ""
        echo "❌ 无法通过命令行创建 Bucket。"
        echo ""
        echo "📝 请通过 GCP 控制台手动创建："
        echo "   1. 访问: https://console.cloud.google.com/storage/browser?project=${PROJECT_ID}"
        echo "   2. 点击 '创建存储分区'"
        echo "   3. 名称: ${BUCKET_NAME}"
        echo "   4. 位置: ${LOCATION}"
        echo "   5. 访问控制: 统一"
        echo ""
        echo "   然后运行此脚本继续设置权限..."
        exit 1
    }
}

echo ""
echo "✅ Bucket 创建成功！"
echo ""

# 设置对象级别公开读取权限
echo "🔧 设置对象级别公开读取权限..."
gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME} 2>&1 || {
    echo "⚠️  权限设置失败，请在 GCP 控制台手动设置："
    echo "   - 进入 Bucket → Permissions"
    echo "   - 添加 allUsers，角色: Storage Object Viewer"
    exit 1
}

echo ""
echo "✅ 权限设置完成！"
echo ""
echo "📋 后续步骤："
echo "   1. 运行上传脚本: node backend/scripts/upload-static-images-to-gcs.js"
echo "   2. 运行迁移脚本: node backend/scripts/migrate-image-urls-to-gcs.js"
echo ""

