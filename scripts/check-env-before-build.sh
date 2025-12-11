#!/bin/bash
# [2025-01-30 18:15:00] 构建前环境变量检查脚本
# 在 Docker 构建前检查必需的环境变量，防止构建失败

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔍 构建前环境变量检查...${NC}"

# 检查必需的环境变量
ERRORS=0

# 1. 检查 NEXT_PUBLIC_API_URL
if [ -z "$NEXT_PUBLIC_API_URL" ] || [ "$NEXT_PUBLIC_API_URL" = "" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_API_URL 未设置${NC}"
    ERRORS=$((ERRORS + 1))
elif [[ "$NEXT_PUBLIC_API_URL" == *"localhost"* ]] || [[ "$NEXT_PUBLIC_API_URL" == *"127.0.0.1"* ]]; then
    echo -e "${RED}❌ NEXT_PUBLIC_API_URL 包含 localhost (生产环境不允许): ${NEXT_PUBLIC_API_URL}${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}${NC}"
fi

# 2. 检查 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY（生产环境必需）
if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ] || [ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" = "" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置${NC}"
    echo -e "${YELLOW}   提示: 从 Secret Manager 读取: gcloud secrets versions access latest --secret=stripe-publishable-key${NC}"
    ERRORS=$((ERRORS + 1))
elif [[ ! "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" =~ ^pk_(test|live)_ ]]; then
    echo -e "${RED}❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 格式错误（必须以 pk_test_ 或 pk_live_ 开头）${NC}"
    echo -e "${RED}   当前值: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}...${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}...${NC}"
fi

# 如果有关键错误，退出
if [ $ERRORS -gt 0 ]; then
    echo -e ""
    echo -e "${RED}❌ 环境变量检查失败 (${ERRORS} 个错误)${NC}"
    echo -e "${YELLOW}构建已中止，请修复环境变量后重试${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 所有必需的环境变量已正确配置${NC}"
exit 0
