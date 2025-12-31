#!/bin/bash
# 监控 Cloud Build 部署状态

BUILD_ID=${1:-"9131ff61-8ee1-4437-8841-07e472ba61c4"}
PROJECT_ID="moonlit-gamma-479502-r6"

echo "=== 监控 Cloud Build 部署 ==="
echo "构建 ID: $BUILD_ID"
echo "项目: $PROJECT_ID"
echo ""
echo "查看完整日志:"
echo "https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=234065158862"
echo ""

while true; do
  STATUS=$(gcloud builds describe $BUILD_ID \
    --project=$PROJECT_ID \
    --format="value(status)" 2>/dev/null)
  
  if [ -z "$STATUS" ]; then
    echo "⏳ 等待构建信息..."
    sleep 5
    continue
  fi
  
  TIMESTAMP=$(date '+%H:%M:%S')
  
  case $STATUS in
    QUEUED)
      echo "[$TIMESTAMP] ⏳ 状态: QUEUED - 排队中，等待执行..."
      ;;
    WORKING)
      echo "[$TIMESTAMP] 🔨 状态: WORKING - 正在构建..."
      ;;
    SUCCESS)
      echo "[$TIMESTAMP] ✅ 状态: SUCCESS - 部署成功！"
      echo ""
      echo "🎉 部署完成！"
      echo ""
      echo "检查服务状态:"
      echo "  gcloud run services list --region=us-central1"
      break
      ;;
    FAILURE|CANCELLED|TIMEOUT|INTERNAL_ERROR)
      echo "[$TIMESTAMP] ❌ 状态: $STATUS - 部署失败"
      echo ""
      echo "查看错误日志:"
      echo "  https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=234065158862"
      break
      ;;
    *)
      echo "[$TIMESTAMP] 📊 状态: $STATUS"
      ;;
  esac
  
  if [ "$STATUS" = "SUCCESS" ] || [[ "$STATUS" == *"FAILURE"* ]] || [[ "$STATUS" == *"CANCELLED"* ]]; then
    break
  fi
  
  sleep 10
done

