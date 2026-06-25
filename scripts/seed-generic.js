/**
 * 通用产品入库脚本
 *
 * 从 shopify/products.db（SQLite）和 shopify/shopify_upload_manifest.json
 * 读取产品数据，写入 PostgreSQL（通过 Prisma）。
 *
 * 每个 (supplier_url, color) 在 products.db 里对应一条记录，
 * 入库后变成一个 Product（带若干 Variant + ProductImage）。
 *
 * 用法：
 *   node scripts/seed-generic.js \
 *     --url <supplier_url>           必填：只处理该 URL 的产品
 *     --category <slug>              必填：DB category slug，如 "t-shirts"
 *     --category-name <name>         必填：显示名称，如 "T-Shirts"
 *     --price <cents>                必填：基础售价（分），如 1999 = $19.99
 *     --sku-prefix <prefix>          必填：SKU 前缀，如 "TSHIRT"
 *     [--name-template <text>]       产品名后缀，如 "Softstyle Women's T-Shirt"
 *                                    不传则用 products.db 里的 product_name
 *     [--sizes <csv>]                尺码，逗号分隔，如 "S,M,L,XL,2XL,3XL"
 *                                    默认 "One Size"
 *     [--sort-order <n>]             分类排序值，默认 10
 *     [--replace]                    删除已有产品后重新创建
 *     [--dry-run]                    只打印计划，不写 DB
 *
 * 示例：
 *   # Tote bags（已有专用脚本，这里只是演示）
 *   node scripts/seed-generic.js \
 *     --url "https://www.customink.com/products/bags/tote-bags/medium-cotton-canvas/2435100" \
 *     --category bags --category-name "Bags" \
 *     --price 1999 --sku-prefix TOTE \
 *     --name-template "Medium Cotton Canvas Tote Bag" \
 *     --replace
 *
 *   # T-Shirts（多尺码）
 *   node scripts/seed-generic.js \
 *     --url "https://www.gildan.com/us/en/64000-adult-t-shirt-en_us/" \
 *     --category t-shirts --category-name "T-Shirts" \
 *     --price 1499 --sku-prefix TSHIRT \
 *     --sizes "S,M,L,XL,2XL,3XL"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DB_PATH       = path.join(__dirname, '../shopify/products.db');
const MANIFEST_PATH = path.join(__dirname, '../shopify/shopify_upload_manifest.json');

// Gildan 色码 → 显示名
const GILDAN_CODE_TO_NAME = {
  '000': 'White',      '011': 'Black',       '020': 'Natural',
  '022': 'Ash',        '026': 'Sapphire',    '030': 'White',
  '031': 'Sand',       '032': 'Navy',        '033': 'Forest Green',
  '036': 'Black',      '037': 'Tangerine',   '038': 'Graphite Heather',
  '040': 'Red',        '041': 'Navy',        '044': 'Old Gold',
  '051': 'Royal Blue', '066': 'Kelly Green', '069': 'Light Blue',
  '071': 'Carolina Blue','081': 'Maroon',    '083': 'Sport Scarlet Red',
  '087': 'Tan',        '095': 'Sport Grey',  '098': 'Daisy',
  '108': 'Antique Irish Green', '137': 'Cardinal Red',
  '167': 'Military Green', '168': 'Irish Green', '176': 'Sapphire',
  '183': 'Daisy',      '187': 'Antique Heliconia', '188': 'Military Green',
  '194': 'Cherry Red', '232': 'Tropical Blue','236': 'Tropical Blue',
  '254': 'Antique Orange', '295': 'Charcoal', '296': 'Charcoal',
  '318': 'Safety Green', '319': 'Safety Pink', '324': 'Safety Orange',
  '446': 'Dark Heather', '443': 'Heather Navy',
  '461': 'Heather Military Green', '516': 'Berry', '41G': 'Sport Dark Green',
};

// 优先显示顺序（靠前的 view 当封面图）
const PRIMARY_VIEW_PRIORITY = ['front', 'bag_front', 'mug_front', 'angle', 'bag_lifestyle'];

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    url: null,
    category: null,
    categoryName: null,
    price: null,
    skuPrefix: null,
    nameTemplate: null,
    sizes: ['One Size'],
    sortOrder: 10,
    replace: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':           result.url          = args[++i]; break;
      case '--category':      result.category     = args[++i]; break;
      case '--category-name': result.categoryName = args[++i]; break;
      case '--price':         result.price        = parseInt(args[++i], 10); break;
      case '--sku-prefix':    result.skuPrefix    = args[++i]; break;
      case '--name-template': result.nameTemplate = args[++i]; break;
      case '--sizes':         result.sizes        = args[++i].split(',').map(s => s.trim()); break;
      case '--sort-order':    result.sortOrder    = parseInt(args[++i], 10); break;
      case '--replace':       result.replace      = true; break;
      case '--dry-run':       result.dryRun       = true; break;
      default:
        console.error(`未知参数: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  const missing = [];
  if (!result.url)          missing.push('--url');
  if (!result.category)     missing.push('--category');
  if (!result.categoryName) missing.push('--category-name');
  if (result.price == null) missing.push('--price');
  if (!result.skuPrefix)    missing.push('--sku-prefix');
  if (missing.length) {
    console.error(`缺少必填参数: ${missing.join(', ')}`);
    printHelp();
    process.exit(1);
  }

  return result;
}

function printHelp() {
  console.log(`
用法: node scripts/seed-generic.js [options]

必填:
  --url <url>                supplier_url（对应 products.db 里的记录）
  --category <slug>          DB category slug，如 "t-shirts"
  --category-name <name>     显示名称，如 "T-Shirts"
  --price <cents>            基础售价（分），如 1999
  --sku-prefix <prefix>      SKU 前缀，如 "TSHIRT"

可选:
  --name-template <text>     产品名后缀，默认用 products.db 里的 product_name
  --sizes <csv>              尺码列表，默认 "One Size"
  --sort-order <n>           分类排序值，默认 10
  --replace                  删除已有产品后重新创建
  --dry-run                  只打印计划，不写 DB
`);
}

/** 将颜色字段转换为 manifest key 里的 slug（空格 → 连字符） */
function colorToSlug(color) {
  return color.replace(/\s+/g, '-');
}

