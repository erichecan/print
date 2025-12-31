// Seed demo data into Prisma schema tables using pg
const { Client } = require('pg');
const { randomUUID } = require('crypto');

// Convert dollar amounts to integer cents for base_price_cents column
function toCents(amount) {
  return Math.round((amount ?? 0) * 100);
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');
    // Ensure basic categories/brands
    const [cat1, cat2, cat3] = await Promise.all([
      ensureCategory(client, 'T-Shirts', 't-shirts'),
      ensureCategory(client, 'Sweatshirts', 'sweatshirts'),
      ensureCategory(client, 'Hats', 'hats'),
    ]);
    const [brand1, brand2, brand3] = await Promise.all([
      ensureBrand(client, 'Gildan', 'gildan'),
      ensureBrand(client, 'Hanes', 'hanes'),
      ensureBrand(client, 'Jerzees', 'jerzees'),
    ]);
    // Products
    const p1 = await ensureProduct(client, {
      name: 'Gildan Softstyle Jersey T‑shirt',
      slug: 'gildan-softstyle-jersey-tee',
      description: 'A customer favorite tee for screen print or DTG.',
      long_description: 'Soft ringspun cotton with modern fit.',
      base_price: 15.0,
      unit_cost: 6.5,
      sale_price: 0,
      gross_profit: 8.5,
      sku: 'tee-0001',
      stock_quantity: 120,
      category_id: cat1,
      brand_id: brand1,
    });
    const p2 = await ensureProduct(client, {
      name: 'Midweight Fleece Hoodie',
      slug: 'midweight-fleece-hoodie',
      description: 'Cozy hoodie ideal for embroidery or screen printing.',
      long_description: 'Midweight 50/50 fleece.',
      base_price: 35.0,
      unit_cost: 16.0,
      sale_price: 0,
      gross_profit: 19.0,
      sku: 'hoodie-0001',
      stock_quantity: 80,
      category_id: cat2,
      brand_id: brand2,
    });
    const p3 = await ensureProduct(client, {
      name: 'Classic Trucker Hat',
      slug: 'classic-trucker-hat',
      description: 'Breathable mesh-back cap perfect for patches.',
      long_description: 'Snapback fit with foam front panel.',
      base_price: 18.0,
      unit_cost: 7.0,
      sale_price: 0,
      gross_profit: 11.0,
      sku: 'hat-0001',
      stock_quantity: 150,
      category_id: cat3,
      brand_id: brand3,
    });
    await ensureImage(client, p1, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&q=80', 'Gildan tee');
    await ensureImage(client, p2, 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80', 'Fleece hoodie');
    await ensureImage(client, p3, 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1200&q=80', 'Trucker hat');
    await client.query('COMMIT');
    console.log('✅ Demo data seeded successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function ensureCategory(client, name, slug) {
  const res = await client.query('SELECT id FROM categories WHERE slug=$1 LIMIT 1', [slug]);
  if (res.rows.length) return res.rows[0].id;
  const id = randomUUID();
  await client.query(
    `INSERT INTO categories (id,name,slug,is_active,sort_order,created_at,updated_at)
     VALUES ($1,$2,$3,true,0,now(),now())`,
    [id, name, slug]
  );
  return id;
}

async function ensureBrand(client, name, slug) {
  const res = await client.query('SELECT id FROM brands WHERE slug=$1 LIMIT 1', [slug]);
  if (res.rows.length) return res.rows[0].id;
  const id = randomUUID();
  await client.query(
    `INSERT INTO brands (id,name,slug,is_active,created_at,updated_at)
     VALUES ($1,$2,$3,true,now(),now())`,
    [id, name, slug]
  );
  return id;
}

async function ensureProduct(client, p) {
  const res = await client.query('SELECT id FROM products WHERE slug=$1 LIMIT 1', [p.slug]);
  if (res.rows.length) return res.rows[0].id;
  const id = randomUUID();
  await client.query(
    `INSERT INTO products
     (id,name,slug,description,long_description,base_price_cents,unit_cost,sale_price,gross_profit,sku,is_customizable,stock_quantity,is_active,category_id,brand_id,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,true,$12,$13,now(),now())`,
    [
      id,
      p.name,
      p.slug,
      p.description,
      p.long_description,
      toCents(p.base_price),
      p.unit_cost,
      p.sale_price,
      p.gross_profit,
      p.sku,
      p.stock_quantity,
      p.category_id,
      p.brand_id,
    ]
  );
  return id;
}

async function ensureImage(client, productId, url, alt) {
  const res = await client.query('SELECT id FROM product_images WHERE product_id=$1 LIMIT 1', [productId]);
  if (res.rows.length) return res.rows[0].id;
  const id = randomUUID();
  await client.query(
    `INSERT INTO product_images (id,product_id,url,alt,sort_order,created_at)
     VALUES ($1,$2,$3,$4,0,now())`,
    [id, productId, url, alt]
  );
  return id;
}

run();


