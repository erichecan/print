-- [2025-11-18 10:45:12] Catalog upload pipeline migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Product base price stored in cents + printable areas JSON
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0;
UPDATE "products"
SET "base_price_cents" = COALESCE(ROUND("base_price" * 100)::INTEGER, 0)
WHERE "base_price_cents" = 0;
ALTER TABLE "products" DROP COLUMN IF EXISTS "base_price";
ALTER TABLE "products" ALTER COLUMN "base_price_cents" DROP DEFAULT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "printable_areas" JSONB;

-- Rename product_variants table to variants and tighten schema
ALTER TABLE "product_variants" RENAME TO "variants";
UPDATE "variants" SET "color" = COALESCE("color", 'UNSET');
ALTER TABLE "variants" ALTER COLUMN "color" SET NOT NULL;
UPDATE "variants" SET "size" = COALESCE("size", 'ONE');
ALTER TABLE "variants" ALTER COLUMN "size" SET NOT NULL;

ALTER INDEX IF EXISTS "product_variants_pkey" RENAME TO "variants_pkey";
ALTER INDEX IF EXISTS "product_variants_sku_key" RENAME TO "variants_sku_key";
ALTER INDEX IF EXISTS "product_variants_product_id_idx" RENAME TO "variants_product_id_idx";

-- Refresh foreign keys to point at variants
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_variant_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_fkey";
ALTER TABLE "designs" DROP CONSTRAINT IF EXISTS "designs_product_variant_id_fkey";

ALTER TABLE "designs" RENAME COLUMN "product_variant_id" TO "variant_id";

CREATE INDEX IF NOT EXISTS "designs_variant_id_idx" ON "designs" ("variant_id");

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "designs"
  ADD CONSTRAINT "designs_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project status enum + table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus'
  ) THEN
    CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'READY_FOR_UPLOAD', 'SUBMITTED', 'ORDERED', 'ARCHIVED');
  END IF;
END $$;

-- [2025-11-18 11:18:45] Align FK columns with existing TEXT primary keys
CREATE TABLE IF NOT EXISTS "projects" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" TEXT,
  "product_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "order_id" TEXT,
  "name" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "canvas_state" JSONB NOT NULL,
  "preview_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" ("user_id");
CREATE INDEX IF NOT EXISTS "projects_product_id_idx" ON "projects" ("product_id");
CREATE INDEX IF NOT EXISTS "projects_variant_id_idx" ON "projects" ("variant_id");
CREATE INDEX IF NOT EXISTS "projects_order_id_idx" ON "projects" ("order_id");

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

