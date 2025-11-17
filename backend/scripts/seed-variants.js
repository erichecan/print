// [2025-11-16 16:20:00] Seed one in-stock variant for each product
const { Client } = require('pg');
const { randomUUID } = require('crypto');

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT id, slug FROM products');
    for (const r of rows) {
      const sku = `${r.slug}-VAR1`;
      const exists = await client.query('SELECT 1 FROM product_variants WHERE sku=$1 LIMIT 1', [sku]);
      if (exists.rows.length) continue;
      await client.query(
        `INSERT INTO product_variants
         (id, product_id, color, size, sku, price_adjustment, stock_quantity, created_at, updated_at)
         VALUES ($1,$2,NULL,NULL,$3,0,50,now(),now())`,
        [randomUUID(), r.id, sku]
      );
    }
    console.log('✅ Variants seeded successfully.');
  } catch (e) {
    console.error('❌ Seed variants failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();


