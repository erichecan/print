#!/bin/bash
# Neon → GCS 每日备份脚本
# 执行方式：
#   本地测试：NEON_DATABASE_URL="postgresql://..." ./scripts/neon-backup.sh
#   Cloud Run Job：由 Cloud Scheduler 触发，DATABASE_URL 通过 Secret Manager 注入
#
# 依赖：pg_dump、gcloud CLI
# GCS 路径：gs://print-482914-images/neon-backups/
# 保留策略：30 天，自动清理更早的备份

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────────────────────
GCS_BUCKET="print-482914-images"
GCS_PREFIX="neon-backups"
RETENTION_DAYS=30

# Cloud Run Job 中使用 DATABASE_URL（由 Secret Manager 注入）
# 本地测试可覆盖：export NEON_DATABASE_URL="postgresql://..."
NEON_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-}}"

# ── 验证 ──────────────────────────────────────────────────────────────────────
if [ -z "$NEON_URL" ]; then
  echo "[ERROR] 数据库 URL 未设置。请设置 NEON_DATABASE_URL 或 DATABASE_URL 环境变量。"
  exit 1
fi

if ! echo "$NEON_URL" | grep -q "neon.tech\|postgresql://"; then
  echo "[WARN] DATABASE_URL 可能不是 Neon URL，请确认后继续..."
fi

# ── 备份 ──────────────────────────────────────────────────────────────────────
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="/tmp/neon-backup-${BACKUP_DATE}.dump"
GCS_PATH="gs://${GCS_BUCKET}/${GCS_PREFIX}/backup-${BACKUP_DATE}.dump"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ▶ 开始备份 Neon 数据库..."

pg_dump \
  "$NEON_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✓ pg_dump 完成，文件大小: ${BACKUP_SIZE}"

# ── 上传到 GCS ────────────────────────────────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ▶ 上传到 ${GCS_PATH}..."
gcloud storage cp "$BACKUP_FILE" "$GCS_PATH"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✓ 上传成功"

# ── 清理本地临时文件 ──────────────────────────────────────────────────────────
rm -f "$BACKUP_FILE"

# ── 清理 GCS 中超过保留期的旧备份 ────────────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ▶ 清理 ${RETENTION_DAYS} 天前的旧备份..."

# 计算截止日期（兼容 macOS 和 Linux）
if date -d "1 day ago" +%Y%m%d &>/dev/null 2>&1; then
  # Linux
  CUTOFF=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
else
  # macOS
  CUTOFF=$(date -v -${RETENTION_DAYS}d +%Y%m%d)
fi

DELETED=0
while IFS= read -r obj; do
  # 从文件名提取日期：backup-20260101-120000.dump → 20260101
  OBJ_DATE=$(basename "$obj" | grep -oE '[0-9]{8}' | head -1 || true)
  if [ -n "$OBJ_DATE" ] && [ "$OBJ_DATE" -lt "$CUTOFF" ] 2>/dev/null; then
    gcloud storage rm "$obj" && DELETED=$((DELETED + 1))
    echo "  已删除: $(basename "$obj")"
  fi
done < <(gcloud storage ls "gs://${GCS_BUCKET}/${GCS_PREFIX}/" 2>/dev/null || true)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✓ 清理完成，删除了 ${DELETED} 个旧备份"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✅ 备份完成！路径: ${GCS_PATH}"
