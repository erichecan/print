/**
 * Custom Ink 促销产品页面图片爬虫脚本（支持 GCS 上传）
 * [2025-01-29 12:00:00] 爬取 Custom Ink 促销产品页面的所有图片（类别图标、产品图片、banner等）
 * [2025-01-29 14:00:00] 添加 GCS 上传功能，图片将上传到 Google Cloud Storage
 * 
 * 功能：
 * 1. 访问 https://www.customink.com/products/promotional-products/218
 * 2. 提取页面上的所有图片URL（包括img标签和CSS背景图片）
 * 3. 下载图片到本地目录（临时存储）
 * 4. 上传图片到 GCS
 * 5. 保存图片清单到JSON文件（包含 GCS URL）
 * 
 * 环境变量：
 * - GCP_IMAGE_BUCKET: GCS bucket 名称（必需）
 * - GCP_IMAGE_BASE_URL: GCS 基础 URL（可选，默认使用 storage.googleapis.com）
 * - GCP_PROJECT_ID: GCP 项目 ID（可选）
 */

/**
 * [2025-01-29 12:00:00] Playwright 导入 - 兼容不同的安装方式
 */
let playwright;
try {
  // 尝试使用根目录的 playwright
  playwright = require('playwright');
} catch (e) {
  try {
    // 尝试使用 apps/web 的 @playwright/test
    playwright = require('@playwright/test');
  } catch (e2) {
    console.error('❌ Playwright 未安装！');
    console.error('   请运行以下命令之一：');
    console.error('   1. npm install playwright');
    console.error('   2. cd apps/web && npm install');
    process.exit(1);
  }
}

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * [2025-01-29 14:00:00] GCS 上传功能
 * 使用项目中已有的 GCS 工具函数
 */
let gcsUtils = null;
let useGcs = false;

try {
  // 尝试加载 GCS 工具函数
  const gcsStoragePath = path.join(__dirname, '../backend/src/utils/gcsStorage.js');
  if (fs.existsSync(gcsStoragePath)) {
    gcsUtils = require(gcsStoragePath);
    // 检查是否配置了 bucket
    try {
      const bucketName = gcsUtils.getImageBucketName();
      useGcs = true;
      console.log(`📦 GCS Bucket: ${bucketName}`);
    } catch (error) {
      console.log(`⚠️  GCS 未配置: ${error.message}`);
      console.log(`   图片将只保存到本地，不会上传到 GCS`);
    }
  }
} catch (error) {
  console.log(`⚠️  GCS 工具加载失败: ${error.message}`);
}

// 目标页面URL
const TARGET_URL = 'https://www.customink.com/products/promotional-products/218';

// 输出目录
const IMAGES_DIR = path.join(__dirname, '../customink-images/promotional-products');
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');

// 确保目录存在
[IMAGES_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 下载图片
 * [2025-01-29 12:00:00] 支持HTTP/HTTPS下载，处理重定向
 */
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(imageUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const file = fs.createWriteStream(outputPath);
      
      const request = client.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(outputPath);
          });
          file.on('error', (err) => {
            file.close();
            fs.unlinkSync(outputPath);
            reject(err);
          });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
          // 处理重定向
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
        } else {
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        }
      });
      
      request.on('error', (err) => {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(err);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error('Request timeout'));
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 规范化URL
 * [2025-01-29 12:00:00] 将相对URL转换为绝对URL
 */
function normalizeUrl(url, baseUrl) {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return new URL(url, baseUrl).href;
    }
    return new URL(url, baseUrl).href;
  } catch (error) {
    console.warn(`   ⚠️  URL规范化失败: ${url}`, error.message);
    return null;
  }
}

/**
 * 从文件名提取扩展名
 * [2025-01-29 12:00:00] 从URL或文件名中提取图片扩展名
 */
function getImageExtension(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i);
    if (match) {
      return match[1].toLowerCase();
    }
    // 默认使用png
    return 'png';
  } catch {
    return 'png';
  }
}

/**
 * 生成安全的文件名
 * [2025-01-29 12:00:00] 从URL生成安全的文件名
 */
