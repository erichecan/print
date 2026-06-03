-- Composite index on (isActive, isSystem) to speed up product list WHERE clause
CREATE INDEX IF NOT EXISTS "idx_products_active_system" ON "products"("is_active", "is_system");

-- Composite index on (productId, stockQuantity) for the in-stock EXISTS subquery
CREATE INDEX IF NOT EXISTS "idx_variants_product_stock" ON "variants"("product_id", "stock_quantity");
