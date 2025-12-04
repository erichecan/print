#!/bin/bash
# [2025-12-03 23:55:00] 配置 GCS Bucket CORS 策略，允许前端访问图片
# 解决 Design Lab 中从 GCS 加载图片时的 CORS 错误

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
BUCKET_NAME=${GCP_IMAGE_BUCKET:-print-main-product-images}
FRONTEND_URL=${FRONTEND_URL:-https://print-main-frontend-234065158862.us-central1.run.app}

echo -e "${GREEN}🔧 配置 GCS Bucket CORS 策略...${NC}"
echo -e "项目: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Bucket: ${YELLOW}${BUCKET_NAME}${NC}"
echo -e "前端 URL: ${YELLOW}${FRONTEND_URL}${NC}"
echo ""

# 创建 CORS 配置文件
CORS_CONFIG_FILE=$(mktemp)
cat > "$CORS_CONFIG_FILE" <<EOF
[
  {
    "origin": ["${FRONTEND_URL}", "https://*.run.app", "http://localhost:*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

echo -e "${GREEN}📝 CORS 配置内容:${NC}"
cat "$CORS_CONFIG_FILE"
echo ""

# 设置 CORS 策略
echo -e "${GREEN}🚀 应用 CORS 配置到 Bucket...${NC}"
gsutil cors set "$CORS_CONFIG_FILE" gs://${BUCKET_NAME} || {
  echo -e "${RED}❌ 设置 CORS 失败${NC}"
  echo -e "${YELLOW}请确保:${NC}"
  echo "  1. Bucket 存在: gs://${BUCKET_NAME}"
  echo "  2. 有权限修改 Bucket 配置"
  echo "  3. gsutil 已安装并配置"
  exit 1
}

# 验证 CORS 配置
echo -e "${GREEN}✅ CORS 配置已应用${NC}"
echo -e "${GREEN}🔍 验证配置...${NC}"
gsutil cors get gs://${BUCKET_NAME}

# 清理临时文件
rm -f "$CORS_CONFIG_FILE"

echo ""
echo -e "${GREEN}🎉 GCS Bucket CORS 配置完成！${NC}"
echo -e "${YELLOW}注意: 如果图片仍然无法加载，请检查:${NC}"
echo "  1. Bucket 对象是否设置了公开读取权限"
echo "  2. 前端代码是否正确处理 CORS 响应"
echo "  3. 浏览器缓存可能需要清除"

