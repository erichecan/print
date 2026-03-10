#!/bin/bash
# 2026-03-06: 当 api-url 的 latest 版本被 DESTROYED 导致部署失败时，先运行此脚本再部署
# 作用：用当前后端 URL 写入 api-url 新版本，使 latest 指向有效版本
set -e

PROJECT_ID=${GCP_PROJECT_ID:-print-482914}
REGION=${GCP_REGION:-us-central1}
BACKEND_SERVICE=${BACKEND_SERVICE_NAME:-print-main-backend}
FRONTEND_SERVICE=${FRONTEND_SERVICE_NAME:-print-main-frontend}

echo "🔍 获取当前后端 URL..."
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)')
API_URL="${BACKEND_URL}/api"
echo "   Backend URL: $BACKEND_URL"
echo "   API URL (写入 secret): $API_URL"

echo "🔐 写入 api-url 新版本（使 latest 有效）..."
echo -n "$API_URL" | gcloud secrets versions add api-url --data-file=- --project="$PROJECT_ID"
echo "✅ api-url 已更新，可重新执行前端部署/更新。"

echo ""
echo "如需仅更新前端 min-instances，可执行："
echo "  gcloud run services update $FRONTEND_SERVICE --region $REGION --min-instances 1 --project $PROJECT_ID"
echo ""
echo "--- 提示：如何确认 gcloud 命令是否还在跑、结束后要不要再部署 ---"
echo "  1. 看终端：若最后一行是 'Deploying...' 或 'Routing traffic...' 且无新输出，说明还在跑；出现 'Done.' 或 'Service [xxx] has been deployed' 即结束。"
echo "  2. 结束后若只是改了 min-instances，无需再全量部署；若要做代码/镜像更新，再执行 ./scripts/deploy-gcp.sh。"
echo "  3. 查当前配置： gcloud run services describe $FRONTEND_SERVICE --region $REGION --project $PROJECT_ID --format='yaml(spec.template.metadata.annotations)'"
