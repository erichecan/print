#!/bin/bash
# 修复所有迁移状态 - 检查表是否存在并标记迁移
# 修复时间: 2026-01-06T23:30:00.000Z

set -e

DATABASE_URL="${1:-postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require}"

echo "🔧 修复所有迁移状态"
echo "=========================================="
echo ""

# 迁移名称和对应的表名（使用数组）
MIGRATIONS=(
    "20251206122658_add_payment_methods:payment_methods"
    "20251211092135_add_product_categories:product_categories"
    "20251211230000_add_artwork_categories_and_gcs_fields:artwork_categories"
    "20251208000001_add_design_share_fields:design_share_links"
    "20251208000000_add_design_lab_analytics:design_lab_analytics"
    "20251210000000_add_guest_messages:guest_messages"
)

echo "步骤 1: 检查并修复迁移状态..."
for migration_pair in "${MIGRATIONS[@]}"; do
    IFS=':' read -r migration_name table_name <<< "$migration_pair"
    echo ""
    echo "检查迁移: ${migration_name}"
    echo "对应表: ${table_name}"
    
    # 检查表是否存在
    table_exists=$(psql "${DATABASE_URL}" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${table_name}'
    );
    " 2>&1 | tr -d ' \n')
    
    # 检查迁移记录是否存在且已完成
    migration_finished=$(psql "${DATABASE_URL}" -t -c "
    SELECT EXISTS (
        SELECT FROM \"_prisma_migrations\"
        WHERE migration_name = '${migration_name}'
        AND finished_at IS NOT NULL
        AND applied_steps_count > 0
    );
    " 2>&1 | tr -d ' \n')
    
    if [ "${table_exists}" = "t" ] && [ "${migration_finished}" != "t" ]; then
        echo "  ✅ 表存在但迁移未记录，标记为已应用..."
        psql "${DATABASE_URL}" -c "
        INSERT INTO \"_prisma_migrations\" (migration_name, checksum, finished_at, started_at, applied_steps_count)
        VALUES ('${migration_name}', '', NOW(), NOW(), 1)
        ON CONFLICT (migration_name) DO UPDATE
        SET finished_at = COALESCE(\"_prisma_migrations\".finished_at, NOW()),
            applied_steps_count = CASE 
                WHEN \"_prisma_migrations\".applied_steps_count = 0 THEN 1 
                ELSE \"_prisma_migrations\".applied_steps_count 
            END
        WHERE \"_prisma_migrations\".finished_at IS NULL OR \"_prisma_migrations\".applied_steps_count = 0;
        " 2>&1 | grep -v "INSERT\|UPDATE\|CONFLICT" || echo "  ✅ 已标记为已应用"
    elif [ "${table_exists}" = "t" ] && [ "${migration_finished}" = "t" ]; then
        echo "  ✅ 表存在且迁移已记录"
    else
        echo "  ⚠️  表不存在，迁移需要执行"
    fi
done

echo ""
echo "步骤 2: 检查所有迁移状态..."
psql "${DATABASE_URL}" -c "
SELECT 
    migration_name, 
    CASE 
        WHEN finished_at IS NULL THEN '待执行'
        WHEN applied_steps_count = 0 THEN '需要修复'
        ELSE '已完成'
    END as status,
    finished_at
FROM \"_prisma_migrations\"
WHERE migration_name IN (
    '20251206122658_add_payment_methods',
    '20251211092135_add_product_categories',
    '20251211230000_add_artwork_categories_and_gcs_fields',
    '20251208000001_add_design_share_fields',
    '20251208000000_add_design_lab_analytics',
    '20251210000000_add_guest_messages'
)
ORDER BY started_at;
" 2>&1

echo ""
echo "=========================================="
echo "✅ 迁移状态修复完成！"
