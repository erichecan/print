/**
 * 从已知的 Custom Ink 艺术素材 URL 模式导入素材
 * [2025-12-06 12:30:00] 使用已知的 URL 模式批量导入艺术素材到数据库和 GCS
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const gcsUtils = require('../backend/src/utils/gcsStorage');

const prisma = new PrismaClient();

// 艺术素材分类和 URL 模式
const ART_CATEGORIES = {
  'Emojis': [
    'smile', 'star', 'heart', 'fire', 'thumbs-up', 'thumbs-down',
    'like', 'love', 'laugh', 'wink', 'cool', 'angry', 'sad'
  ],
  'Shapes & Symbols': [
    'circle', 'square', 'triangle', 'diamond', 'arrow', 'checkmark',
    'cross', 'plus', 'minus', 'infinity', 'peace', 'yin-yang'
  ],
  'Sports & Games': [
    'basketball', 'football', 'soccer', 'baseball', 'tennis',
    'volleyball', 'golf', 'hockey', 'swimming', 'running'
  ],
  'Letters & Numbers': [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ],
  'Animals': [
    'lion', 'panda', 'frog', 'unicorn', 'bat', 'monkey',
    'cobra', 'pegasus', 'snake', 'dolphin', 'hedgehog',
    'spider', 'rabbit', 'horse', 'fox', 'fish', 'cat', 'dog',
    'bird', 'elephant', 'tiger', 'bear', 'wolf'
  ],
  'Mascots': [
    'eagle', 'hawk', 'falcon', 'tiger', 'lion', 'bear',
    'wolf', 'panther', 'bull', 'ram'
  ],
  'Nature': [
    'tree', 'flower', 'leaf', 'sun', 'moon', 'star',
    'cloud', 'rainbow', 'mountain', 'ocean', 'wave'
  ],
  'America': [
    'flag', 'eagle', 'liberty', 'statue', 'stars', 'stripes'
  ],
  'Food & Drink': [
    'pizza', 'burger', 'coffee', 'beer', 'wine', 'cocktail',
    'cake', 'ice-cream', 'donut', 'taco', 'sushi'
  ],
  'Travel': [
    'airplane', 'car', 'train', 'ship', 'bike', 'map',
    'compass', 'suitcase', 'passport', 'camera'
  ],
  'Objects': [
    'phone', 'laptop', 'watch', 'camera', 'headphones',
    'keyboard', 'mouse', 'monitor', 'speaker'
  ],
  'Clothing': [
    'shirt', 'hat', 'shoe', 'sock', 'glove', 'jacket',
    'pants', 'shorts', 'dress', 'skirt'
  ],
  'Activities': [
    'music', 'dance', 'yoga', 'meditation', 'reading',
    'writing', 'painting', 'cooking', 'gardening'
  ]
};

// Custom Ink 艺术素材 URL 模式
const BASE_URLS = [
  'https://www.customink.com/ndx/assets/art',
  'https://www.customink.com/ndx/assets/artwork',
  'https://pigment-cdn.customink.com/art',
  'https://cdn.customink.com/art'
];

/**
 * 下载图片
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        return downloadImage(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * 尝试下载艺术素材
 */
async function tryDownloadArtAsset(category, name) {
  const extensions = ['.png', '.svg', '.jpg', '.jpeg'];
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  for (const baseUrl of BASE_URLS) {
    for (const ext of extensions) {
      const url = `${baseUrl}/${categorySlug}/${nameSlug}${ext}`;
      const localPath = path.join(__dirname, '../customink-images/art-assets', categorySlug, `${nameSlug}${ext}`);
      
      // 确保目录存在
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 如果文件已存在，跳过
      if (fs.existsSync(localPath)) {
        return { success: true, url, localPath, fromCache: true };
      }
      
      try {
        await downloadImage(url, localPath);
        // 检查文件是否真的下载了（大小 > 0）
        const stats = fs.statSync(localPath);
        if (stats.size > 0) {
          return { success: true, url, localPath };
        } else {
          fs.unlinkSync(localPath);
        }
      } catch (error) {
        // 继续尝试下一个 URL
      }
    }
  }
  
  return { success: false };
}

/**
 * 上传到 GCS
 */
async function uploadToGcs(localPath, category, fileName) {
  try {
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const objectPath = gcsUtils.buildObjectPath('art-asset', [categorySlug, fileName]);
    
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'image/png';
    
    const publicUrl = await gcsUtils.uploadFileToGcs(localPath, objectPath, {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    });
    
    try {
      const bucketName = gcsUtils.getImageBucketName();
      const storage = gcsUtils.getStorageClient();
      const bucket = storage.bucket(bucketName);
      await bucket.file(objectPath).makePublic();
    } catch (error) {
      console.warn(`      ⚠️  设置公开权限失败: ${error.message}`);
    }
    
    return publicUrl;
  } catch (error) {
    console.error(`      ❌ GCS 上传失败: ${error.message}`);
    return null;
  }
}

/**
 * 导入艺术素材
 */
async function importArtAssets() {
  console.log('📥 开始从已知 URL 模式导入艺术素材...\n');

  let totalDownloaded = 0;
  let totalUploaded = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [category, items] of Object.entries(ART_CATEGORIES)) {
    console.log(`📂 处理分类: ${category} (${items.length} 个素材)`);
    
    for (const item of items) {
      try {
        // 尝试下载
        const result = await tryDownloadArtAsset(category, item);
        
        if (result.success) {
          if (!result.fromCache) {
            totalDownloaded++;
            console.log(`  ✅ 下载: ${item}`);
          } else {
            console.log(`  ○ 已存在: ${item}`);
          }
          
          // 上传到 GCS
          const fileName = path.basename(result.localPath);
          const gcsUrl = await uploadToGcs(result.localPath, category, fileName);
          
          if (gcsUrl) {
            totalUploaded++;
            console.log(`  ✅ 上传到 GCS: ${gcsUrl}`);
            
            // 导入到数据库
            const existing = await prisma.artAsset.findFirst({
              where: {
                name: item,
                category: category
              }
            });
            
            if (existing) {
              if (existing.image_url !== gcsUrl) {
                await prisma.artAsset.update({
                  where: { id: existing.id },
                  data: {
                    image_url: gcsUrl,
                    thumbnail_url: gcsUrl,
                    updated_at: new Date()
                  }
                });
                totalImported++;
                console.log(`  ✅ 更新数据库: ${item}`);
              } else {
                totalSkipped++;
              }
            } else {
              await prisma.artAsset.create({
                data: {
                  category: category,
                  name: item,
                  image_url: gcsUrl,
                  thumbnail_url: gcsUrl,
                  is_active: true,
                  sort_order: 0
                }
              });
              totalImported++;
              console.log(`  ✅ 导入数据库: ${item}`);
            }
          } else {
            totalErrors++;
            console.warn(`  ⚠️  GCS 上传失败: ${item}`);
          }
        } else {
          totalErrors++;
          console.warn(`  ⚠️  无法下载: ${item}`);
        }
        
        // 延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        totalErrors++;
        console.error(`  ❌ 处理失败 ${item}:`, error.message);
      }
    }
    
    console.log('');
  }

  console.log('\n✨ 导入完成！');
  console.log(`   - 下载: ${totalDownloaded} 个文件`);
  console.log(`   - 上传到 GCS: ${totalUploaded} 个文件`);
  console.log(`   - 导入/更新数据库: ${totalImported} 个素材`);
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

