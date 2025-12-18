#!/bin/bash
# [2025-12-18 17:50:00] 部署版本验证脚本
# 用于验证部署是否成功，并显示当前线上运行的版本信息

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}

echo -e "${BLUE}🔍 检查部署版本信息...${NC}"
echo ""

# 获取本地 Git SHA 和构建时间
LOCAL_SHA=$(git rev-parse --short HEAD)
LOCAL_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo -e "${YELLOW}📌 本地代码版本:${NC}"
echo -e "  SHA: ${GREEN}${LOCAL_SHA}${NC}"
echo -e "  时间: ${GREEN}${LOCAL_TIME}${NC}"
echo ""

# 获取前端服务 URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)' 2>/dev/null || echo "")
if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ 无法获取前端服务 URL${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 前端服务 URL: ${FRONTEND_URL}${NC}"
echo ""

# 获取前端服务的最新 revision
FRONTEND_REVISION=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.latestReadyRevisionName)' 2>/dev/null || echo "")
if [ -z "$FRONTEND_REVISION" ]; then
    echo -e "${RED}❌ 无法获取前端服务 revision${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 前端服务 Revision: ${FRONTEND_REVISION}${NC}"

# 获取 revision 的创建时间
REVISION_CREATED=$(gcloud run revisions describe ${FRONTEND_REVISION} --region ${REGION} --project ${PROJECT_ID} --format 'value(metadata.creationTimestamp)' 2>/dev/null || echo "")
if [ ! -z "$REVISION_CREATED" ]; then
    echo -e "${YELLOW}⏰ Revision 创建时间: ${REVISION_CREATED}${NC}"
fi
echo ""

# 尝试从前端页面获取构建版本信息
echo -e "${BLUE}🔍 从线上页面获取构建版本信息...${NC}"
VERSION_INFO=$(curl -s "${FRONTEND_URL}" | grep -oP 'NEXT_PUBLIC_BUILD_SHA[^"]*' | head -1 || echo "")
if [ ! -z "$VERSION_INFO" ]; then
    echo -e "${GREEN}✅ 找到版本信息: ${VERSION_INFO}${NC}"
else
    echo -e "${YELLOW}⚠️  无法从页面 HTML 中提取版本信息${NC}"
    echo -e "${YELLOW}   请打开浏览器控制台查看 [Frontend Build] 日志${NC}"
fi
echo ""

# 检查浏览器控制台日志
echo -e "${BLUE}📋 验证步骤:${NC}"
echo -e "  1. 打开浏览器访问: ${GREEN}${FRONTEND_URL}${NC}"
echo -e "  2. 打开开发者工具 (F12)"
echo -e "  3. 查看 Console 标签页"
echo -e "  4. 搜索: ${GREEN}[Frontend Build]${NC}"
echo -e "  5. 应该看到类似: ${GREEN}[Frontend Build] ${LOCAL_SHA} ${LOCAL_TIME}${NC}"
echo ""

# 比较版本
echo -e "${BLUE}🔍 版本对比:${NC}"
echo -e "  本地 SHA: ${GREEN}${LOCAL_SHA}${NC}"
echo -e "  如果线上显示的 SHA 与本地不一致，说明:"
echo -e "    ${RED}❌ 部署未成功，或浏览器缓存了旧版本${NC}"
echo -e "    ${YELLOW}💡 解决方案: 强制刷新 (Ctrl+Shift+R 或 Cmd+Shift+R)${NC}"
echo ""

echo -e "${GREEN}✅ 验证完成${NC}"
