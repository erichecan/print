#!/bin/bash
# 自动执行 SQL 解决失败的迁移
# 修复时间: 2026-01-06T23:25:00.000Z

set -e

DATABASE_URL="${1:-postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require}"
MIGRATION_NAME="20250131_add_color_size_overrides"

echo "🔧 自动解决失败的迁移: ${MIGRATION_NAME}"
echo "=========================================="
echo ""

# 步骤 1: 检查迁移当前状态
echo "步骤 1: 检查迁移当前状态..."
psql "${DATABASE_URL}" -c "
SELECT migration_name, started_at, finished_at, applied_steps_count, logs
FROM \"_prisma_migrations\"
WHERE migration_name = '${MIGRATION_NAME}'
ORDER BY started_at DESC
LIMIT 1;
" 2>&1 | grep -A 10 "${MIGRATION_NAME}" || echo "未找到迁移记录"

echo ""
echo "步骤 2: 检查表是否存在..."
TABLE_EXISTS=$(psql "${DATABASE_URL}" -t -c "
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_item_colors'
);
" 2>&1 | tr -d ' \n')

echo "order_item_colors 表存在: ${TABLE_EXISTS}"
echo ""

# 步骤 3: 根据表是否存在，执行相应的修复
if [ "${TABLE_EXISTS}" = "t" ]; then
    echo "✅ 表已存在，标记迁移为已应用..."
    psql "${DATABASE_URL}" -c "
    -- 更新迁移状态为已应用
    UPDATE \"_prisma_migrations\"
    SET finished_at = NOW(),
        applied_steps_count = 1
    WHERE migration_name = '${MIGRATION_NAME}'
    AND finished_at IS NULL;
    
    SELECT '迁移已标记为已应用' as result;
    " 2>&1
else
    echo "⚠️  表不存在，标记迁移为回滚（将删除失败的迁移记录）..."
    psql "${DATABASE_URL}" -c "
    -- 删除失败的迁移记录，允许重新应用
    DELETE FROM \"_prisma_migrations\"
    WHERE migration_name = '${MIGRATION_NAME}'
    AND finished_at IS NULL;
    
    SELECT '迁移已标记为回滚，可以重新应用' as result;
    " 2>&1
fi

echo ""
echo "步骤 4: 验证修复结果..."
psql "${DATABASE_URL}" -c "
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM \"_prisma_migrations\"
WHERE migration_name = '${MIGRATION_NAME}'
ORDER BY started_at DESC
LIMIT 1;
" 2>&1

echo ""
echo "步骤 5: 检查所有待执行的迁移..."
psql "${DATABASE_URL}" -c "
SELECT migration_name, started_at, finished_at
FROM \"_prisma_migrations\"
WHERE finished_at IS NULL
ORDER BY started_at;
" 2>&1 || echo "没有待执行的迁移"

echo ""
echo "=========================================="
echo "✅ 迁移状态修复完成！"
echo ""
echo "下一步: 重新部署服务以应用后续迁移"
echo "运行: ./deploy_clean.sh"

