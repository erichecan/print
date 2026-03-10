#!/bin/bash
# 一键同步 Cloud SQL 生产库 → 开发库（基于每日 GCS 快照）
# 2026-03-06 10:20:00
#
# 设计目标：
# - 从 GCS 备份桶（{PROJECT_ID}-db-backups/daily/*.sql.gz）选取一个快照
# - 使用 gcloud sql import sql 将快照导入「开发数据库」（独立于生产）
# - 默认只覆盖 DEV_DB_NAME，不会对生产库执行任何 DROP/RESET 操作
#
# 使用示例：
#   # 默认项目（gcloud config）、实例 print-main-db、开发库 suvernireplus_dev、最新快照：
#   ./scripts/clone-prod-to-dev.sh
#
#   # 指定项目 / 实例 / 开发库 / 指定日期快照：
#   GCP_PROJECT_ID=print-482914 \
#   DEV_INSTANCE_NAME=print-main-db \
#   DEV_DB_NAME=suvernireplus_dev \
#   SNAPSHOT_DATE=20260306 \
#   ./scripts/clone-prod-to-dev.sh
#
# 重要安全保证：
# - 仅对 DEV_DB_NAME 操作；若检测到 DEV_DB_NAME 为 suvernireplus（生产库名）则直接拒绝执行
# - 不直接连接生产数据库，而是只读取 GCS 中已导出的 .sql.gz 文件

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔁 Cloud SQL 生产库 → 开发库 同步脚本${NC}"
echo ""

# --------------------------------------------------------------------
# 基本配置
# --------------------------------------------------------------------

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo -e "${RED}❌ 无法确定 GCP 项目 ID，请先设置 GCP_PROJECT_ID 或运行：gcloud config set project <PROJECT_ID>${NC}"
  exit 1
fi

REGION=${GCP_REGION:-us-central1}
BACKUP_BUCKET=${BACKUP_BUCKET:-${PROJECT_ID}-db-backups}

# 生产实例名仅用于日志（快照已由 Cloud Function 负责）
PROD_INSTANCE_NAME=${PROD_INSTANCE_NAME:-print-main-db}

# 开发实例 / 数据库名（默认：与生产实例相同，但数据库名为 suvernireplus_dev）
DEV_INSTANCE_NAME=${DEV_INSTANCE_NAME:-print-main-db}
DEV_DB_NAME=${DEV_DB_NAME:-suvernireplus_dev}

# 防呆：禁止把 DEV_DB_NAME 设成生产库名 suvernireplus
if [ "$DEV_DB_NAME" = "suvernireplus" ]; then
  echo -e "${RED}❌ DEV_DB_NAME 被配置为 'suvernireplus'（生产库名），为避免误覆盖生产数据，脚本已拒绝执行。${NC}"
  echo "请改用其它名称，例如：DEV_DB_NAME=suvernireplus_dev"
  exit 1
fi

SNAPSHOT_DATE=${SNAPSHOT_DATE:-""} # 可选：YYYYMMDD

echo -e "Project ID: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Region:     ${YELLOW}${REGION}${NC}"
echo -e "Bucket:     ${YELLOW}gs://${BACKUP_BUCKET}${NC}"
echo -e "Prod inst:  ${YELLOW}${PROD_INSTANCE_NAME}${NC} (仅用于说明)"
echo -e "Dev inst:   ${YELLOW}${DEV_INSTANCE_NAME}${NC}"
echo -e "Dev DB:     ${YELLOW}${DEV_DB_NAME}${NC}"
echo ""

# --------------------------------------------------------------------
# 前置检查
# --------------------------------------------------------------------

if ! command -v gcloud >/dev/null 2>&1; then
  echo -e "${RED}❌ 未找到 gcloud 命令，请先安装并配置 gcloud CLI。${NC}"
  exit 1
fi

if ! command -v gsutil >/dev/null 2>&1; then
  echo -e "${RED}❌ 未找到 gsutil 命令，请先安装 Google Cloud SDK（包含 gsutil）。${NC}"
  exit 1
fi

echo -e "${GREEN}🔎 检查备份桶是否存在...${NC}"
if ! gsutil ls -b "gs://${BACKUP_BUCKET}" >/dev/null 2>&1; then
  echo -e "${RED}❌ 备份桶 gs://${BACKUP_BUCKET} 不存在。${NC}"
  echo "请先运行 scripts/setup-gcp-resources.sh 和 scripts/setup-db-backup-scheduler.sh，或参考 docs/backup-restore.md。"
  exit 1
fi

