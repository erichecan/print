-- [2025-01-31 19:50:00] 添加订单项颜色级别印刷配置和尺码覆盖功能

-- CreateTable: OrderItemColor
CREATE TABLE IF NOT EXISTS "order_item_colors" (
    "id" SERIAL NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "color_code" TEXT NOT NULL,
    "color_name" TEXT NOT NULL,
    "allow_size_overrides" BOOLEAN NOT NULL DEFAULT false,
    "print_configs" JSONB NOT NULL DEFAULT '[]',
    "size_breakdown" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrderItemColorSizeOverride
CREATE TABLE IF NOT EXISTS "order_item_color_size_overrides" (
    "id" SERIAL NOT NULL,
    "order_item_color_id" INTEGER NOT NULL,
    "size_code" TEXT NOT NULL,
    "override_print_configs" JSONB NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_color_size_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_item_colors_order_item_id_color_code_key" ON "order_item_colors"("order_item_id", "color_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_item_colors_order_item_id_idx" ON "order_item_colors"("order_item_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_item_colors_color_code_idx" ON "order_item_colors"("color_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_item_color_size_overrides_order_item_color_id_size_code_key" ON "order_item_color_size_overrides"("order_item_color_id", "size_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_item_color_size_overrides_order_item_color_id_idx" ON "order_item_color_size_overrides"("order_item_color_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_item_color_size_overrides_size_code_idx" ON "order_item_color_size_overrides"("size_code");

-- AddForeignKey
ALTER TABLE "order_item_colors" ADD CONSTRAINT "order_item_colors_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_color_size_overrides" ADD CONSTRAINT "order_item_color_size_overrides_order_item_color_id_fkey" FOREIGN KEY ("order_item_color_id") REFERENCES "order_item_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
