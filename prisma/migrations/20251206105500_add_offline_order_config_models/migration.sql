-- [2025-12-06 17:55:00] PRD v2.0: Add offline order configuration models
-- CreateTable: 扩展 OfflineOrder 表字段
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "order_notes" TEXT;
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "dst_file_fee" DECIMAL(10,2);
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "reference_number" TEXT;

-- CreateTable: OfflineOrderProduct
CREATE TABLE IF NOT EXISTS "offline_order_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "is_customer_owned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_order_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OfflineOrderColor
CREATE TABLE IF NOT EXISTS "offline_order_colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_order_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OfflineOrderSizeFee
CREATE TABLE IF NOT EXISTS "offline_order_size_fees" (
    "id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "additional_fee" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_order_size_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OfflineOrderProductColorSize
CREATE TABLE IF NOT EXISTS "offline_order_product_color_sizes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_order_product_color_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: OfflineOrderProduct
CREATE INDEX IF NOT EXISTS "offline_order_products_is_customer_owned_idx" ON "offline_order_products"("is_customer_owned");

-- CreateIndex: OfflineOrderColor (unique constraint for name)
CREATE UNIQUE INDEX IF NOT EXISTS "offline_order_colors_name_key" ON "offline_order_colors"("name");

-- CreateIndex: OfflineOrderSizeFee (unique constraint for size)
CREATE UNIQUE INDEX IF NOT EXISTS "offline_order_size_fees_size_key" ON "offline_order_size_fees"("size");

-- CreateIndex: OfflineOrderProductColorSize
CREATE UNIQUE INDEX IF NOT EXISTS "offline_order_product_color_sizes_product_id_color_id_size_key" ON "offline_order_product_color_sizes"("product_id", "color_id", "size");
CREATE INDEX IF NOT EXISTS "offline_order_product_color_sizes_product_id_color_id_idx" ON "offline_order_product_color_sizes"("product_id", "color_id");
CREATE INDEX IF NOT EXISTS "offline_order_product_color_sizes_is_available_idx" ON "offline_order_product_color_sizes"("is_available");

-- AddForeignKey: OfflineOrderProductColorSize -> OfflineOrderProduct
ALTER TABLE "offline_order_product_color_sizes" ADD CONSTRAINT "offline_order_product_color_sizes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "offline_order_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: OfflineOrderProductColorSize -> OfflineOrderColor
ALTER TABLE "offline_order_product_color_sizes" ADD CONSTRAINT "offline_order_product_color_sizes_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "offline_order_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

