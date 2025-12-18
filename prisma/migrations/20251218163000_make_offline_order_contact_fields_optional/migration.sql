-- [2025-12-18 16:30:00] Make offline order contact fields optional
-- PRD v2.0: contactName 和 email 改为可选字段，与前端保持一致

-- AlterTable: contactName (make nullable)
ALTER TABLE "offline_orders" ALTER COLUMN "contact_name" DROP NOT NULL;

-- AlterTable: email (make nullable)
ALTER TABLE "offline_orders" ALTER COLUMN "email" DROP NOT NULL;