/** 返回可读的颜色显示名：Gildan 色码查表，否则直接用原值 */
function colorDisplayName(color) {
  return GILDAN_CODE_TO_NAME[color] || color.replace(/-/g, ' ');
}

/** 将文本转换为 URL slug */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[''™®]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 从 manifest 里找出某产品某颜色的全部图片，返回 [{viewKey, url}] */
function findImages(manifest, productId, color) {
  const prefix = `${productId}_${colorToSlug(color)}_`;
  return Object.entries(manifest)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, url]) => {
      const viewKey = key.slice(prefix.length).replace(/\.[^.]+$/, '');
      return { viewKey, url };
    });
}

/** 从 [{viewKey, url}] 里挑出最适合做封面的 URL */
function primaryImageUrl(images) {
  for (const preferred of PRIMARY_VIEW_PRIORITY) {
    const found = images.find(img => img.viewKey === preferred);
    if (found) return found.url;
  }
  return images[0]?.url ?? null;
}

/** 按 viewKey 排序：把 primary view 排最前，其余按字母 */
function sortImages(images) {
  return [...images].sort((a, b) => {
    const ai = PRIMARY_VIEW_PRIORITY.indexOf(a.viewKey);
    const bi = PRIMARY_VIEW_PRIORITY.indexOf(b.viewKey);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.viewKey.localeCompare(b.viewKey);
  });
}

