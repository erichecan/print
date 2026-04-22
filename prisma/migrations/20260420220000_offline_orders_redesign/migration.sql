-- =============================================================================
-- Migration: offline_orders_redesign
-- Date:      2026-04-20
-- Purpose:   订单管理列表改造 + 创建流程改造
--   1. OfflineOrder 新增 type / invoice_status / total_amount 三列
--   2. status 列：从 OfflineOrderStatus enum 改成 TEXT，并按映射表迁移老值
--   3. 删除 OfflineOrderStatus enum 类型
--   4. 新增 offline_order_status_options 表 + 预置 20 条系统选项
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. 新增 3 个普通字段（type / invoice_status / total_amount）
-- -------------------------------------------------------------------------
ALTER TABLE "offline_orders"
  ADD COLUMN IF NOT EXISTS "type"           TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_status" TEXT  NOT NULL DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS "total_amount"   DECIMAL(12,2);

-- -------------------------------------------------------------------------
-- 2. status 列从 enum 迁移到 TEXT
--    思路：先加 status_new TEXT 列 → UPDATE 按映射表转值 → DROP 旧列 → RENAME
--    同时保留原有 idx_offline_orders_status 索引（自动跟随 rename）
-- -------------------------------------------------------------------------
ALTER TABLE "offline_orders"
  ADD COLUMN IF NOT EXISTS "status_new" TEXT;

UPDATE "offline_orders"
SET "status_new" = CASE "status"::text
  WHEN 'ACTIVE'    THEN '待确认订单'
  WHEN 'PRINTED'   THEN '待取货'
  WHEN 'COMPLETED' THEN '已完成'
  WHEN 'CANCELLED' THEN '已取消'
  WHEN 'REMINDER'  THEN '需通知'
  ELSE '待确认订单'
END
WHERE "status_new" IS NULL;

ALTER TABLE "offline_orders" DROP COLUMN "status";
ALTER TABLE "offline_orders" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "offline_orders" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "offline_orders" ALTER COLUMN "status" SET DEFAULT '待确认订单';

-- 重建 status 索引（drop column 时索引被自动删除）
CREATE INDEX IF NOT EXISTS "offline_orders_status_idx" ON "offline_orders"("status");

-- -------------------------------------------------------------------------
-- 3. 删除 OfflineOrderStatus enum 类型（必须在所有引用都被去掉之后）
-- -------------------------------------------------------------------------
DROP TYPE IF EXISTS "OfflineOrderStatus";

-- -------------------------------------------------------------------------
-- 4. 新增 offline_order_status_options 表
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "offline_order_status_options" (
  "id"         TEXT         PRIMARY KEY,
  "value"      TEXT         NOT NULL,
  "label"      TEXT         NOT NULL,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "is_system"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offline_order_status_options_value_key"
  ON "offline_order_status_options"("value");
CREATE INDEX IF NOT EXISTS "offline_order_status_options_sort_order_idx"
  ON "offline_order_status_options"("sort_order");

-- -------------------------------------------------------------------------
-- 5. 预置 20 条系统选项（按订单生命周期顺序排）
--    id 使用确定性字符串方便幂等；isSystem=true 表示前端不可删
-- -------------------------------------------------------------------------
INSERT INTO "offline_order_status_options"
  ("id", "value", "label", "sort_order", "is_system", "created_at", "updated_at")
VALUES
  ('sys_status_01', '待付定金',      '待付定金',      10,  TRUE, NOW(), NOW()),
  ('sys_status_02', '待确认订单',    '待确认订单',    20,  TRUE, NOW(), NOW()),
  ('sys_status_03', '需弄设计图',    '需弄设计图',    30,  TRUE, NOW(), NOW()),
  ('sys_status_04', '设计样品中',    '设计样品中',    40,  TRUE, NOW(), NOW()),
  ('sys_status_05', '待确认设计',    '待确认设计',    50,  TRUE, NOW(), NOW()),
  ('sys_status_06', '已确认设计',    '已确认设计',    60,  TRUE, NOW(), NOW()),
  ('sys_status_07', '待确认logo',    '待确认logo',    70,  TRUE, NOW(), NOW()),
  ('sys_status_08', '已确认logo',    '已确认logo',    80,  TRUE, NOW(), NOW()),
  ('sys_status_09', '等出图',        '等出图',        90,  TRUE, NOW(), NOW()),
  ('sys_status_10', '等客人发图',    '等客人发图',    100, TRUE, NOW(), NOW()),
  ('sys_status_11', '等客人确认',    '等客人确认',    110, TRUE, NOW(), NOW()),
  ('sys_status_12', '等edwin',       '等edwin',       120, TRUE, NOW(), NOW()),
  ('sys_status_13', '待出图/出货',   '待出图/出货',   130, TRUE, NOW(), NOW()),
  ('sys_status_14', '需订货',        '需订货',        140, TRUE, NOW(), NOW()),
  ('sys_status_15', '已订货',        '已订货',        150, TRUE, NOW(), NOW()),
  ('sys_status_16', '需通知',        '需通知',        160, TRUE, NOW(), NOW()),
  ('sys_status_17', '已通知取货',    '已通知取货',    170, TRUE, NOW(), NOW()),
  ('sys_status_18', '待取货',        '待取货',        180, TRUE, NOW(), NOW()),
  ('sys_status_19', '已完成',        '已完成',        190, TRUE, NOW(), NOW()),
  ('sys_status_20', '已取消',        '已取消',        200, TRUE, NOW(), NOW())
ON CONFLICT ("value") DO NOTHING;
