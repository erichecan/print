-- 直接解决失败的迁移状态
-- 修复时间: 2026-01-06T23:20:00.000Z
-- 迁移名称: 20250131_add_color_size_overrides

-- 方法 1: 如果表已存在，标记迁移为已应用
-- 检查表是否存在
DO $$
BEGIN
    -- 检查 order_item_colors 表是否存在
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_item_colors'
    ) THEN
        -- 表已存在，标记迁移为已应用
        UPDATE "_prisma_migrations"
        SET finished_at = NOW(),
            applied_steps_count = 1
        WHERE migration_name = '20250131_add_color_size_overrides'
        AND finished_at IS NULL;
        
        RAISE NOTICE '迁移已标记为已应用（表已存在）';
    ELSE
        -- 表不存在，标记迁移为回滚
        DELETE FROM "_prisma_migrations"
        WHERE migration_name = '20250131_add_color_size_overrides'
        AND finished_at IS NULL;
        
        RAISE NOTICE '迁移已标记为回滚（表不存在）';
    END IF;
END $$;

-- 显示当前迁移状态
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20250131_add_color_size_overrides'
ORDER BY started_at DESC
LIMIT 1;

