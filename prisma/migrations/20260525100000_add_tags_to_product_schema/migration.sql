-- AlterTable: Add tags column to products if not exists
-- Column already exists in production database but was missing from Prisma schema
-- This caused getProducts to throw 500 (Prisma rejected select: { tags: true })

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