echo -e "${GREEN}🔎 检查 Cloud SQL 实例 ${DEV_INSTANCE_NAME} 是否存在...${NC}"
if ! gcloud sql instances describe "${DEV_INSTANCE_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo -e "${RED}❌ Cloud SQL 实例 ${DEV_INSTANCE_NAME} 不存在，请先在控制台创建，或调整 DEV_INSTANCE_NAME。${NC}"
  exit 1
fi

echo -e "${GREEN}🔎 检查开发数据库 ${DEV_DB_NAME} 是否存在（若不存在将自动创建）...${NC}"
if ! gcloud sql databases describe "${DEV_DB_NAME}" --instance="${DEV_INSTANCE_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo -e "${YELLOW}ℹ️ 开发数据库 ${DEV_DB_NAME} 不存在，正在创建...${NC}"
  gcloud sql databases create "${DEV_DB_NAME}" --instance="${DEV_INSTANCE_NAME}" --project="${PROJECT_ID}"
else
  echo -e "${GREEN}✅ 开发数据库 ${DEV_DB_NAME} 已存在，将在其上导入快照（通常会覆盖其中的数据）。${NC}"
fi

# --------------------------------------------------------------------
# 选择快照文件
# --------------------------------------------------------------------

echo -e "${GREEN}📂 查找可用快照（daily/*.sql.gz）...${NC}"

SNAPSHOT_PREFIX="gs://${BACKUP_BUCKET}/daily"

if [ -n "$SNAPSHOT_DATE" ]; then
  SNAPSHOT_URI="${SNAPSHOT_PREFIX}/${SNAPSHOT_DATE}.sql.gz"
  if ! gsutil ls "${SNAPSHOT_URI}" >/dev/null 2>&1; then
    echo -e "${RED}❌ 指定日期 ${SNAPSHOT_DATE} 的快照不存在：${SNAPSHOT_URI}${NC}"
    exit 1
  fi
else
  # 选取最新的一个 daily/*.sql.gz（星号传给 gsutil 做 GCS 匹配，不要用 shell 展开）
  # gsutil ls -l 输出类似：    12345  2026-03-06T07:00:00Z  gs://bucket/daily/20260306.sql.gz
  LATEST_LINE=$(gsutil ls -l "${SNAPSHOT_PREFIX}/*.sql.gz" 2>/dev/null | grep -v TOTAL | sort -k2 | tail -n 1 || true)
  if [ -z "${LATEST_LINE}" ]; then
    echo -e "${RED}❌ 未在 ${SNAPSHOT_PREFIX}/ 下找到任何 .sql.gz 快照文件。${NC}"
    echo "请先确认 Cloud Function db-export 已成功运行一次。"
    exit 1
  fi
  SNAPSHOT_URI=$(echo "${LATEST_LINE}" | awk '{print $3}')
  SNAPSHOT_DATE=$(basename "${SNAPSHOT_URI}" .sql.gz)
fi

echo -e "${GREEN}✅ 将使用快照：${YELLOW}${SNAPSHOT_URI}${NC}"
echo ""

# --------------------------------------------------------------------
# 用户确认
# --------------------------------------------------------------------

echo -e "${YELLOW}⚠️  即将在实例 ${DEV_INSTANCE_NAME} 的数据库 ${DEV_DB_NAME} 上导入上述快照。${NC}"
echo -e "${YELLOW}⚠️  这不会修改生产库，但会覆盖开发库中的数据，请确保这是你期望的操作。${NC}"
read -p "确认继续？(yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "已取消操作。"
  exit 0
fi

# --------------------------------------------------------------------
# 执行导入
# --------------------------------------------------------------------

echo -e "${GREEN}🚀 开始导入快照到开发数据库...${NC}"
gcloud sql import sql "${DEV_INSTANCE_NAME}" "${SNAPSHOT_URI}" \
  --database="${DEV_DB_NAME}" \
  --project="${PROJECT_ID}" \
  --quiet

echo ""
echo -e "${GREEN}🎉 导入完成！${NC}"
echo -e "  - 实例：${YELLOW}${DEV_INSTANCE_NAME}${NC}"
echo -e "  - 数据库：${YELLOW}${DEV_DB_NAME}${NC}"
echo -e "  - 快照：${YELLOW}${SNAPSHOT_URI}${NC}"
echo ""
echo -e "${YELLOW}提示：${NC} 本地开发时，只需将 .env 或 DATABASE_URL 指向 Cloud SQL 开发库（而不是生产库），即可在真实数据上安全测试。"

