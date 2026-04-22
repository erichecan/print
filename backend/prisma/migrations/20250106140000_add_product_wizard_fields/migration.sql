-- AlterTable: Add color_display_name to variants
ALTER TABLE "variants" ADD COLUMN IF NOT EXISTS "color_display_name" TEXT;

-- AlterTable: Add is_draft to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN NOT NULL DEFAULT false;

-- Add index for is_draft if needed (optional, for query performance)
CREATE INDEX IF NOT EXISTS "idx_products_is_draft" ON "products"("is_draft");

