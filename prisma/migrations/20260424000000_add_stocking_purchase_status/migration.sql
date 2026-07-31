-- 补录：此迁移已在生产库执行，原始文件从未提交进仓库，现按线上实际 schema 重建
-- [2026-04-24] 备货/订货情况
ALTER TABLE "offline_orders" ADD COLUMN "stocking_status" TEXT,
ADD COLUMN "purchase_status" TEXT;
