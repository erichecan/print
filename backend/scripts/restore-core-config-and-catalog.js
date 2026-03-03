#!/usr/bin/env node
// [2026-03-03 09:30:00] 一键恢复核心配置与商品目录的管道脚本（L1/L2 初始化流水线）

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// [2026-03-03 09:30:00] 加载数据库连接配置，优先使用 backend/.env，保证 Prisma 和 pg 脚本都能拿到 DATABASE_URL
function loadEnv() {
  const backendEnv = path.resolve(__dirname, '../.env');
  const rootEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
    console.log(`[${new Date().toISOString()}] 使用 backend/.env 加载环境变量`);
  } else if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
    console.log(`[${new Date().toISOString()}] 使用项目根目录 .env 加载环境变量`);
  } else {
    require('dotenv').config();
    console.log(`[${new Date().toISOString()}] 使用默认 .env 加载环境变量`);
  }
}

// [2026-03-03 09:30:00] 粗略判断是否为共享/生产数据库，防止误在生产环境执行大规模重建
function looksLikeProdDatabase(dbUrl) {
  if (!dbUrl) return false;
  const lowered = dbUrl.toLowerCase();
  return (
    lowered.includes('neon.tech') ||
    lowered.includes('run.app') ||
    lowered.includes('amazonaws.com')
  );
}

