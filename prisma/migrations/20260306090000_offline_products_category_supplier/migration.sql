-- 2026-03-06 09:00:00: 为线下订单产品增加分类/供应商绑定及库存字段，并为供应商/库存同步创建基础表

-- offline_order_products: 绑定分类、供应商、SKU 与库存
ALTER TABLE offline_order_products
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Category 外键（若尚未存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'offline_order_products_category_id_fkey'
      AND table_name = 'offline_order_products'
  ) THEN
    ALTER TABLE offline_order_products
      ADD CONSTRAINT offline_order_products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Supplier 与 Inventory Sync 基础表（Idempotent：IF NOT EXISTS）
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT,
  sync_interval INTEGER NOT NULL DEFAULT 3600,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_sync (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier 外键（若尚未存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_sync_supplier_id_fkey'
      AND table_name = 'inventory_sync'
  ) THEN
    ALTER TABLE inventory_sync
      ADD CONSTRAINT inventory_sync_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- offline_order_products 绑定 suppliers（若尚未存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'offline_order_products_supplier_id_fkey'
      AND table_name = 'offline_order_products'
  ) THEN
    ALTER TABLE offline_order_products
      ADD CONSTRAINT offline_order_products_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_offline_order_products_category_id ON offline_order_products(category_id);
CREATE INDEX IF NOT EXISTS idx_offline_order_products_supplier_id ON offline_order_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_offline_order_products_sku ON offline_order_products(sku);

