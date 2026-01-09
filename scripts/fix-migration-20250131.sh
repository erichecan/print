#!/bin/bash
# 修复失败的迁移 20250131_add_color_size_overrides
# 修复时间: 2026-01-06T23:50:00.000Z

set -e

# 从环境变量或参数获取数据库 URL
DATABASE_URL="${1:-${DATABASE_URL}}"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: 需要提供 DATABASE_URL"
    echo "用法: DATABASE_URL=your_db_url ./scripts/fix-migration-20250131.sh"
    echo "或者: ./scripts/fix-migration-20250131.sh your_db_url"
    exit 1
fi

MIGRATION_NAME="20250131_add_color_size_overrides"
TABLE1="order_item_colors"
TABLE2="order_item_color_size_overrides"

echo "🔧 修复失败的迁移: ${MIGRATION_NAME}"
echo "=========================================="
echo ""

echo "步骤 1: 检查表是否存在..."
table1_exists=$(psql "${DATABASE_URL}" -t -c "
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '${TABLE1}'
);
" 2>&1 | tr -d ' \n')

table2_exists=$(psql "${DATABASE_URL}" -t -c "
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '${TABLE2}'
);
" 2>&1 | tr -d ' \n')

echo "  ${TABLE1}: ${table1_exists}"
echo "  ${TABLE2}: ${table2_exists}"

if [ "${table1_exists}" = "t" ] && [ "${table2_exists}" = "t" ]; then
    echo ""
    echo "步骤 2: 表已存在，检查迁移状态..."
    migration_status=$(psql "${DATABASE_URL}" -t -c "
    SELECT 
        CASE 
            WHEN finished_at IS NULL THEN 'failed'
            WHEN applied_steps_count = 0 THEN 'incomplete'
            ELSE 'completed'
        END as status
    FROM \"_prisma_migrations\"
    WHERE migration_name = '${MIGRATION_NAME}';
    " 2>&1 | tr -d ' \n')
    
    echo "  当前迁移状态: ${migration_status}"
    
    if [ "${migration_status}" != "completed" ]; then
        echo ""
        echo "步骤 3: 标记迁移为已应用..."
        psql "${DATABASE_URL}" -c "
        INSERT INTO \"_prisma_migrations\" (
            migration_name,
            checksum,
            finished_at,
            started_at,
            applied_steps_count
        ) VALUES (
            '${MIGRATION_NAME}',
            '',
            NOW(),
            NOW(),
            1
        )
        ON CONFLICT (migration_name) DO UPDATE
        SET finished_at = COALESCE(\"_prisma_migrations\".finished_at, NOW()),
            applied_steps_count = CASE 
                WHEN \"_prisma_migrations\".applied_steps_count = 0 THEN 1 
                ELSE \"_prisma_migrations\".applied_steps_count 
            END,
            rolled_back_at = NULL
        WHERE \"_prisma_migrations\".finished_at IS NULL 
           OR \"_prisma_migrations\".applied_steps_count = 0;
        " 2>&1 | grep -v "INSERT\|UPDATE\|CONFLICT" || echo "  ✅ 已标记为已应用"
        
        echo ""
        echo "步骤 4: 验证迁移状态..."
        psql "${DATABASE_URL}" -c "
        SELECT 
            migration_name,
            CASE 
                WHEN finished_at IS NULL THEN '待执行'
                WHEN applied_steps_count = 0 THEN '需要修复'
                ELSE '已完成'
            END as status,
            started_at,
            finished_at,
            applied_steps_count
        FROM \"_prisma_migrations\"
        WHERE migration_name = '${MIGRATION_NAME}';
        " 2>&1
        
        echo ""
        echo "✅ 迁移状态已修复！"
    else
        echo ""
        echo "✅ 迁移状态正常，无需修复"
    fi
else
    echo ""
    echo "⚠️  表不存在，需要执行迁移"
    echo "请运行: npx prisma migrate deploy"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 完成！"