// ── 主逻辑 ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // 读取 SQLite
  if (!fs.existsSync(DB_PATH)) {
    console.error(`products.db 不存在: ${DB_PATH}`);
    process.exit(1);
  }
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(
    'SELECT * FROM products WHERE supplier_url = ? ORDER BY id'
  ).all(opts.url);
  db.close();

  if (rows.length === 0) {
    console.error(`products.db 里没有找到 URL: ${opts.url}`);
    console.error('可用 URL 列表:');
    const db2 = new Database(DB_PATH, { readonly: true });
    const urls = db2.prepare('SELECT DISTINCT supplier_url FROM products').all();
    db2.close();
    urls.forEach(r => console.error('  ' + r.supplier_url));
    process.exit(1);
  }

  // 读取 manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`manifest 不存在: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  console.log(`\n找到 ${rows.length} 个颜色变体，URL: ${opts.url}`);
  console.log(`分类: ${opts.categoryName} (${opts.category})`);
  console.log(`价格: $${(opts.price / 100).toFixed(2)}  SKU 前缀: ${opts.skuPrefix}`);
  console.log(`尺码: ${opts.sizes.join(', ')}`);
  if (opts.dryRun) console.log('⚠  DRY RUN — 不写入数据库\n');
  console.log('─'.repeat(60));

  // ── 处理每个颜色变体 ─────────────────────────────────────────────────────────

  let okCount = 0;
  let skipCount = 0;
  let warnCount = 0;

  // Upsert 分类（只做一次）
  let category;
  if (!opts.dryRun) {
    category = await prisma.category.upsert({
      where: { slug: opts.category },
      update: {},
      create: {
        name: opts.categoryName,
        slug: opts.category,
        sortOrder: opts.sortOrder,
        isActive: true,
      },
    });
    console.log(`\n分类就绪: ${category.name} (${category.id})\n`);
  } else {
    category = { id: '[DRY_RUN_CATEGORY_ID]' };
    console.log(`\n[DRY RUN] 分类将被创建/更新: ${opts.categoryName} (${opts.category})\n`);
  }

  for (const row of rows) {
    const productId  = String(row.id).padStart(6, '0');
    const color      = row.color;
    const displayName = colorDisplayName(color);

    // 产品名：优先用 --name-template，否则用 products.db 里的 product_name
    const nameTemplate = opts.nameTemplate || row.product_name || '';
    // 如果 nameTemplate 只是数字（CustomInk 样式编号），提示用户
    const nameIsStyleNumber = /^\d+$/.test(nameTemplate.trim());
    if (nameIsStyleNumber && !opts.nameTemplate) {
      console.warn(
        `⚠  产品 ${productId} 的 product_name="${nameTemplate}" 看起来是样式编号，` +
        `建议加 --name-template "..." 参数指定更好的产品名`
      );
      warnCount++;
    }
    const productName = nameIsStyleNumber && !opts.nameTemplate
      ? `${displayName} Custom Product`
      : `${displayName} ${nameTemplate}`.trim();

    const productSlug = slugify(productName);
    const productSku  = `${opts.skuPrefix}-${colorToSlug(color).toUpperCase()}`;

    // 找出 manifest 里的图片
    const images = findImages(manifest, productId, color);
    const sortedImages = sortImages(images);
    const primaryUrl   = primaryImageUrl(images);

    console.log(`─── ${productName}`);
    console.log(`    ID: ${productId}  color: ${color}  slug: ${productSlug}`);
    console.log(`    图片: ${images.length} 张  [${images.map(i => i.viewKey).join(', ')}]`);

    if (images.length === 0) {
      console.log(`    ⚠  manifest 里没有找到该产品图片，跳过\n`);
      warnCount++;
      skipCount++;
      continue;
    }

    // 构造 variants
    const variants = opts.sizes.map((size, idx) => ({
      color: displayName,
      colorHex: null,
      colorDisplayName: displayName,
      size,
      sku: opts.sizes.length === 1
        ? productSku
        : `${productSku}-${size.replace(/\s+/g, '').toUpperCase()}`,
      priceAdjustment: 0,
      stockQuantity: 300,
      imageUrl: primaryUrl,
    }));

    // 构造 productImages
    const productImages = sortedImages.map((img, idx) => ({
      url: img.url,
      alt: `${productName} — ${img.viewKey.replace(/_/g, ' ')} view`,
      sortOrder: idx,
    }));

    if (opts.dryRun) {
      console.log(`    [DRY RUN] 将创建 Product + ${variants.length} Variant(s) + ${productImages.length} Image(s)\n`);
      okCount++;
      continue;
    }

    // 检查是否已存在
    const existing = await prisma.product.findUnique({ where: { slug: productSlug } });
    if (existing) {
      if (!opts.replace) {
        console.log(`    ↷ 已存在（跳过）。用 --replace 可强制重建\n`);
        skipCount++;
        continue;
      }
      // --replace: 先删除
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.variant.deleteMany({ where: { productId: existing.id } });
      await prisma.productCategory.deleteMany({ where: { productId: existing.id } });
      await prisma.product.delete({ where: { id: existing.id } });
      console.log(`    ↺ 已删除旧产品，重建中...`);
    }

    // 创建产品
    const created = await prisma.product.create({
      data: {
        name: productName,
        slug: productSlug,
        categoryId: category.id,
        basePrice: opts.price,
        sku: productSku,
        stockQuantity: opts.sizes.reduce((sum, _) => sum + 300, 0),
        isActive: true,
        variants: { create: variants },
        images: { create: productImages },
        productCategories: { create: { categoryId: category.id } },
      },
    });
    console.log(`    ✓ 创建成功: ${created.id}\n`);
    okCount++;
  }

  // ── 汇总 ──────────────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log(`完成: 创建 ${okCount}  跳过 ${skipCount}  警告 ${warnCount}`);
  if (skipCount > 0 && !opts.replace) {
    console.log('提示: 加 --replace 可删除已有产品并重新创建');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
