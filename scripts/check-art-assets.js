/**
 * Check Art Assets Data Status
 * [2025-01-30 12:00:00] 检查 artwork_categories 和 art_assets 表的数据状态，以及 GCS bucket 中的文件
 * 
 * 用法: node scripts/check-art-assets.js
 */

// [2025-01-30 12:05:00] 加载环境变量
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const gcsUtils = require('../backend/src/utils/gcsStorage');

// [2025-01-30 12:05:00] 检查 DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  console.error('\n请先配置数据库连接:');
  console.error('  1. 创建 .env 文件（如果不存在）');
  console.error('  2. 添加 DATABASE_URL=postgresql://user:password@host:port/database');
  console.error('  3. 或者从 Secret Manager / 环境配置中加载');
  console.error('\n示例:');
  console.error('  echo "DATABASE_URL=postgresql://user:pass@localhost:5432/print_main" > .env');
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * [2025-01-30 12:00:00] 检查数据库数据
 */
async function checkDatabase() {
  console.log('\n📊 检查数据库数据...\n');

  try {
    // [2025-01-30 12:00:00] 检查 artwork_categories 表
    const categoryCount = await prisma.artwork_categories.count();
    console.log(`✅ artwork_categories 表: ${categoryCount} 条记录`);

    if (categoryCount > 0) {
      const topCategories = await prisma.artwork_categories.findMany({
        where: { parent_id: null },
        include: {
          children: {
            select: { id: true, name: true, slug: true },
          },
        },
        take: 10,
      });

      console.log(`\n📁 一级分类 (前 10 个):`);
      topCategories.forEach((cat) => {
        const subCount = cat.children?.length || 0;
        console.log(`   - ${cat.name} (${cat.slug}) - ${subCount} 个子分类`);
      });
    }

    // [2025-01-30 12:00:00] 检查 art_assets 表
    const assetCount = await prisma.art_assets.count();
    console.log(`\n✅ art_assets 表: ${assetCount} 条记录`);

    if (assetCount > 0) {
      const sampleAssets = await prisma.art_assets.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          gcs_key: true,
          top_category: { select: { name: true, slug: true } },
          sub_category: { select: { name: true, slug: true } },
        },
        take: 5,
      });

      console.log(`\n🖼️  示例素材 (前 5 个):`);
      sampleAssets.forEach((asset) => {
        const categoryPath = asset.top_category
          ? `${asset.top_category.slug}${asset.sub_category ? `/${asset.sub_category.slug}` : ''}`
          : '未分类';
        console.log(`   - ${asset.name} (${categoryPath})`);
        if (asset.gcs_key) {
          console.log(`     GCS: ${asset.gcs_key}`);
        }
      });
    }

    // [2025-01-30 12:00:00] 统计按分类的素材数量
    if (categoryCount > 0 && assetCount > 0) {
      const categoryStats = await prisma.art_assets.groupBy({
        by: ['top_category_id'],
        _count: { id: true },
        where: { top_category_id: { not: null } },
      });

      if (categoryStats.length > 0) {
        console.log(`\n📈 按分类统计:`);
        for (const stat of categoryStats) {
          const category = await prisma.artwork_categories.findUnique({
            where: { id: stat.top_category_id },
            select: { name: true, slug: true },
          });
          if (category) {
            console.log(`   - ${category.name}: ${stat._count.id} 个素材`);
          }
        }
      }
    }

    return { categoryCount, assetCount };
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('   提示: 请先运行数据库迁移: npx prisma migrate dev');
    }
    throw error;
  }
}

/**
 * [2025-01-30 12:00:00] 检查 GCS bucket 中的文件
 */
