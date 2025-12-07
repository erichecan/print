-- Add display_order and is_active to offline_order_products
ALTER TABLE offline_order_products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE offline_order_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE offline_order_products SET display_order = 0 WHERE display_order IS NULL;
UPDATE offline_order_products SET is_active = true WHERE is_active IS NULL;
