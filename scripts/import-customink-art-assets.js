/**
 * 导入从 Custom Ink 爬取的艺术素材到数据库
 * [2025-12-06 12:30:00] 从 JSON 文件导入艺术素材数据到数据库
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 数据文件路径
const DATA_FILE = path.join(__dirname, '../customink-images/art-assets/art-assets-data.json');

/**
 * 导入艺术素材
 */
async function importArtAssets() {
  console.log('📥 开始导入艺术素材数据...\n');

  // 检查数据文件是否存在
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ 数据文件不存在: ${DATA_FILE}`);
    console.log('   请先运行 scrape-customink-art-assets.js 爬取数据');
    process.exit(1);
  }

  // 读取数据文件
  const artData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`📄 读取数据文件: ${DATA_FILE}`);
  console.log(`   分类数: ${artData.categories.length}`);
  console.log(`   总素材数: ${Object.values(artData.assets).reduce((sum, arr) => sum + arr.length, 0)}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 遍历所有分类
  for (const category of artData.categories) {
    const categorySlug = category.slug;
    const categoryName = category.name;
    const assets = artData.assets[categorySlug] || [];

    console.log(`📂 处理分类: ${categoryName} (${assets.length} 个素材)`);

    for (const asset of assets) {
      try {
        // 检查是否已存在（根据名称和分类）
        const existing = await prisma.artAsset.findFirst({
          where: {
            name: asset.name,
            category: categoryName
          }
        });

        if (existing) {
          // 更新现有记录（如果 URL 不同）
          if (existing.image_url !== asset.imageUrl) {
            await prisma.artAsset.update({
              where: { id: existing.id },
              data: {
                image_url: asset.imageUrl,
                thumbnail_url: asset.thumbnailUrl || asset.imageUrl,
                updated_at: new Date()
              }
            });
            console.log(`  ✅ 更新: ${asset.name}`);
            totalImported++;
          } else {
            console.log(`  ○ 已存在: ${asset.name}`);
            totalSkipped++;
          }
        } else {
          // 创建新记录
          await prisma.artAsset.create({
            data: {
              category: categoryName,
              name: asset.name,
              image_url: asset.imageUrl,
              thumbnail_url: asset.thumbnailUrl || asset.imageUrl,
              is_active: true,
              sort_order: 0
            }
          });
          console.log(`  ✅ 导入: ${asset.name}`);
          totalImported++;
        }
      } catch (error) {
        console.error(`  ❌ 导入失败 ${asset.name}:`, error.message);
        totalErrors++;
      }
    }

    console.log('');
  }

  console.log('\n✨ 导入完成！');
  console.log(`   - 导入/更新: ${totalImported} 个素材`);
  console.log(`   - 跳过: ${totalSkipped} 个素材`);
  console.log(`   - 错误: ${totalErrors} 个素材`);
}

// 运行导入
if (require.main === module) {
  importArtAssets()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { importArtAssets };

