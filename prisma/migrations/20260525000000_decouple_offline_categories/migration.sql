-- CreateTable: offline_categories (independent copy of categories for offline product management)
CREATE TABLE "offline_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offline_categories_slug_key" ON "offline_categories"("slug");
CREATE INDEX "offline_categories_parent_id_idx" ON "offline_categories"("parent_id");

-- Copy categories that are referenced by offline_order_products (and their parent chain) with same UUIDs
INSERT INTO "offline_categories" ("id", "name", "slug", "description", "image_url", "parent_id", "sort_order", "is_active", "created_at", "updated_at")
SELECT c."id", c."name", c."slug", c."description", c."image_url", c."parent_id", c."sort_order", c."is_active", c."created_at", c."updated_at"
FROM "categories" c
WHERE c."id" IN (
    -- Direct categories used by offline products
    SELECT DISTINCT "category_id" FROM "offline_order_products" WHERE "category_id" IS NOT NULL
    UNION
    -- Parent categories of those categories
    SELECT DISTINCT p."id" FROM "categories" p
    INNER JOIN "categories" ch ON ch."parent_id" = p."id"
    WHERE ch."id" IN (
        SELECT DISTINCT "category_id" FROM "offline_order_products" WHERE "category_id" IS NOT NULL
    )
)
ON CONFLICT ("id") DO NOTHING;

-- Fix self-referential parent_id: set parent_id to NULL for rows whose parent wasn't copied
UPDATE "offline_categories"
SET "parent_id" = NULL
WHERE "parent_id" IS NOT NULL
  AND "parent_id" NOT IN (SELECT "id" FROM "offline_categories");

-- Drop old FK from offline_order_products → categories
ALTER TABLE "offline_order_products" DROP CONSTRAINT IF EXISTS "offline_order_products_category_id_fkey";

-- Add new FK from offline_order_products → offline_categories
ALTER TABLE "offline_order_products" ADD CONSTRAINT "offline_order_products_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "offline_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for self-referential tree
ALTER TABLE "offline_categories" ADD CONSTRAINT "offline_categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "offline_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