function generateSafeFileName(url, category = 'misc', index = 0) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = getImageExtension(url);
    
    // 尝试从路径中提取文件名
    const pathParts = pathname.split('/').filter(p => p);
    let fileName = pathParts[pathParts.length - 1] || `image-${index}`;
    
    // 移除查询参数部分
    fileName = fileName.split('?')[0];
    fileName = fileName.split('.')[0];
    
    // 清理文件名，只保留字母数字和连字符
    fileName = fileName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    fileName = fileName.replace(/-+/g, '-');
    fileName = fileName.replace(/^-|-$/g, '');
    
    if (!fileName || fileName.length < 3) {
      fileName = `${category}-${index}`;
    }
    
    // 限制文件名长度
    if (fileName.length > 100) {
      fileName = fileName.substring(0, 100);
    }
    
    return `${fileName}.${extension}`;
  } catch {
    return `${category}-${index}.png`;
  }
}

/**
 * 从页面提取所有图片URL
 * [2025-01-29 12:00:00] 提取img标签、CSS背景图片等
 */
async function extractAllImages(page, baseUrl) {
  const images = new Map(); // 使用Map去重
  
  try {
    // 1. 提取所有img标签的src
    const imgElements = await page.$$eval('img', (imgs) => {
      return imgs.map(img => ({
        src: img.src || img.dataset.src || img.dataset.lazySrc,
        alt: img.alt || '',
        className: img.className || '',
        width: img.width || 0,
        height: img.height || 0
      }));
    });
    
    console.log(`   📷 找到 ${imgElements.length} 个 img 标签`);
    
    for (const img of imgElements) {
      if (img.src) {
        const normalizedUrl = normalizeUrl(img.src, baseUrl);
        if (normalizedUrl && !images.has(normalizedUrl)) {
          images.set(normalizedUrl, {
            url: normalizedUrl,
            type: 'img',
            alt: img.alt,
            className: img.className,
            width: img.width,
            height: img.height
          });
        }
      }
    }
    
    // 2. 提取CSS背景图片
    const elementsWithBg = await page.$$eval('*', (elements) => {
      const results = [];
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
          const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (match && match[1]) {
            results.push({
              url: match[1],
              className: el.className || '',
              tagName: el.tagName
            });
          }
        }
      });
      return results;
    });
    
    console.log(`   🎨 找到 ${elementsWithBg.length} 个 CSS 背景图片`);
    
    for (const bg of elementsWithBg) {
      if (bg.url) {
        const normalizedUrl = normalizeUrl(bg.url, baseUrl);
        if (normalizedUrl && !images.has(normalizedUrl)) {
          images.set(normalizedUrl, {
            url: normalizedUrl,
            type: 'background',
            className: bg.className,
            tagName: bg.tagName
          });
        }
      }
    }
    
    // 3. 提取picture/source标签
    const pictureSources = await page.$$eval('picture source, source[srcset]', (sources) => {
      return sources.map(source => ({
        srcset: source.srcset || '',
        sizes: source.sizes || ''
      }));
    });
    
    console.log(`   🖼️  找到 ${pictureSources.length} 个 source 标签`);
    
    for (const source of pictureSources) {
      if (source.srcset) {
        // srcset可能包含多个URL，需要解析
        const urls = source.srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        for (const url of urls) {
          if (url) {
            const normalizedUrl = normalizeUrl(url, baseUrl);
            if (normalizedUrl && !images.has(normalizedUrl)) {
              images.set(normalizedUrl, {
                url: normalizedUrl,
                type: 'source',
                sizes: source.sizes
              });
            }
          }
        }
      }
    }
    
    console.log(`   ✅ 总共找到 ${images.size} 个唯一图片URL\n`);
    
    return Array.from(images.values());
  } catch (error) {
    console.error(`   ❌ 提取图片失败: ${error.message}`);
    return [];
  }
}

/**
 * 上传图片到 GCS
 * [2025-01-29 14:00:00] 将本地图片上传到 Google Cloud Storage
 */
