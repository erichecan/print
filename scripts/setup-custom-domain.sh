#!/bin/bash
# Cloud Run 自定义域名配置脚本
# [2025-01-27] 自动配置 Cloud Run 自定义域名
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}

# 域名配置（请修改为你的域名）
API_DOMAIN=${API_DOMAIN:-""}
FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-""}

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Cloud Run 自定义域名配置脚本          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 检查 gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI 未安装${NC}"
    exit 1
fi

# 设置项目
gcloud config set project ${PROJECT_ID}

# 输入域名
if [ -z "$API_DOMAIN" ]; then
    read -p "请输入后端 API 域名（如: api.fivelionshvac.com）: " API_DOMAIN
fi

if [ -z "$FRONTEND_DOMAIN" ]; then
    read -p "请输入前端域名（如: app.fivelionshvac.com）: " FRONTEND_DOMAIN
fi

echo ""
echo -e "${GREEN}配置域名映射...${NC}"
echo -e "后端: ${YELLOW}${API_DOMAIN}${NC}"
echo -e "前端: ${YELLOW}${FRONTEND_DOMAIN}${NC}"
echo ""

# 映射后端域名
echo -e "${BLUE}[后端] 创建域名映射...${NC}"
gcloud run domain-mappings create \
  --service=${BACKEND_SERVICE} \
  --domain=${API_DOMAIN} \
  --region=${REGION} \
  --project=${PROJECT_ID} || {
    echo -e "${YELLOW}⚠️  后端域名映射可能已存在${NC}"
}

# 映射前端域名
echo -e "${BLUE}[前端] 创建域名映射...${NC}"
gcloud run domain-mappings create \
  --service=${FRONTEND_SERVICE} \
  --domain=${FRONTEND_DOMAIN} \
  --region=${REGION} \
  --project=${PROJECT_ID} || {
    echo -e "${YELLOW}⚠️  前端域名映射可能已存在${NC}"
}

echo ""
echo -e "${GREEN}✅ 域名映射已创建！${NC}"
echo ""

# 获取 DNS 记录
echo -e "${YELLOW}📝 请在 cPanel 中添加以下 DNS 记录：${NC}"
echo ""

echo -e "${BLUE}=== 后端 API 域名 (${API_DOMAIN}) ===${NC}"
gcloud run domain-mappings describe ${API_DOMAIN} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="table(status.conditions[0].message)" 2>/dev/null || \
  echo "类型: CNAME"
echo "名称: $(echo ${API_DOMAIN} | cut -d'.' -f1)"
echo "值: ghs.googlehosted.com."
echo ""

echo -e "${BLUE}=== 前端域名 (${FRONTEND_DOMAIN}) ===${NC}"
gcloud run domain-mappings describe ${FRONTEND_DOMAIN} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="table(status.conditions[0].message)" 2>/dev/null || \
  echo "类型: CNAME"
echo "名称: $(echo ${FRONTEND_DOMAIN} | cut -d'.' -f1)"
echo "值: ghs.googlehosted.com."
echo ""

echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 在 cPanel 的 'Zone Editor' 中添加上述 CNAME 记录"
echo "2. DNS 记录生效需要 5-30 分钟"
echo "3. 域名验证通过后，SSL 证书会自动配置"
echo ""
echo -e "${GREEN}完成后，访问以下链接验证：${NC}"
echo "  https://${API_DOMAIN}"
echo "  https://${FRONTEND_DOMAIN}"
echo ""

