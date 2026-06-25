#!/usr/bin/env node
/**
 * auto-set-garment-type.js
 *
 * 根据商品名称和分类，自动推断 garmentType 并写入 printableAreas 模板坐标。
 *
 * 用法：
 *   node scripts/auto-set-garment-type.js          # 预览（dry-run）
 *   node scripts/auto-set-garment-type.js --apply  # 实际写入 DB
 *   node scripts/auto-set-garment-type.js --apply --overwrite  # 覆盖已有值
 */

const { PrismaClient } = require('../node_modules/@prisma/client');
const path = require('path');
const fs = require('fs');

// 显式从 backend/.env 读取 DATABASE_URL，避免 Prisma 用根目录的 .env
const envFile = path.join(__dirname, '../backend/.env');
const envContent = fs.readFileSync(envFile, 'utf8');
const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) { console.error('DATABASE_URL not found in backend/.env'); process.exit(1); }
process.env.DATABASE_URL = dbUrlMatch[1].trim();

const APPLY = process.argv.includes('--apply');
const OVERWRITE = process.argv.includes('--overwrite');

// ─── 印刷区域模板（与前端 printable-area-templates.ts 保持一致）───────────────
const TEMPLATES = {
  tshirt: {
    front:         { x: 327, y: 240, width: 546, height: 960 },
    back:          { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 350, y: 470, width: 500, height: 500 },
    'right-sleeve':{ x: 350, y: 470, width: 500, height: 500 },
    sleeve:        { x: 350, y: 470, width: 500, height: 500 },
  },
  vneck: {
    front:         { x: 327, y: 280, width: 546, height: 880 },
    back:          { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 350, y: 490, width: 480, height: 480 },
    'right-sleeve':{ x: 350, y: 490, width: 480, height: 480 },
    sleeve:        { x: 350, y: 490, width: 480, height: 480 },
  },
  hoodie: {
    front:         { x: 360, y: 340, width: 480, height: 720 },
    back:          { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 370, y: 500, width: 460, height: 460 },
    'right-sleeve':{ x: 370, y: 500, width: 460, height: 460 },
    sleeve:        { x: 370, y: 500, width: 460, height: 460 },
  },
  crewneck: {
    front:         { x: 340, y: 320, width: 520, height: 760 },
    back:          { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 360, y: 500, width: 480, height: 480 },
    'right-sleeve':{ x: 360, y: 500, width: 480, height: 480 },
    sleeve:        { x: 360, y: 500, width: 480, height: 480 },
  },
  long_sleeve: {
    front:         { x: 327, y: 240, width: 546, height: 960 },
    back:          { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 350, y: 400, width: 400, height: 700 },
    'right-sleeve':{ x: 350, y: 400, width: 400, height: 700 },
    sleeve:        { x: 350, y: 400, width: 400, height: 700 },
  },
  tank_top: {
    front:         { x: 327, y: 200, width: 546, height: 1000 },
    back:          { x: 327, y: 200, width: 546, height: 1000 },
    'left-sleeve': { x: 350, y: 470, width: 500, height: 500 },
    'right-sleeve':{ x: 350, y: 470, width: 500, height: 500 },
    sleeve:        { x: 350, y: 470, width: 500, height: 500 },
  },
  kids_tshirt: {
    front:         { x: 380, y: 280, width: 440, height: 760 },
    back:          { x: 380, y: 280, width: 440, height: 760 },
    'left-sleeve': { x: 390, y: 500, width: 420, height: 420 },
    'right-sleeve':{ x: 390, y: 500, width: 420, height: 420 },
    sleeve:        { x: 390, y: 500, width: 420, height: 420 },
  },
  kids_hoodie: {
    front:         { x: 390, y: 360, width: 420, height: 600 },
    back:          { x: 380, y: 280, width: 440, height: 760 },
    'left-sleeve': { x: 400, y: 520, width: 400, height: 400 },
    'right-sleeve':{ x: 400, y: 520, width: 400, height: 400 },
    sleeve:        { x: 400, y: 520, width: 400, height: 400 },
  },
  tote_bag: {
    front:         { x: 240, y: 120, width: 720, height: 1200 },
    back:          { x: 240, y: 120, width: 720, height: 1200 },
    'left-sleeve': { x: 240, y: 120, width: 720, height: 1200 },
    'right-sleeve':{ x: 240, y: 120, width: 720, height: 1200 },
    sleeve:        { x: 240, y: 120, width: 720, height: 1200 },
  },
};

