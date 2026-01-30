-- CreateTable
CREATE TABLE "shipping_template_products" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_template_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_template_products_template_id_idx" ON "shipping_template_products"("template_id");

-- CreateIndex
CREATE INDEX "shipping_template_products_product_id_idx" ON "shipping_template_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_template_products_template_id_product_id_key" ON "shipping_template_products"("template_id", "product_id");

-- AddForeignKey
ALTER TABLE "shipping_template_products" ADD CONSTRAINT "shipping_template_products_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shipping_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_template_products" ADD CONSTRAINT "shipping_template_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