async function uploadToGcs(localPath, category, fileName) {
  if (!useGcs || !gcsUtils) {
    return null;
  }
  
  try {
    // 构建 GCS 对象路径: promotional-products/{category}/{fileName}
    const objectPath = gcsUtils.buildObjectPath('promotional-products', [category, fileName]);
    
    // 获取 Content-Type
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
    
    // 上传到 GCS
    const publicUrl = await gcsUtils.uploadFileToGcs(localPath, objectPath, {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    });
    
    // 设置文件为公共可读
    try {
      const bucketName = gcsUtils.getImageBucketName();
      const storage = gcsUtils.getStorageClient();
      const bucket = storage.bucket(bucketName);
      await bucket.file(objectPath).makePublic();
    } catch (error) {
      // 如果已经公开或权限设置失败，继续执行
      console.warn(`      ⚠️  设置公开权限失败: ${error.message}`);
    }
    
    return publicUrl;
  } catch (error) {
    console.error(`      ❌ GCS 上传失败: ${error.message}`);
    return null;
  }
}

/**
 * 检查是否为 data URI
 * [2025-01-29 14:00:00] data URI 不需要上传到 GCS
 */
function isDataUri(url) {
  return url && url.startsWith('data:');
}

/**
 * 分类图片
 * [2025-01-29 12:00:00] 根据URL特征将图片分类
 */
function categorizeImage(imageUrl, alt = '') {
  const url = imageUrl.toLowerCase();
  const altText = alt.toLowerCase();
  
  // 类别图片
  if (url.includes('category') || url.includes('cat-') || altText.includes('category')) {
    return 'categories';
  }
  
  // Logo
  if (url.includes('logo') || altText.includes('logo')) {
    return 'logos';
  }
  
  // Banner/Hero
  if (url.includes('banner') || url.includes('hero') || url.includes('promo')) {
    return 'banners';
  }
  
  // 产品图片
  if (url.includes('product') || url.includes('item')) {
    return 'products';
  }
  
  // 图标
  if (url.includes('icon') || url.includes('ico')) {
    return 'icons';
  }
  
  // 其他
  return 'misc';
}

/**
 * 主函数：爬取促销产品页面图片
 * [2025-01-29 12:00:00] 执行完整的爬取流程
 */
