-- CreateTable
CREATE TABLE "shipping_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "shipping_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rules" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "country" VARCHAR(10),
    "provinces" TEXT[],
    "postal_code_pattern" VARCHAR(20),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "season_tag" VARCHAR(50),
    "min_order_amount" DECIMAL(10,2),
    "max_order_amount" DECIMAL(10,2),
    "min_weight" DECIMAL(10,2),
    "max_weight" DECIMAL(10,2),
    "shipping_method" VARCHAR(50) NOT NULL,
    "estimated_days" INTEGER NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "is_free_shipping" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_templates_is_active_idx" ON "shipping_templates"("is_active");

-- CreateIndex
CREATE INDEX "shipping_templates_priority_idx" ON "shipping_templates"("priority");

-- CreateIndex
CREATE INDEX "shipping_templates_start_date_end_date_idx" ON "shipping_templates"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "shipping_rules_template_id_idx" ON "shipping_rules"("template_id");

-- CreateIndex
CREATE INDEX "shipping_rules_country_idx" ON "shipping_rules"("country");

-- CreateIndex
CREATE INDEX "shipping_rules_shipping_method_idx" ON "shipping_rules"("shipping_method");

-- CreateIndex
CREATE INDEX "shipping_rules_start_date_end_date_idx" ON "shipping_rules"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "shipping_rules" ADD CONSTRAINT "shipping_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "shipping_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
