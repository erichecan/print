-- Add missing columns to products table
-- garment_type and is_customizable were in schema but never had a migration

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "garment_type" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_customizable" BOOLEAN NOT NULL DEFAULT true;