// [2026-03-03 09:30:00] 统一封装每一步的执行与日志输出
function runStep(name, command, options = {}) {
  const tsStart = new Date().toISOString();
  console.log(`\n[${tsStart}] ▶️ 开始步骤：${name}`);
  console.log(`command: ${command}`);

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: options.cwd,
      env: process.env,
    });
    const tsEnd = new Date().toISOString();
    console.log(`[${tsEnd}] ✅ 步骤完成：${name}`);
  } catch (err) {
    const tsErr = new Date().toISOString();
    console.error(`[${tsErr}] ❌ 步骤失败：${name}`);
    if (err && err.message) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    throw err;
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log('══════════════════════════════════════════════════');
  console.log('🌱 restore-core-config-and-catalog.js');
  console.log('   一键恢复核心配置 (L1/L2) 与商品目录的初始化流水线');
  console.log(`   Started at: ${startedAt}`);
  console.log('══════════════════════════════════════════════════\n');

  loadEnv();

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('❌ 未检测到 DATABASE_URL，无法执行恢复脚本。请先在 backend/.env 或根目录 .env 中配置 DATABASE_URL。');
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, '..', '..');
  const isProdLike = looksLikeProdDatabase(dbUrl);

  // [2026-03-03 09:30:00] 默认禁止在疑似生产库上执行，除非显式设置 RESTORE_ALLOW_PROD=1 且二次确认 TOKEN 匹配
  if (isProdLike) {
    console.warn('⚠️ 检测到 DATABASE_URL 指向共享/生产数据库（包含 neon.tech / run.app / amazonaws.com 等特征）。');
    console.warn('⚠️ 本脚本会清空并重建商品目录等核心数据，请确认已经做好备份。');
    if (process.env.RESTORE_ALLOW_PROD !== '1') {
      console.error('❌ RESTORE_ALLOW_PROD 未设置为 1，出于安全原因拒绝在生产库上执行。');
      console.error('   如需在生产库上执行，请显式设置：RESTORE_ALLOW_PROD=1 RESTORE_CONFIRM_TOKEN=core-catalog');
      process.exit(1);
    }
    if (process.env.RESTORE_CONFIRM_TOKEN !== 'core-catalog') {
      console.error('❌ RESTORE_CONFIRM_TOKEN 校验失败，当前值不为 "core-catalog"。');
      console.error('   请设置 RESTORE_CONFIRM_TOKEN=core-catalog 以确认你已经理解该脚本会覆盖核心商品与配置数据。');
      process.exit(1);
    }
    console.log('✅ 已显式允许在生产库上执行（RESTORE_ALLOW_PROD=1 & RESTORE_CONFIRM_TOKEN=core-catalog）。');
  }

  try {
    // ────────────────────────────────────────────────
    // L1: 基础账号与类目 / 商品目录骨架
    // ────────────────────────────────────────────────

    // 管理员 & 管理账号
    runStep(
      '创建/修复核心管理员账户 (ADMIN)',
      'node backend/scripts/create-admin-user.js',
      { cwd: repoRoot }
    );
    runStep(
      '创建/修复 Thea & Patrick 管理员账户',
      'node backend/scripts/create-manager-users.js',
      { cwd: repoRoot }
    );
    runStep(
      '创建/修复 Sales / Sales Manager 账号',
      'node backend/scripts/seed-sales-production.js',
      { cwd: repoRoot }
    );

    // 商品类目
    runStep(
      '初始化 12 个商品分类（categories）',
      'node scripts/seed-categories.js',
      { cwd: repoRoot }
    );

    // 商品目录清空 + 商品/变体来源二选一
    runStep(
      '清空商品目录相关表（product / variant / productImage / productColorImage）',
      'node backend/scripts/clear_catalog.js',
      { cwd: repoRoot }
    );

    // [2026-03-03 13:10:00] 若设置 RESTORE_USE_CUSTOMINK=1 且存在爬虫 CSV，则用 CustomInk 数据；否则用 demo 数据
    const custominkCsvPath = path.join(repoRoot, 'customink-crawler', 'output_v2', 'products.csv');
    const useCustomInk = process.env.RESTORE_USE_CUSTOMINK === '1' && fs.existsSync(custominkCsvPath);
    if (useCustomInk) {
      console.log('\n[使用 CustomInk 爬虫数据] customink-crawler/output_v2/*.csv');
      runStep(
        '导入 CustomInk 爬虫商品/变体/图片（import_cink_v2）',
        'node backend/scripts/import_cink_v2.js',
        { cwd: repoRoot }
      );
    } else {
      runStep(
        '导入示例品牌 + 商品 + 变体（Prisma 完整测试数据）',
        'node backend/scripts/seed-full-test-data.js',
        { cwd: repoRoot }
      );
      runStep(
        '为 products 表补充至少一个基础 variants 记录（pg 直连）',
        'node backend/scripts/seed-variants.js',
        { cwd: repoRoot }
      );
    }

    // 变体与尺码价格（CustomInk 与 demo 均需补 2XL–5XL）
    runStep(
      '为现有颜色补充 2XL–5XL 尺码变体并设置加价',
      'node backend/scripts/seed-size-pricing.js',
      { cwd: repoRoot }
    );

    // 变体图片填充
    runStep(
      '迁移商品图片到变体 imageUrl（按商品首图）',
      'node backend/scripts/migrate-variant-image-urls.js',
      { cwd: repoRoot }
    );
    runStep(
      '补全所有变体 imageUrl，确保黑/白变体都有图片',
      'node backend/scripts/fill-variant-image-urls.js',
      { cwd: repoRoot }
    );

    // 颜色映射（settings.site.colorMappings）
    runStep(
      '写入高保真颜色映射（含 GCS 图片）到 settings.site.colorMappings',
      'node backend/scripts/seed-color-mappings-v2.js',
      { cwd: repoRoot }
    );

    // 配送模板（shippingTemplate / shippingRule）
    runStep(
      '迁移默认配送配置为数据库模板（Standard / Express / Free Over 100）',
      'node backend/scripts/migrate-shipping-config.js',
      { cwd: repoRoot }
    );

    // ────────────────────────────────────────────────
    // L2: 线下订单配置 / 尺码附加费等运营设置
    // ────────────────────────────────────────────────

    // 线下订单默认商品 & 颜色
    runStep(
      '初始化线下订单默认产品与颜色列表',
      'node backend/scripts/seed-offline-defaults.js',
      { cwd: repoRoot }
    );

    // 线下订单尺码基础配置 + 大码附加费
    runStep(
      '迁移并补齐 offline_order_size_fees 尺码基础配置',
      'node backend/scripts/migrate-size-fees.js',
      { cwd: repoRoot }
    );
    runStep(
      '为 2XL–5XL 写入线下订单尺码附加费',
      'node backend/scripts/seed-offline-order-fees.js',
      { cwd: repoRoot }
    );
    runStep(
      '按 Infant/Toddler/Youth/Adult 顺序重排 offline_order_size_fees.display_order',
      'node scripts/reorder_size_fees.js',
      { cwd: repoRoot }
    );

    // [2026-03-02 14:30:00] L2 完成后执行数据完整性自检
    runStep(
      '数据完整性自检',
      'node backend/scripts/verify-core-data-integrity.js',
      { cwd: repoRoot }
    );

    const finishedAt = new Date().toISOString();
    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ 核心配置 & 商品目录初始化流水线执行完成');
    console.log(`   Finished at: ${finishedAt}`);
    console.log('   L1: 商品类目 / 商品 & 变体 / 颜色映射 / 配送模板 已恢复');
    console.log('   L2: 线下订单默认产品 / 颜色 / 尺码附加费 配置已写入');
    console.log('   已执行核心数据完整性自检并通过。');
    console.log('══════════════════════════════════════════════════\n');
  } catch (err) {
    const failedAt = new Date().toISOString();
    console.error('\n══════════════════════════════════════════════════');
    console.error('❌ 初始化流水线中途失败，请根据上方日志定位具体步骤并单独重试。');
    console.error(`   Failed at: ${failedAt}`);
    console.error('══════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

