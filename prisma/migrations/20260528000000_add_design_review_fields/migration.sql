-- AddColumn: design review fields to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "design_review_status" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "mockup_url" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "design_review_note" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "design_review_rejected_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "design_review_synced_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gang_sheet_url" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gang_sheet_generated_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gang_sheet_downloaded_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_orders_design_review_status" ON "orders"("design_review_status");
