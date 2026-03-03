#!/usr/bin/env node
// [2026-03-02 12:00:00] 导出商品目录与全局配置快照到 snapshots/catalog-YYYYMMDD.json（只读，不修改数据库）

const path = require('path');
const fs = require('fs');

// [2026-03-02 12:00:00] 从 backend/.env 或项目根 .env 加载 DATABASE_URL
function loadEnv() {
  const backendEnv = path.resolve(__dirname, '../.env');
  const rootEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
  } else if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
  } else {
    require('dotenv').config();
  }
}

// [2026-03-02 12:00:00] 递归序列化对象，将 Prisma Decimal 转为 number 以便 JSON 正确输出
function serializeForJson(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForJson);
  }
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeForJson(v);
    }
    return out;
  }
  return obj;
}

async function main() {
  const timestamp = new Date();
  const timestampStr = timestamp.toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${timestampStr}] 开始导出商品目录快照...`);

  loadEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ 未设置 DATABASE_URL，请在 backend/.env 或项目根 .env 中配置');
    process.exit(1);
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // [2026-03-02 12:00:00] category: id, name, slug, description, imageUrl, sortOrder, isActive
    const category = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
      },
    });

    // [2026-03-02 12:00:00] brand: id, name, slug, description
    const brand = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    // [2026-03-02 12:00:00] product: id, name, slug, description, basePrice, sku, isActive, categoryId, brandId（不导出订单相关敏感字段）
    const product = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        sku: true,
        isActive: true,
        categoryId: true,
        brandId: true,
      },
    });

    // [2026-03-02 12:00:00] variant: id, productId, color, colorHex, size, sku, priceAdjustment, stockQuantity, imageUrl
    const variant = await prisma.variant.findMany({
      select: {
        id: true,
        productId: true,
        color: true,
        colorHex: true,
        size: true,
        sku: true,
        priceAdjustment: true,
        stockQuantity: true,
        imageUrl: true,
      },
    });

    // [2026-03-02 12:00:00] productImage: id, productId, url, alt, sortOrder
    const productImage = await prisma.productImage.findMany({
      select: {
        id: true,
        productId: true,
        url: true,
        alt: true,
        sortOrder: true,
      },
    });

    // [2026-03-02 12:00:00] shippingTemplate + rules（id, name, description, priority, isActive；rules 含 country, shippingMethod, cost, estimatedDays, isFreeShipping 等）
    const shippingTemplatesWithRules = await prisma.shippingTemplate.findMany({
      include: { rules: true },
    });
    const shippingTemplateExport = shippingTemplatesWithRules.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      priority: t.priority,
      isActive: t.isActive,
      rules: t.rules.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        country: r.country,
        provinces: r.provinces,
        postalCodePattern: r.postalCodePattern,
        startDate: r.startDate,
        endDate: r.endDate,
        seasonTag: r.seasonTag,
        minOrderAmount: r.minOrderAmount,
        maxOrderAmount: r.maxOrderAmount,
        minWeight: r.minWeight,
        maxWeight: r.maxWeight,
        shippingMethod: r.shippingMethod,
        estimatedDays: r.estimatedDays,
        cost: r.cost,
        isFreeShipping: r.isFreeShipping,
      })),
    }));

    // [2026-03-02 12:00:00] offline_order_size_fees：全部字段
    const offline_order_size_fees = await prisma.offline_order_size_fees.findMany();

    // [2026-03-02 12:00:00] offline_order_products：id, name, image_url, display_order, is_active（仅结构配置）
    const offline_order_products = await prisma.offline_order_products.findMany({
      select: {
        id: true,
        name: true,
        image_url: true,
        display_order: true,
        is_active: true,
      },
    });

    // [2026-03-02 12:00:00] offline_order_colors：id, name, hex_code
    const offline_order_colors = await prisma.offline_order_colors.findMany({
      select: {
        id: true,
        name: true,
        hex_code: true,
      },
    });

    // [2026-03-02 12:00:00] settings：仅 site.colorMappings 及属于「全局配置」的 key（key + value）
    const allSettings = await prisma.settings.findMany({
      where: {
        OR: [
          { key: 'site.colorMappings' },
          { key: { startsWith: 'site.' } },
        ],
      },
      select: { key: true, value: true },
    });
    const settings = allSettings.map((s) => ({ key: s.key, value: s.value }));

    const snapshot = {
      exportedAt: timestamp.toISOString(),
      category,
      brand,
      product,
      variant,
      productImage,
      shippingTemplate: shippingTemplateExport,
      offline_order_size_fees,
      offline_order_products,
      offline_order_colors,
      settings,
    };

    const serialized = serializeForJson(snapshot);
    const repoRoot = path.resolve(__dirname, '../..');
    const snapshotsDir = path.join(repoRoot, 'snapshots');
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
    const outPath = path.join(snapshotsDir, `catalog-${dateStr}.json`);
    fs.writeFileSync(outPath, JSON.stringify(serialized, null, 2), 'utf8');
    console.log(`[${timestampStr}] ✅ 已写入 ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 导出失败:', err);
  process.exit(1);
});