// ─── 推断规则 ──────────────────────────────────────────────────────────────────
// 返回 garmentType 字符串，或 null（表示跳过，不适合设计器）
function inferGarmentType(name, categoryName) {
  const n = (name || '').toLowerCase();
  const c = (categoryName || '').toLowerCase();

  // 明确跳过的分类（无印刷区域）
  const SKIP_CATEGORIES = ['mugs', 'baseball hats', 'caps', 'trucker hats', 'rush fee', 'uv'];
  if (SKIP_CATEGORIES.some(s => c.includes(s))) return null;

  // 明确跳过的名称
  if (n.includes('mug') || n.includes('cap') || n.includes('hat') ||
      n.includes('rush fee') || n.includes('uv sticker')) return null;

  // Tote Bag
  if (c === 'bags' || n.includes('tote bag') || n.includes('tote')) return 'tote_bag';

  // Hoodie（名称优先，因为 Gildan Blanks 分类包含多种）
  if (n.includes('hoodie') || n.includes('hooded') ||
      n.includes('18500') || n.includes('h000')) {
    // 区分 kids hoodie
    if (n.includes('youth') || n.includes('18500b') || n.includes('kids')) return 'kids_hoodie';
    return 'hoodie';
  }

  // Crewneck Sweatshirt
  if (c.includes('crewneck') || n.includes('crewneck') || n.includes('crew neck') ||
      n.includes('18000') || n.includes('8000') || n.includes('sweatshirt')) return 'crewneck';

  // V-Neck
  if (c.includes('v-neck') || n.includes('v-neck') || n.includes('v neck') ||
      n.includes('64v00') || n.includes('64800')) return 'vneck';

  // Long Sleeve
  if (n.includes('long sleeve') || n.includes('long-sleeve') || n.includes('5400')) return 'long_sleeve';

  // Tank Top
  if (n.includes('tank') || n.includes('sleeveless')) return 'tank_top';

  // Kids T-Shirt
  if (n.includes('youth') || n.includes('kids') || n.includes('5000b') || n.includes('18500b')) return 'kids_tshirt';

  // Default: T-Shirt（包含所有 Art Print T-Shirt、polo 等）
  return 'tshirt';
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const client = new PrismaClient();

  const products = await client.product.findMany({
    select: { id: true, name: true, garmentType: true, category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const results = { updated: 0, skipped_existing: 0, skipped_no_match: 0, errors: 0 };
  const preview = [];

  for (const p of products) {
    const inferred = inferGarmentType(p.name, p.category?.name);

    if (!inferred) {
      preview.push({ action: 'SKIP (no match)', name: p.name, from: p.garmentType, to: null });
      results.skipped_no_match++;
      continue;
    }

    if (p.garmentType && !OVERWRITE) {
      preview.push({ action: 'SKIP (already set)', name: p.name, from: p.garmentType, to: inferred });
      results.skipped_existing++;
      continue;
    }

    if (p.garmentType === inferred && !OVERWRITE) {
      preview.push({ action: 'UNCHANGED', name: p.name, from: p.garmentType, to: inferred });
      results.skipped_existing++;
      continue;
    }

    preview.push({ action: 'UPDATE', name: p.name, from: p.garmentType, to: inferred });

    if (APPLY) {
      try {
        await client.product.update({
          where: { id: p.id },
          data: {
            garmentType: inferred,
            printableAreas: TEMPLATES[inferred],
          },
        });
        results.updated++;
      } catch (e) {
        console.error(`  ✗ Failed: ${p.name} — ${e.message}`);
        results.errors++;
      }
    } else {
      results.updated++;
    }
  }

  // ─── 输出预览表格 ──────────────────────────────────────────────────────────
  console.log('\n' + (APPLY ? '✅ APPLIED' : '🔍 DRY RUN (add --apply to write)') + '\n');

  const updates = preview.filter(r => r.action === 'UPDATE');
  const skipsNoMatch = preview.filter(r => r.action === 'SKIP (no match)');
  const skipsExisting = preview.filter(r => r.action === 'SKIP (already set)');

  if (updates.length) {
    console.log(`=== ${APPLY ? 'UPDATED' : 'WILL UPDATE'} (${updates.length}) ===`);
    updates.forEach(r => {
      const change = r.from ? `${r.from} → ${r.to}` : `(none) → ${r.to}`;
      console.log(`  ${r.to.padEnd(14)} ${change.padEnd(30)} ${r.name}`);
    });
  }

  if (skipsNoMatch.length) {
    console.log(`\n=== SKIPPED — not a printable garment (${skipsNoMatch.length}) ===`);
    skipsNoMatch.forEach(r => console.log(`  ${r.name}`));
  }

  if (skipsExisting.length && !OVERWRITE) {
    console.log(`\n=== SKIPPED — already has garmentType (${skipsExisting.length}, use --overwrite to force) ===`);
    skipsExisting.forEach(r => console.log(`  ${r.from.padEnd(14)} ${r.name}`));
  }

  console.log(`\n📊 Summary: ${results.updated} ${APPLY ? 'updated' : 'to update'}, ${results.skipped_existing} skipped (existing), ${results.skipped_no_match} skipped (no match), ${results.errors} errors`);

  await client.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
