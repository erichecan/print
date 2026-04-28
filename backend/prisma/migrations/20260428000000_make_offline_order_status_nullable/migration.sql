-- Make offline_orders.status nullable and update default value
-- (NOT NULL was already dropped in a hotfix; this migration records the schema state)
ALTER TABLE "offline_orders" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "offline_orders" ALTER COLUMN "status" SET DEFAULT '待客户确认';
