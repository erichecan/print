-- 2026-04-24: Add stocking_status and purchase_status columns to offline_orders
-- 备货情况 and 订货情况 columns for the orders spreadsheet

ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "stocking_status" TEXT;
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "purchase_status" TEXT;

-- Also ensure previous inline-edit columns exist (applied manually earlier, idempotent)
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "invoice_status" TEXT NOT NULL DEFAULT 'No';
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(12,2);
