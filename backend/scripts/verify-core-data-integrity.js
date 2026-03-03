#!/usr/bin/env node
// [2026-03-03 10:25:10] 核心数据完整性自检脚本（L1/L2）

const path = require('path');
const fs = require('fs');

// [2026-03-03 10:25:10] 优先从 backend/.env 或项目根 .env 加载 DATABASE_URL 等配置
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

loadEnv();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCoreData() {
  const ts = new Date().toISOString();
  console.log('═══════════════════════════════════════');
  console.log('🔍 核心数据完整性自检（L1/L2）');
  console.log(`Timestamp: ${ts}`);
  console.log('═══════════════════════════════════════\n');

  let hasError = false;

  try {
    // [2026-03-03 10:25:10] 1. 管理员账户检查
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    if (adminCount <= 0) {
      console.error('❌ 未找到任何 ADMIN 角色用户');
      hasError = true;
    } else {
      console.log(`✅ ADMIN 用户数量：${adminCount}`);
    }

    // [2026-03-03 10:25:10] 2. 类目 / 商品 / 变体 / 图片基础检查
    const categoryCount = await prisma.category.count();
    const activeCategoryCount = await prisma.category.count({
      where: { isActive: true },
    });
    if (activeCategoryCount < 12) {
      console.error(`❌ 活跃分类数量过少：${activeCategoryCount}（期望 ≥ 12）`);
      hasError = true;
    } else {
      console.log(`✅ 分类数量：全部 ${categoryCount} 个，活跃 ${activeCategoryCount} 个`);
    }

    const productCount = await prisma.product.count();
    const variantCount = await prisma.variant.count();
    const imageCount = await prisma.productImage.count();

    if (productCount === 0) {
      console.error('❌ products 表为空');
      hasError = true;
    } else {
      console.log(`✅ products 数量：${productCount}`);
    }
    if (variantCount === 0) {
      console.error('❌ variants 表为空');
      hasError = true;
    } else {
      console.log(`✅ variants 数量：${variantCount}`);
    }
    if (imageCount === 0) {
      console.error('❌ productImages 表为空');
      hasError = true;
    } else {
      console.log(`✅ productImages 数量：${imageCount}`);
    }

    // [2026-03-03 10:25:10] 3. 变体图片完整性检查
    const variantsWithoutImage = await prisma.variant.count({
      where: {
        OR: [{ imageUrl: null }, { imageUrl: '' }],
      },
    });
    if (variantsWithoutImage > 0) {
      console.error(
        `❌ 仍有 ${variantsWithoutImage} 个变体缺少 imageUrl 字段，请检查 migrate-variant-image-urls / fill-variant-image-urls 是否正确执行`
      );
      hasError = true;
    } else {
      console.log('✅ 所有变体均已包含非空 imageUrl');
    }

    // [2026-03-03 10:25:10] 4. 线下尺码附加费检查（2XL–5XL）
    const requiredSizes = ['2XL', '3XL', '4XL', '5XL'];
    const sizeFees = await prisma.offline_order_size_fees.findMany({
      where: { size: { in: requiredSizes } },
      select: { size: true, additional_fee: true },
    });
    const sizeMap = new Map(sizeFees.map((s) => [s.size, s.additional_fee]));

    for (const size of requiredSizes) {
      if (!sizeMap.has(size)) {
        console.error(`❌ offline_order_size_fees 缺少尺码：${size}`);
        hasError = true;
      } else if (sizeMap.get(size) == null) {
        console.error(`❌ 尺码 ${size} 的 additional_fee 为空`);
        hasError = true;
      }
    }
    if (!hasError) {
      console.log(
        `✅ 2XL–5XL 尺码附加费配置存在且 additional_fee 非空（共 ${sizeFees.length} 条记录）`
      );
    }

    // [2026-03-03 10:25:10] 5. 颜色映射设置检查（settings.site.colorMappings）
    let colorMappingsOk = false;
    try {
      const rows =
        await prisma.$queryRaw`SELECT key, value FROM settings WHERE key = 'site.colorMappings'`;
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const raw = row.value;
        let parsed;
        if (typeof raw === 'string') {
          parsed = JSON.parse(raw);
        } else {
          parsed = raw;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          colorMappingsOk = true;
          console.log(
            `✅ settings.site.colorMappings 已配置，映射条目数量：${parsed.length}`
          );
        } else {
          console.error(
            '❌ settings.site.colorMappings 存在但内容为空数组或格式异常'
          );
          hasError = true;
        }
      } else {
        console.error('❌ 未找到 settings.site.colorMappings 配置项');
        hasError = true;
      }
    } catch (e) {
      console.error('❌ 读取 settings.site.colorMappings 失败：', e.message);
      hasError = true;
    }

    // [2026-03-03 10:25:10] 汇总结果
    console.log('\n═══════════════════════════════════════');
    if (hasError) {
      console.error('❌ 核心数据完整性检查未通过，请根据上方错误逐项修复后重试');
      console.log('═══════════════════════════════════════');
      process.exitCode = 1;
    } else {
      console.log('✅ 核心数据完整性检查通过（L1/L2 基础数据健康）');
      console.log('═══════════════════════════════════════');
      process.exitCode = 0;
    }
  } catch (err) {
    console.error('❌ 自检脚本执行过程中发生未捕获错误：', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyCoreData().catch((e) => {
    console.error('❌ verify-core-data-integrity 运行失败：', e);
    process.exit(1);
  });
}

