-- AlterTable
ALTER TABLE "orders" ADD COLUMN "designer_draft" JSONB,
ADD COLUMN "designer_draft_saved_at" TIMESTAMP(3);
