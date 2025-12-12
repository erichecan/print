#!/bin/bash
# [2025-01-31 20:00:00] 在生产环境中运行数据库迁移脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}
REGION=${GCP_REGION:-us-central1}
REPOSITORY=${ARTIFACT_REGISTRY:-print-main}
BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:latest"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     生产环境数据库迁移脚本              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# 检查项目 ID
if [ -z "$PROJECT_ID" ]; then
    read -p "请输入 GCP 项目 ID: " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ 错误: 必须提供项目 ID${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}项目 ID: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# 方法1: 使用 Cloud Run Job（推荐）
echo -e "${GREEN}📋 创建 Cloud Run Job 执行迁移...${NC}"

JOB_NAME="db-migrate-job"
if gcloud run jobs describe ${JOB_NAME} --region=${REGION} &> /dev/null; then
    echo -e "${YELLOW}⚠️  Job 已存在，更新中...${NC}"
    gcloud run jobs update ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="node" \
      --args="scripts/run-migrations.js" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
else
    echo -e "${YELLOW}创建新的 Cloud Run Job...${NC}"
    gcloud run jobs create ${JOB_NAME} \
      --image ${BACKEND_IMAGE} \
      --region ${REGION} \
      --set-secrets DATABASE_URL=database-url:latest \
      --set-env-vars NODE_ENV=production \
      --command="node" \
      --args="scripts/run-migrations.js" \
      --max-retries 1 \
      --memory 512Mi \
      --cpu 1 \
      --task-timeout 300 \
      --quiet
fi

echo -e "${GREEN}✅ Job 已创建/更新${NC}"

# 执行 Job
echo -e "${YELLOW}执行迁移 Job...${NC}"
echo -e "${BLUE}这可能需要 1-2 分钟...${NC}"

EXECUTION_NAME=$(gcloud run jobs execute ${JOB_NAME} --region=${REGION} --format='value(metadata.name)' --quiet 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 迁移 Job 已启动: ${EXECUTION_NAME}${NC}"
    echo -e "${YELLOW}等待执行完成...${NC}"
    sleep 10
    
    # 查看执行结果
    echo ""
    echo -e "${BLUE}迁移执行结果:${NC}"
    gcloud run jobs executions describe ${EXECUTION_NAME} --region=${REGION} --format='table(metadata.name,status.conditions[0].type,status.completionTime)' 2>/dev/null || echo "执行中..."
    
    echo ""
    echo -e "${GREEN}✅ 迁移已提交执行${NC}"
    echo -e "${YELLOW}查看完整日志:${NC}"
    echo "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${JOB_NAME}\" --limit 50"
else
    echo -e "${RED}❌ 迁移 Job 执行失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         迁移已提交执行                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
