-- Import Script for CustomInk Data
-- Usage: psql "your_connection_string" -f import_data.sql

BEGIN;

-- 1. Import Products
-- Change updated_at handling: The CSV doesn't have it, but DB requires it (NOT NULL).
-- We use a temporary table to stage the data.

CREATE TEMP TABLE products_staging (
    id text,
    name text,
    slug text,
    description text,
    base_price_cents integer,
    category_id text,
    sku text,
    is_active boolean
);

-- Copy data from CSV to Staging
-- Ensure products.csv is in the current directory where you run psql
\copy products_staging FROM 'products.csv' WITH (FORMAT csv, HEADER true);

-- Insert into real table with defaults
INSERT INTO products (
    id, name, slug, description, base_price_cents, category_id, sku, is_active,
    updated_at, -- Mandatory field
    created_at, -- Default exists but good to be explicit
    unit_cost, sale_price, gross_profit, stock_quantity, is_customizable, is_system, deleted, is_draft
)
SELECT 
    id, name, slug, description, base_price_cents, category_id, sku, is_active,
    NOW() as updated_at,
    NOW() as created_at,
    0 as unit_cost,
    0 as sale_price,
    0 as gross_profit,
    0 as stock_quantity,
    true as is_customizable,
    false as is_system,
    false as deleted,
    false as is_draft
FROM products_staging
ON CONFLICT (id) DO NOTHING; -- Avoid duplicates

-- 2. Import Product Images
-- product_images table is simpler, direct copy works if columns match
-- CSV: id, product_id, url, sort_order
-- DB: id, product_id, url, sort_order ... (created_at has default)

\copy product_images(id, product_id, url, sort_order) FROM 'product_images.csv' WITH (FORMAT csv, HEADER true);

COMMIT;

-- Verification
SELECT count(*) as new_product_count FROM products;
SELECT count(*) as new_image_count FROM product_images;
