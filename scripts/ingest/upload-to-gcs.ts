/**
 * Upload Artworks to GCS
 * [2025-12-11 23:20:00] 将本地抓取的素材上传到 Google Cloud Storage
 * 
 * 用法: node scripts/ingest/upload-to-gcs.ts [--input-dir=/tmp/art-crawler/emojis/animals]
 */

import * as fs from 'fs';
import * as path from 'path';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';

// [2025-12-11 23:20:00] 配置
const BUCKET_NAME = process.env.GCP_IMAGE_BUCKET || 'print-main-assets';
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const INPUT_DIR = process.argv.find(arg => arg.startsWith('--input-dir='))?.split('=')[1] || '/tmp/art-crawler';

// [2025-12-11 23:20:00] 初始化 GCS
const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

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
 * [2025-12-11 23:20:00] 生成缩略图
 */
async function generateThumbnail(inputPath: string, outputPath: string, width = 200, height = 200): Promise<void> {
  await sharp(inputPath)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

/**
 * [2025-12-11 23:20:00] 上传文件到 GCS
 */
async function uploadToGcs(localPath: string, gcsKey: string, contentType: string): Promise<string> {
  await bucket.upload(localPath, {
    destination: gcsKey,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      contentType,
    },
  });
  
  // [2025-12-11 23:20:00] 设置公开访问
  await bucket.file(gcsKey).makePublic();
  
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsKey}`;
  return publicUrl;
}

/**
 * [2025-12-11 23:20:00] 处理单个分类目录
 */
async function processCategory(topCategory: string, subCategory: string) {
  const categoryDir = path.join(INPUT_DIR, topCategory, subCategory);
  const metadataFile = path.join(categoryDir, 'metadata.json');
  
  if (!fs.existsSync(metadataFile)) {
    console.log(`⚠️  Metadata 文件不存在: ${metadataFile}`);
    return;
  }
  
  const metadata: ArtworkMetadata[] = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
  console.log(`\n📦 处理分类: ${topCategory} -> ${subCategory} (${metadata.length} 个素材)\n`);
  
  for (const artwork of metadata) {
    try {
      const localPath = path.join(categoryDir, artwork.fileName);
      if (!fs.existsSync(localPath)) {
        console.log(`  ⚠️  文件不存在: ${localPath}`);
        continue;
      }
      
      // [2025-12-11 23:20:00] 构建 GCS 路径
      const gcsKey = `art-asset/${topCategory.toLowerCase()}/${subCategory.toLowerCase()}/${artwork.slug}${path.extname(artwork.fileName)}`;
      const thumbnailKey = `art-asset/${topCategory.toLowerCase()}/${subCategory.toLowerCase()}/thumb/${artwork.slug}@200x200.jpg`;
      
      console.log(`  📤 上传: ${artwork.title}...`);
      
      // [2025-12-11 23:20:00] 获取图片尺寸
      const imageInfo = await sharp(localPath).metadata();
      artwork.width = imageInfo.width;
      artwork.height = imageInfo.height;
      
      // [2025-12-11 23:20:00] 上传原图
      const imageUrl = await uploadToGcs(localPath, gcsKey, artwork.mimeType);
      artwork.gcsKey = gcsKey;
      
      // [2025-12-11 23:20:00] 生成并上传缩略图
      const thumbnailPath = path.join(categoryDir, `thumb_${artwork.slug}.jpg`);
      await generateThumbnail(localPath, thumbnailPath);
      const thumbnailUrl = await uploadToGcs(thumbnailPath, thumbnailKey, 'image/jpeg');
      artwork.thumbnailKey = thumbnailKey;
      
      // [2025-12-11 23:20:00] 更新 metadata
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      console.log(`  ✅ 完成: ${imageUrl}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 失败: ${artwork.title} - ${errorMessage}\n`);
    }
  }
}

/**
 * [2025-12-11 23:20:00] 主函数
 */
async function main() {
  console.log('[2025-12-11 23:20:00] 开始上传素材到 GCS...\n');
  console.log(`📁 输入目录: ${INPUT_DIR}`);
  console.log(`🪣 GCS Bucket: ${BUCKET_NAME}\n`);
  
  // [2025-12-11 23:20:00] 扫描所有分类目录
  const topCategories = fs.readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const topCategory of topCategories) {
    const topCategoryPath = path.join(INPUT_DIR, topCategory);
    const subCategories = fs.readdirSync(topCategoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const subCategory of subCategories) {
      await processCategory(topCategory, subCategory);
    }
  }
  
  console.log('\n✅ 上传完成！\n');
}

// [2025-12-12 00:15:00] 运行
(main as () => Promise<void>)().catch(console.error);

export { main as uploadToGcs };
