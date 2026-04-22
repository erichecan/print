-- AlterTable: Add new fields to offline_order_size_fees
-- 添加尺码类型、显示顺序、是否启用字段

-- Step 1: Add new columns (with defaults for existing rows)
ALTER TABLE "offline_order_size_fees" 
ADD COLUMN IF NOT EXISTS "size_type" TEXT DEFAULT 'Adult',
ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;

-- Step 2: Update id column to use uuid() if it doesn't already
-- Check if id column exists and has default
DO $$
BEGIN
  -- If id doesn't have a default, set it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offline_order_size_fees' 
    AND column_name = 'id' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "offline_order_size_fees" 
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS "offline_order_size_fees_size_type_idx" ON "offline_order_size_fees"("size_type");
CREATE INDEX IF NOT EXISTS "offline_order_size_fees_is_active_idx" ON "offline_order_size_fees"("is_active");

-- Step 4: Update existing rows to set display_order based on size
UPDATE "offline_order_size_fees"
SET "display_order" = CASE 
  WHEN "size" = 'YS' THEN 1
  WHEN "size" = 'YM' THEN 2
  WHEN "size" = 'YL' THEN 3
  WHEN "size" = 'XS' THEN 4
  WHEN "size" = 'S' THEN 5
  WHEN "size" = 'M' THEN 6
  WHEN "size" = 'L' THEN 7
  WHEN "size" = 'XL' THEN 8
  WHEN "size" = '2XL' THEN 9
  WHEN "size" = '3XL' THEN 10
  WHEN "size" = '4XL' THEN 11
  WHEN "size" = '5XL' THEN 12
  ELSE 999
END
WHERE "size" IN ('YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL');

-- Step 5: Update size_type for Youth sizes
UPDATE "offline_order_size_fees"
SET "size_type" = 'Youth'
WHERE "size" IN ('YS', 'YM', 'YL');

-- Step 6: Ensure updated_at has default
ALTER TABLE "offline_order_size_fees"
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

