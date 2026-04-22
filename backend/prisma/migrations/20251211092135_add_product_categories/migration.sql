-- [2025-12-11 09:21:35] AddProductCategories
-- 创建 product_categories 多对多关系表，支持产品多分类
-- 保留现有的 categoryId 作为主分类（向后兼容）

-- CreateTable: product_categories
CREATE TABLE IF NOT EXISTS "product_categories" (
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_categories_product_id_idx" ON "product_categories"("product_id");
CREATE INDEX IF NOT EXISTS "product_categories_category_id_idx" ON "product_categories"("category_id");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- [2025-12-11 09:21:35] 迁移现有数据：将每个产品的 categoryId 插入到 product_categories 表
INSERT INTO "product_categories" ("product_id", "category_id", "created_at")
SELECT "id", "category_id", "created_at"
FROM "products"
WHERE "category_id" IS NOT NULL
ON CONFLICT ("product_id", "category_id") DO NOTHING;