async function crawlPromotionalProductsImages() {
  console.log('🚀 开始爬取 Custom Ink 促销产品页面图片...\n');
  console.log(`📄 目标页面: ${TARGET_URL}\n`);
  
  if (useGcs) {
    console.log(`☁️  GCS 上传: 已启用\n`);
  } else {
    console.log(`💾 存储模式: 仅本地（GCS 未配置）\n`);
  }
  
  const browser = await playwright.chromium.launch({
    headless: false, // 显示浏览器以便调试
    slowMo: 500 // 减慢操作速度
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  const allImages = [];
  const categoryDirs = new Set();
  
  try {
    // 访问目标页面
    console.log('🌐 正在访问页面...');
    await page.goto(TARGET_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 120000 
    });
    console.log('✅ 页面加载完成\n');
    
    // 等待页面完全渲染
    await page.waitForTimeout(5000);
    
    // 滚动页面以加载懒加载图片
    console.log('📜 滚动页面以加载懒加载内容...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await page.waitForTimeout(2000);
    console.log('✅ 滚动完成\n');
    
    // 提取所有图片
    console.log('🔍 正在提取图片URL...');
    const images = await extractAllImages(page, TARGET_URL);
    
    if (images.length === 0) {
      console.log('⚠️  未找到任何图片');
      return;
    }
    
    // 下载图片
    console.log('📥 开始下载图片...\n');
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const category = categorizeImage(image.url, image.alt || '');
      const categoryDir = path.join(IMAGES_DIR, category);
      
      // 创建分类目录
      if (!categoryDirs.has(category)) {
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
        categoryDirs.add(category);
      }
      
      // 生成文件名
      const fileName = generateSafeFileName(image.url, category, i);
      const outputPath = path.join(categoryDir, fileName);
      
      // 如果文件已存在，跳过
      if (fs.existsSync(outputPath)) {
        console.log(`   ⏭️  跳过 (已存在): [${category}] ${fileName}`);
        allImages.push({
          ...image,
          category: category,
          localPath: outputPath,
          status: 'skipped'
        });
        continue;
      }
      
      // 跳过 data URI 图片
      if (isDataUri(image.url)) {
        console.log(`   ⏭️  跳过 (data URI): [${category}] ${fileName}`);
        allImages.push({
          ...image,
          category: category,
          status: 'skipped',
          reason: 'data URI'
        });
        continue;
      }
      
      try {
        console.log(`   ⬇️  下载 [${i + 1}/${images.length}]: [${category}] ${fileName}`);
        await downloadImage(image.url, outputPath);
        
        // 检查文件是否成功下载
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            let gcsUrl = null;
            
            // 上传到 GCS
            if (useGcs) {
              console.log(`      ☁️  上传到 GCS...`);
              gcsUrl = await uploadToGcs(outputPath, category, fileName);
              if (gcsUrl) {
                console.log(`      ✅ GCS: ${gcsUrl}`);
              }
            }
            
            allImages.push({
              ...image,
              category: category,
              localPath: outputPath,
              fileSize: stats.size,
              gcsUrl: gcsUrl,
              status: 'success'
            });
            console.log(`      ✅ 成功 (${(stats.size / 1024).toFixed(2)} KB)`);
          } else {
            fs.unlinkSync(outputPath);
            allImages.push({
              ...image,
              category: category,
              status: 'failed',
              error: 'File is empty'
            });
            console.log(`      ❌ 失败: 文件为空`);
          }
        } else {
          allImages.push({
            ...image,
            category: category,
            status: 'failed',
            error: 'File not created'
          });
          console.log(`      ❌ 失败: 文件未创建`);
        }
        
        // 添加延迟避免请求过快
        await page.waitForTimeout(300);
        
      } catch (error) {
        allImages.push({
          ...image,
          category: category,
          status: 'failed',
          error: error.message
        });
        console.log(`      ❌ 失败: ${error.message}`);
      }
    }
    
    // 统计结果
    const successCount = allImages.filter(img => img.status === 'success').length;
    const failedCount = allImages.filter(img => img.status === 'failed').length;
    const skippedCount = allImages.filter(img => img.status === 'skipped').length;
    const gcsUploadCount = allImages.filter(img => img.gcsUrl).length;
    
    console.log('\n✅ 爬取完成！');
    console.log(`   - 总图片数: ${allImages.length}`);
    console.log(`   - 下载成功: ${successCount} 张`);
    console.log(`   - 下载失败: ${failedCount} 张`);
    console.log(`   - 跳过: ${skippedCount} 张`);
    if (useGcs) {
      console.log(`   - GCS 上传: ${gcsUploadCount} 张`);
      if (gcsUploadCount < successCount) {
        console.log(`   ⚠️  注意: ${successCount - gcsUploadCount} 张图片未上传到 GCS`);
      }
    }
    console.log(`   - 图片目录: ${IMAGES_DIR}`);
    
    // 保存图片清单
    const inventory = {
      timestamp: new Date().toISOString(),
      sourceUrl: TARGET_URL,
      gcsEnabled: useGcs,
      gcsBucket: useGcs ? gcsUtils.getImageBucketName() : null,
      totalImages: allImages.length,
      successCount: successCount,
      failedCount: failedCount,
      skippedCount: skippedCount,
      gcsUploadCount: gcsUploadCount,
      categories: Array.from(categoryDirs),
      images: allImages
    };
    
    const inventoryPath = path.join(OUTPUT_DIR, 'promotional-products-image-inventory.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    console.log(`   - 清单文件: ${inventoryPath}\n`);
    
  } catch (error) {
    console.error('❌ 爬取过程中出错:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// 运行爬虫
if (require.main === module) {
  crawlPromotionalProductsImages().catch(console.error);
}

module.exports = { 
  crawlPromotionalProductsImages, 
  downloadImage, 
  extractAllImages,
  uploadToGcs
};

