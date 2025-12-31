/**
 * Import Artworks to Database
* 将 GCS 上传的素材 metadata 导入数据库
 * 
 * 用法: node scripts/ingest/import-artworks.ts [--input-dir=/tmp/art-crawler]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const INPUT_DIR = process.argv.find(arg => arg.startsWith('--input-dir='))?.split('=')[1] || '/tmp/art-crawler';
const prisma = new PrismaClient();

interface ArtworkMetadata {
  title: string;
  slug: string;
  sourceUrl: string;
  tags: string[];
  license: string;
  attribution?: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  gcsKey?: string;
  thumbnailKey?: string;
}

/**
* 获取或创建分类
 */
async function getOrCreateCategory(
  name: string,
  slug: string,
  parentId: string | null = null
): Promise<string> {
  let category = await prisma.artwork_categories.findUnique({
    where: { slug },
  });
  
  if (!category) {
    category = await prisma.artwork_categories.create({
      data: {
        name,
        slug,
        parent_id: parentId,
        is_active: true,
        sort_order: 0,
      },
    });
  }
  
  return category.id;
}

/**
* 导入单个分类的素材
 */
async function importCategory(topCategory: string, subCategory: string) {
  const categoryDir = path.join(INPUT_DIR, topCategory, subCategory);
  const metadataFile = path.join(categoryDir, 'metadata.json');
  
  if (!fs.existsSync(metadataFile)) {
    console.log(`⚠️  Metadata 文件不存在: ${metadataFile}`);
    return;
  }
  
  const metadata: ArtworkMetadata[] = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
  console.log(`\n📥 导入分类: ${topCategory} -> ${subCategory} (${metadata.length} 个素材)\n`);
  
// 获取或创建分类
  const topCategorySlug = topCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const subCategorySlug = subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  const topCategoryId = await getOrCreateCategory(topCategory, topCategorySlug);
  const subCategoryId = await getOrCreateCategory(subCategory, subCategorySlug, topCategoryId);
  
  const BUCKET_NAME = process.env.GCP_IMAGE_BUCKET || 'print-main-assets';
  const BASE_URL = process.env.GCP_IMAGE_BASE_URL || `https://storage.googleapis.com/${BUCKET_NAME}`;
  
  for (const artwork of metadata) {
    try {
// 支持两种模式：GCS 存储或外部 URL
      let imageUrl: string;
      let thumbnailUrl: string | null = null;
      let gcsKey: string | null = null;
      let gcsBucket: string | null = null;
      
      if (artwork.gcsKey) {
// 使用 GCS URL
        imageUrl = `${BASE_URL}/${artwork.gcsKey}`;
        thumbnailUrl = artwork.thumbnailKey ? `${BASE_URL}/${artwork.thumbnailKey}` : null;
        gcsKey = artwork.gcsKey;
        gcsBucket = BUCKET_NAME;
      } else if (artwork.sourceUrl) {
// 使用外部 URL（临时方案，用于测试）
        imageUrl = artwork.sourceUrl;
        thumbnailUrl = null;
        gcsKey = null;
        gcsBucket = null;
        console.log(`  ℹ️  使用外部 URL: ${artwork.title}`);
      } else {
        console.log(`  ⚠️  跳过（无 GCS key 和 sourceUrl）: ${artwork.title}`);
        continue;
      }
      
// 检查是否已存在
      const existing = await prisma.art_assets.findUnique({
        where: { slug: artwork.slug },
      });
      
      if (existing) {
        console.log(`  ⏭️  已存在: ${artwork.title}`);
        continue;
      }
      
// 创建素材记录（使用 uuid_generate_v4() 生成 UUID）
      await prisma.$executeRawUnsafe(`
        INSERT INTO art_assets (
          id, category, name, slug, description, image_url, thumbnail_url,
          file_size, width, height, mime_type, is_active, sort_order,
          top_category_id, sub_category_id, gcs_key, gcs_bucket, source_url,
          tags, license, attribution, status, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), $1::varchar, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::varchar,
          $7::integer, $8::integer, $9::integer, $10::varchar, $11::boolean, $12::integer,
          $13::uuid, $14::uuid, $15::varchar, $16::varchar, $17::varchar,
          $18::text[], $19::varchar, $20::text, $21::varchar, NOW(), NOW()
        )
        ON CONFLICT (slug) DO NOTHING
      `,
        topCategory,
        artwork.title,
        artwork.slug,
        artwork.attribution || null,
        imageUrl,
        thumbnailUrl,
        null,
        artwork.width || null,
        artwork.height || null,
        artwork.mimeType,
        true,
        0,
        topCategoryId,
        subCategoryId,
        gcsKey,
        gcsBucket,
        artwork.sourceUrl,
        artwork.tags,
        artwork.license,
        artwork.attribution || null,
        'active'
      );
      
      console.log(`  ✅ 导入: ${artwork.title}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 失败: ${artwork.title} - ${errorMessage}`);
    }
  }
}

/**
* 主函数
 */
async function main() {
console.log(' 开始导入素材到数据库...\n');
  console.log(`📁 输入目录: ${INPUT_DIR}\n`);
  
// 扫描所有分类目录
  const topCategories = fs.readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const topCategory of topCategories) {
    const topCategoryPath = path.join(INPUT_DIR, topCategory);
    const subCategories = fs.readdirSync(topCategoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const subCategory of subCategories) {
      await importCategory(topCategory, subCategory);
    }
  }
  
  console.log('\n✅ 导入完成！\n');
}

// 运行
(main as () => Promise<void>)()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

export { main as importArtworks };
