-- 补录：此迁移已在生产库执行，原始文件从未提交进仓库，现按线上实际 schema 重建
ALTER TABLE "offline_orders" ALTER COLUMN "status" DROP NOT NULL;
