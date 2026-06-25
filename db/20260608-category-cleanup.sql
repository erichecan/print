-- ==========================================================================
-- Category Cleanup Migration Script
-- PrintNGo Plus — 2026-06-08
-- ==========================================================================
--
-- OVERVIEW:
--   1. Migrate products from 5 "problem" categories to correct destinations
--   2. Delete ~68 inactive / empty categories
--
-- PROBLEM CATEGORIES (have products but should be removed):
--   - Caps       slug=caps  → products migrate to Caps (slug=hats)
--   - Bags                  → products migrate to Other Products
--   - RUSH FEE              → product  migrates to Other Products
--   - UV                    → product  migrates to Other Products
--   - test                  → product  migrates to Other Products
--
-- FK BEHAVIOUR (from prisma schema):
--   products.category_id          — required, NO cascade → must UPDATE first
--   product_categories.category_id — onDelete: Cascade   → auto-deleted
--   promotion_categories.category_id — onDelete: Cascade → auto-deleted
--   design_templates.product_category_id — optional, SET NULL → auto-nulled
--   categories.parent_id (self)   — optional, SET NULL   → delete children first
--
-- HOW TO RUN:
--   psql "$DATABASE_URL" -f db/20260608-category-cleanup.sql
--
--   Or paste into Neon SQL Editor (https://console.neon.tech).
--   Always run the DRY RUN block first; review counts before uncommenting
--   the MIGRATION block.
-- ==========================================================================


-- ==========================================================================
-- PART 1: DRY RUN — review state before any changes
-- ==========================================================================

-- Total category count
SELECT COUNT(*) AS total_categories FROM categories;

-- Active vs inactive breakdown
SELECT is_active, COUNT(*) AS count
FROM categories
GROUP BY is_active;

-- Top-level vs sub-category breakdown
SELECT
  CASE WHEN parent_id IS NULL THEN 'top-level' ELSE 'sub-category' END AS level,
  COUNT(*) AS count
FROM categories
GROUP BY level;

-- Products inside the 5 problem categories (should show 7 total rows)
SELECT
  c.name,
  c.slug,
  c.id,
  COUNT(p.id) AS product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.id IN (
  '9eae7263-8757-4b04-a3d8-65ed45da1939',  -- Caps (slug: caps)
  'e45bd083-5be2-4b0c-a9a5-b2eddbff8455',  -- Bags
  'fa82c73d-8b1c-457e-b788-3b933ef8650c',  -- RUSH FEE
  '7c5a5324-98da-4866-ae00-2fcfcbc9da4f',  -- UV
  '696101ea-351d-4806-8c15-6cc0e441c247'   -- test
)
GROUP BY c.id, c.name, c.slug
ORDER BY c.name;

-- product_categories rows for those 5 (should show ≤ 4 rows; cascades on delete)
SELECT pc.category_id, c.name, COUNT(*) AS pc_rows
FROM product_categories pc
JOIN categories c ON c.id = pc.category_id
WHERE pc.category_id IN (
  '9eae7263-8757-4b04-a3d8-65ed45da1939',
  'e45bd083-5be2-4b0c-a9a5-b2eddbff8455',
  'fa82c73d-8b1c-457e-b788-3b933ef8650c',
  '7c5a5324-98da-4866-ae00-2fcfcbc9da4f',
  '696101ea-351d-4806-8c15-6cc0e441c247'
)
GROUP BY pc.category_id, c.name;

-- Inactive sub-categories with 0 products (candidates for Step 3 deletion)
SELECT COUNT(*) AS inactive_sub_candidates
FROM categories c
WHERE c.is_active = false
  AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.category_id = c.id);

-- Inactive top-level categories with 0 products and 0 remaining children
-- (candidates for Step 4 deletion)
SELECT COUNT(*) AS inactive_toplevel_candidates
FROM categories c
WHERE c.is_active = false
  AND c.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = c.id);

-- Preview: which inactive top-level categories will be deleted
SELECT id, name, slug
FROM categories c
WHERE c.is_active = false
  AND c.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = c.id)
ORDER BY name;


-- ==========================================================================
-- PART 2: MIGRATION — uncomment and run after reviewing Part 1 output
-- ==========================================================================

BEGIN;

-- ------------------------------------------------------------------
-- STEP 1: Migrate products out of the 5 problem categories
-- ------------------------------------------------------------------

-- 1a. Caps (slug=caps) — 2 products → Caps (slug=hats)
UPDATE products
SET category_id = 'a78a7777-86e8-4fe9-aae4-98b90618b694'
WHERE category_id = '9eae7263-8757-4b04-a3d8-65ed45da1939';

