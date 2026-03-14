-- =============================================================================
-- 诊断：Best sellers / Quantity by Category 为空的 SQL 排查脚本
-- 在 Cloud Console（或 psql）中按顺序执行，根据哪一步结果异常判断问题点
-- 时间范围已写死为 2026-03，如需其它月份请全局替换日期
-- =============================================================================

-- =============================================================================
-- 步骤 A：确认时间范围内订单总数 + 有 productItems 的订单数
-- =============================================================================
SELECT
  COUNT(*) AS orders_in_range,
  COUNT(*) FILTER (
    WHERE o.configuration->'productItems' IS NOT NULL
      AND jsonb_typeof(o.configuration->'productItems') = 'array'
      AND jsonb_array_length(o.configuration->'productItems') > 0
  ) AS orders_with_product_items
FROM offline_orders o
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999';
-- 若 orders_with_product_items = 0，说明这段时间没有带 productItems 的订单，后面必然为空。

-- =============================================================================
-- 步骤 B：检查 productItems 里每条 item 的「数量」是否可被正确解析
-- =============================================================================
SELECT
  o.id AS order_id,
  pi->>'productId'   AS product_id,
  pi->>'totalQuantity' AS total_qty_raw,
  pi->>'quantity'      AS quantity_raw,
  COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0) AS qty_parsed
FROM offline_orders o,
  LATERAL jsonb_array_elements(
    CASE
      WHEN o.configuration->'productItems' IS NOT NULL
       AND jsonb_typeof(o.configuration->'productItems') = 'array'
      THEN o.configuration->'productItems'
      ELSE '[]'::jsonb
    END
  ) AS pi
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999'
LIMIT 20;
-- 看 qty_parsed 是否多为 0 或 NULL：若全是 0，说明字段名或类型不对，Best sellers / byCategory 会为 0。

-- =============================================================================
-- 步骤 C：完整复现 Best sellers 查询（与后端逻辑一致）
-- =============================================================================
SELECT
  (pi->>'productId') AS product_id,
  COALESCE(NULLIF(pi->>'productName', ''), p.name, '—') AS product_name,
  SUM(COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0))::int AS quantity
FROM offline_orders o,
  LATERAL jsonb_array_elements(
    CASE
      WHEN o.configuration->'productItems' IS NOT NULL
       AND jsonb_typeof(o.configuration->'productItems') = 'array'
      THEN o.configuration->'productItems'
      ELSE '[]'::jsonb
    END
  ) AS pi
LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999'
GROUP BY (pi->>'productId'), pi->>'productName', p.name
HAVING SUM(COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0)) > 0
ORDER BY quantity DESC
LIMIT 8;
-- 若这里无行：多半是 HAVING 把全部过滤掉了，回到步骤 B 看 qty_parsed 是否全 0。

-- =============================================================================
-- 步骤 D：完整复现 Quantity by Category 查询（与后端逻辑一致）
-- =============================================================================
SELECT
  COALESCE(p.category, 'Uncategorized') AS category,
  SUM(COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0))::int AS quantity
FROM offline_orders o,
  LATERAL jsonb_array_elements(
    CASE
      WHEN o.configuration->'productItems' IS NOT NULL
       AND jsonb_typeof(o.configuration->'productItems') = 'array'
      THEN o.configuration->'productItems'
      ELSE '[]'::jsonb
    END
  ) AS pi
LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999'
GROUP BY p.category
HAVING SUM(COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0)) > 0
ORDER BY quantity DESC;
-- 若这里无行：同样先看步骤 B 的 qty_parsed；若步骤 C 有行而 D 无行，可能是 p.category 或 JOIN 问题。

-- =============================================================================
-- 说明：Quantity by Category 与 Uncategorized
-- =============================================================================
-- Quantity by Category = 按「产品类目」汇总销量（件数）。
-- 数据来源：订单 configuration.productItems 里每条 productId → 查 offline_order_products
-- → 再 LEFT JOIN categories 用 category_id 取类目名 (c.name)。
--
-- Uncategorized: 185 表示「没有类目」或「类目在 categories 里不存在」的产品，
-- 一共卖出了 185 件。具体是：
--   (1) offline_order_products.category_id 为 NULL（产品未挂类目），或
--   (2) category_id 有值但 categories 表里没有对应 id（脏数据/已删类目）。
-- 下面「步骤 F」可查出具体是哪些产品贡献了 Uncategorized。

-- =============================================================================
-- 步骤 E（可选）：检查 productId 是否都能在 offline_order_products 里找到
-- =============================================================================
SELECT
  pi->>'productId' AS product_id,
  COUNT(*)         AS order_count,
  MAX(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) AS has_missing_product
FROM offline_orders o,
  LATERAL jsonb_array_elements(
    CASE
      WHEN o.configuration->'productItems' IS NOT NULL
       AND jsonb_typeof(o.configuration->'productItems') = 'array'
      THEN o.configuration->'productItems'
      ELSE '[]'::jsonb
    END
  ) AS pi
LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999'
GROUP BY (pi->>'productId');
-- has_missing_product = 1 表示该 productId 在 offline_order_products 中不存在，byCategory 会归到 Uncategorized，但 Best sellers 仍应有行。

-- =============================================================================
-- 步骤 F：哪些产品贡献了 Uncategorized（无类目或类目不存在）
-- =============================================================================
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.category_id,
  SUM(COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0))::int AS quantity
FROM offline_orders o,
  LATERAL jsonb_array_elements(
    CASE
      WHEN o.configuration->'productItems' IS NOT NULL
       AND jsonb_typeof(o.configuration->'productItems') = 'array'
      THEN o.configuration->'productItems'
      ELSE '[]'::jsonb
    END
  ) AS pi
LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.created_at >= '2026-03-01'
  AND o.created_at <= '2026-03-31 23:59:59.999'
  AND c.id IS NULL
  AND p.id IS NOT NULL
GROUP BY p.id, p.name, p.category_id
ORDER BY quantity DESC;
-- 这里列出的是：在时间范围内有销量、且「没有类目」(category_id 为空) 或「类目在 categories 里不存在」的产品及件数。