async function checkGCS() {
  console.log('\n☁️  检查 GCS bucket 中的文件...\n');

  try {
    const bucketName = gcsUtils.getImageBucketName();
    console.log(`📦 Bucket: ${bucketName}`);

    const storage = gcsUtils.getStorageClient();
    const bucket = storage.bucket(bucketName);

    // [2025-01-30 12:00:00] 检查 art-asset 前缀的文件
    const [files] = await bucket.getFiles({ prefix: 'art-asset/' });

    console.log(`✅ art-asset/ 前缀的文件: ${files.length} 个`);

    if (files.length > 0) {
      // [2025-01-30 12:00:00] 按目录分组统计
      const dirMap = new Map();
      files.forEach((file) => {
        const pathParts = file.name.split('/');
        if (pathParts.length >= 3) {
          const dir = `${pathParts[0]}/${pathParts[1]}/${pathParts[2]}`;
          dirMap.set(dir, (dirMap.get(dir) || 0) + 1);
        }
      });

      console.log(`\n📁 目录结构 (前 10 个):`);
      Array.from(dirMap.entries())
        .slice(0, 10)
        .forEach(([dir, count]) => {
          console.log(`   - ${dir}: ${count} 个文件`);
        });

      // [2025-01-30 12:00:00] 检查缩略图
      const thumbFiles = files.filter((f) => f.name.includes('/thumb/'));
      console.log(`\n🖼️  缩略图文件: ${thumbFiles.length} 个`);
    } else {
      console.log('⚠️  未找到 art-asset/ 前缀的文件');
      console.log('   提示: 如果数据不足，请运行爬虫和上传脚本');
    }

    return { fileCount: files.length };
  } catch (error) {
    console.warn('⚠️  GCS 检查跳过:', error.message);
    if (error.message.includes('GCP_IMAGE_BUCKET')) {
      console.warn('   提示: 请在环境变量中设置 GCP_IMAGE_BUCKET（可选，不影响数据库检查）');
    } else if (error.message.includes('credentials')) {
      console.warn('   提示: 请配置 GCP 应用默认凭证 (Application Default Credentials)（可选）');
    }
    // [2025-01-30 12:00:00] GCS 检查失败不影响整体流程，只记录警告
    return { fileCount: 0, error: error.message, skipped: true };
  }
}

/**
 * [2025-01-30 12:00:00] 主函数
 */
async function main() {
  console.log('🔍 Design Lab Add Art 数据状态检查\n');
  console.log('=' .repeat(60));

  try {
    // [2025-01-30 12:00:00] 检查数据库
    const dbResult = await checkDatabase();

    // [2025-01-30 12:00:00] 检查 GCS
    const gcsResult = await checkGCS();

    // [2025-01-30 12:00:00] 总结
    console.log('\n' + '='.repeat(60));
    console.log('📋 检查总结:\n');
    console.log(`   数据库分类: ${dbResult.categoryCount} 个`);
    console.log(`   数据库素材: ${dbResult.assetCount} 个`);
    if (gcsResult.skipped) {
      console.log(`   GCS 文件: 未检查（缺少配置）`);
    } else {
      console.log(`   GCS 文件: ${gcsResult.fileCount} 个`);
    }

    if (dbResult.categoryCount === 0 || dbResult.assetCount === 0) {
      console.log('\n⚠️  数据不足，建议:');
      console.log('   1. 运行爬虫脚本: npm run crawl:emojis:animals (或自定义)');
      if (!gcsResult.skipped) {
        console.log('   2. 上传到 GCS: npm run ingest:upload');
      } else {
        console.log('   2. 配置 GCP_IMAGE_BUCKET 后上传到 GCS: npm run ingest:upload');
      }
      console.log('   3. 导入数据库: npm run ingest:db');
    } else if (!gcsResult.skipped && gcsResult.fileCount === 0) {
      console.log('\n⚠️  GCS 文件缺失，建议:');
      console.log('   1. 检查 GCP 凭证配置');
      console.log('   2. 运行上传脚本: npm run ingest:upload');
    } else if (gcsResult.skipped) {
      console.log('\n✅ 数据库表结构正常（GCS 检查已跳过）');
      console.log('   提示: 如需检查 GCS，请配置 GCP_IMAGE_BUCKET 环境变量');
    } else {
      console.log('\n✅ 数据状态正常，可以开始测试 Add Art 功能');
    }
  } catch (error) {
    console.error('\n❌ 检查过程出错:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// [2025-01-30 12:00:00] 运行主函数
main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