-- 1b. Bags — 2 products → Other Products
UPDATE products
SET category_id = '0e430f02-e56c-4f2d-893a-dd1bf8b4d435'
WHERE category_id = 'e45bd083-5be2-4b0c-a9a5-b2eddbff8455';

-- 1c. RUSH FEE — 1 product → Other Products
UPDATE products
SET category_id = '0e430f02-e56c-4f2d-893a-dd1bf8b4d435'
WHERE category_id = 'fa82c73d-8b1c-457e-b788-3b933ef8650c';

-- 1d. UV — 1 product → Other Products
UPDATE products
SET category_id = '0e430f02-e56c-4f2d-893a-dd1bf8b4d435'
WHERE category_id = '7c5a5324-98da-4866-ae00-2fcfcbc9da4f';

-- 1e. test — 1 product → Other Products
UPDATE products
SET category_id = '0e430f02-e56c-4f2d-893a-dd1bf8b4d435'
WHERE category_id = '696101ea-351d-4806-8c15-6cc0e441c247';

-- Sanity check inside transaction: problem categories must now have 0 products
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM products
  WHERE category_id IN (
    '9eae7263-8757-4b04-a3d8-65ed45da1939',
    'e45bd083-5be2-4b0c-a9a5-b2eddbff8455',
    'fa82c73d-8b1c-457e-b788-3b933ef8650c',
    '7c5a5324-98da-4866-ae00-2fcfcbc9da4f',
    '696101ea-351d-4806-8c15-6cc0e441c247'
  );
  IF remaining > 0 THEN
    RAISE EXCEPTION 'ABORT: % product(s) still reference problem categories after migration', remaining;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- STEP 2: Delete the 5 problem categories
-- (product_categories + promotion_categories rows cascade automatically)
-- ------------------------------------------------------------------

DELETE FROM categories
WHERE id IN (
  '9eae7263-8757-4b04-a3d8-65ed45da1939',  -- Caps (slug: caps)
  'e45bd083-5be2-4b0c-a9a5-b2eddbff8455',  -- Bags
  'fa82c73d-8b1c-457e-b788-3b933ef8650c',  -- RUSH FEE
  '7c5a5324-98da-4866-ae00-2fcfcbc9da4f',  -- UV
  '696101ea-351d-4806-8c15-6cc0e441c247'   -- test
);

-- ------------------------------------------------------------------
-- STEP 3: Delete inactive sub-categories with no products
-- Must run before Step 4 so parents have no children remaining
-- ------------------------------------------------------------------

DELETE FROM categories
WHERE is_active = false
  AND parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = categories.id)
  AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.category_id = categories.id);

-- ------------------------------------------------------------------
-- STEP 4: Delete inactive top-level categories with no products
-- and no remaining children (children were removed in Step 3)
-- ------------------------------------------------------------------

DELETE FROM categories
WHERE is_active = false
  AND parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = categories.id)
  AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.category_id = categories.id)
  AND NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = categories.id);

COMMIT;


-- ==========================================================================
-- PART 3: VERIFICATION — run after migration to confirm results
-- ==========================================================================

-- Total categories remaining
SELECT COUNT(*) AS total_categories_after FROM categories;

-- Active / inactive breakdown after
SELECT is_active, COUNT(*) AS count
FROM categories
GROUP BY is_active;

-- Confirm the 5 problem categories are gone (should return 0 rows)
SELECT id, name, slug
FROM categories
WHERE id IN (
  '9eae7263-8757-4b04-a3d8-65ed45da1939',
  'e45bd083-5be2-4b0c-a9a5-b2eddbff8455',
  'fa82c73d-8b1c-457e-b788-3b933ef8650c',
  '7c5a5324-98da-4866-ae00-2fcfcbc9da4f',
  '696101ea-351d-4806-8c15-6cc0e441c247'
);

-- Confirm migrated products are in their new homes
SELECT c.name AS category, COUNT(p.id) AS products
FROM categories c
JOIN products p ON p.category_id = c.id
WHERE c.id IN (
  'a78a7777-86e8-4fe9-aae4-98b90618b694',  -- Caps (hats)
  '0e430f02-e56c-4f2d-893a-dd1bf8b4d435'   -- Other Products
)
GROUP BY c.id, c.name;

-- Full category list after cleanup (active only)
SELECT id, name, slug, parent_id, is_active
FROM categories
WHERE is_active = true
ORDER BY parent_id NULLS FIRST, sort_order, name;
