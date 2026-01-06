-- AlterTable: Safely add missing columns to products table
-- Fixes 500 Error caused by Schema Drift

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "printable_areas" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(8,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit_cost" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gross_profit" DECIMAL(10,2) DEFAULT 0;
