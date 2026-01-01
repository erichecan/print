-- Drop existing constraints if they exist (to ensure idempotency and cleanliness)
ALTER TABLE "offline_order_assets" DROP CONSTRAINT IF EXISTS "offline_order_assets_order_id_fkey";
ALTER TABLE "offline_order_stage_history" DROP CONSTRAINT IF EXISTS "offline_order_stage_history_order_id_fkey";
ALTER TABLE "production_work_orders" DROP CONSTRAINT IF EXISTS "production_work_orders_offline_order_id_fkey";
ALTER TABLE "production_work_order_events" DROP CONSTRAINT IF EXISTS "production_work_order_events_work_order_id_fkey";

-- Re-add constraints with ON DELETE CASCADE

-- 1. OfflineOrderAsset -> OfflineOrder
ALTER TABLE "offline_order_assets" ADD CONSTRAINT "offline_order_assets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "offline_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. OfflineOrderStageHistory -> OfflineOrder
ALTER TABLE "offline_order_stage_history" ADD CONSTRAINT "offline_order_stage_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "offline_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. ProductionWorkOrder -> OfflineOrder
ALTER TABLE "production_work_orders" ADD CONSTRAINT "production_work_orders_offline_order_id_fkey" FOREIGN KEY ("offline_order_id") REFERENCES "offline_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. ProductionWorkOrderEvent -> ProductionWorkOrder
ALTER TABLE "production_work_order_events" ADD CONSTRAINT "production_work_order_events_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "production_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
