-- 2026-04-25: Add comment column to offline_order_assets
ALTER TABLE "offline_order_assets" ADD COLUMN IF NOT EXISTS "comment" TEXT;
