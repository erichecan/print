-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN "design_id" TEXT;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
