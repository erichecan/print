-- AlterTable: Add excludeFromReports (exclude_from_reports) to OfflineOrder
ALTER TABLE "offline_orders" ADD COLUMN "exclude_from_reports" BOOLEAN NOT NULL DEFAULT false;
