/**
 * 从 Custom Ink Design Lab 爬取艺术素材并上传到 GCS
 * [2025-12-06 12:30:00] 爬取 Add Art 功能中的所有艺术素材，保存到 GCS
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Storage } = require('@google-cloud/storage');
const gcsUtils = require('../backend/src/utils/gcsStorage');

// 配置
// [2025-12-06 12:30:00] 使用直接打开 Add Art 面板的 URL
const DESIGN_LAB_URL = 'https://www.customink.com/ndx/?SK=1503500&PK=1503502#/addArt?rs=m';
const OUTPUT_DIR = path.join(__dirname, '../customink-images/art-assets');
const BUCKET_NAME = process.env.GCP_IMAGE_BUCKET || 'print-main-assets';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 初始化 GCS
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

/**
 * 下载图片到本地
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
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
        fs.unlink(filePath, () => {}); // 删除不完整的文件
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  }).catch((error) => {
    console.error(`  ❌ 下载失败 ${url}:`, error.message);
    return false;
  });
}

/**
 * 上传文件到 GCS
 */
async function uploadToGcs(localPath, category, fileName) {
  try {
    // 构建 GCS 对象路径: art-assets/{category}/{fileName}
    const objectPath = gcsUtils.buildObjectPath('art-asset', [category, fileName]);
    
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
      console.warn(`      ⚠️  设置公开权限失败: ${error.message}`);
    }
    
    return publicUrl;
  } catch (error) {
    console.error(`      ❌ GCS 上传失败: ${error.message}`);
    return null;
  }
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从 Custom Ink Design Lab 爬取艺术素材
 */
async function scrapeArtAssets() {
  console.log('🕷️  开始爬取 Custom Ink Design Lab 艺术素材...\n');
  console.log(`目标 URL: ${DESIGN_LAB_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // 使用有头模式，方便调试
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📡 正在加载 Design Lab 页面（直接打开 Add Art 面板）...');
    await page.goto(DESIGN_LAB_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // 等待页面完全加载，包括单页应用的 JavaScript 执行
    console.log('⏳ 等待页面和 JavaScript 加载...');
    await delay(10000); // 增加等待时间，确保 SPA 完全加载

    // 等待 hash 路由加载完成
    await page.waitForFunction(() => {
      return window.location.hash.includes('addArt') || document.querySelector('[class*="art"], [class*="Art"]');
    }, { timeout: 30000 }).catch(() => {
      console.warn('⚠️  等待 Add Art 面板超时，继续执行...');
    });

    await delay(5000); // 额外等待确保内容加载

    console.log('🔍 正在查找 Art 面板内容...');

    // 监听网络请求，捕获艺术素材 URL
    const artAssetUrls = new Set();
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('art') || url.includes('artwork') || url.includes('asset')) {
        if (url.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
          artAssetUrls.add(url);
        }
      }
    });

    // 点击 Add Art 按钮
    try {
      // 等待页面稳定
      await page.waitForSelector('body', { timeout: 10000 });
      
      // 尝试多种选择器找到 Add Art 按钮
      const selectors = [
        'button[aria-label*="art" i]',
        'button[aria-label*="Art" i]',
        '[class*="art"][class*="btn"]',
        '[class*="rail"] button:nth-child(3)', // 通常 Add Art 是第三个按钮
        'button',
      ];
      
      let artButton = null;
      for (const selector of selectors) {
        try {
          const buttons = await page.$$(selector);
          for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text && (text.toLowerCase().includes('art') || text.toLowerCase().includes('add art'))) {
              artButton = btn;
              console.log(`✅ 找到按钮: "${text}"`);
              break;
            }
          }
          if (artButton) break;
        } catch (e) {
          // 继续尝试
        }
      }
      
      if (artButton) {
        await artButton.click();
        console.log('✅ 已点击 Add Art 按钮');
        await delay(5000); // 等待面板加载
        
        // 尝试点击分类卡片
        try {
          const categoryCards = await page.$$('[class*="category"], [class*="card"], button');
          if (categoryCards.length > 0) {
            console.log(`找到 ${categoryCards.length} 个可能的分类卡片，点击第一个...`);
            await categoryCards[0].click();
            await delay(3000);
          }
        } catch (e) {
          console.warn('无法点击分类卡片:', e.message);
        }
      } else {
        console.warn('⚠️  无法找到 Add Art 按钮，尝试直接查找艺术素材面板');
      }
    } catch (error) {
      console.warn('⚠️  无法找到 Add Art 按钮，尝试直接查找艺术素材面板:', error.message);
    }

    // 等待页面稳定和网络请求完成
    await delay(5000);
    
    console.log(`📡 捕获到 ${artAssetUrls.size} 个艺术素材 URL`);

    // 将捕获的 URL 传递给页面上下文
    await page.evaluate((urls) => {
      window.artAssetUrls = new Set(urls);
    }, Array.from(artAssetUrls));

    // 先截图保存当前页面状态，用于调试
    try {
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'page-screenshot.png'), fullPage: true });
      console.log('📸 已保存页面截图到: page-screenshot.png');
    } catch (e) {
      console.warn('⚠️  无法保存截图:', e.message);
    }

    // 提取艺术素材分类和素材列表
    const artData = await page.evaluate(() => {
      const categories = [];
      const assets = {};

      // 首先尝试查找分类网格 - 使用更广泛的选择器
      const categorySelectors = [
        '[class*="category"]',
        '[class*="Category"]',
        '[class*="art-panel"] [class*="category"]',
        '[class*="grid"] [class*="card"]',
        '[class*="grid"] button',
        'button[class*="category"]',
        '[role="button"][class*="category"]',
        '[data-testid*="category"]',
        '[class*="art"] [class*="grid"] > *',
      ];
      
      let categoryCards = [];
      for (const selector of categorySelectors) {
        try {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length > 2) { // 至少找到 3 个才认为是分类卡片
            categoryCards = found;
            console.log(`找到 ${found.length} 个可能的分类卡片 (选择器: ${selector})`);
            break;
          }
        } catch (e) {
          // 继续尝试
        }
      }
      
      // 提取分类信息
      categoryCards.forEach((card, index) => {
        const categoryName = card.textContent?.trim() || 
                            card.getAttribute('aria-label') || 
                            card.getAttribute('title') ||
                            card.querySelector('span, div, p')?.textContent?.trim() ||
                            `Category ${index + 1}`;
        const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        if (categoryName && categoryName.length > 1 && categoryName.length < 50 && !categoryName.match(/^\d+$/)) {
          // 避免重复
          if (!categories.find(c => c.slug === categorySlug)) {
            categories.push({
              name: categoryName,
              slug: categorySlug
            });
            assets[categorySlug] = [];
          }
        }
      });

      // 如果找不到分类卡片，使用默认分类
      if (categories.length === 0) {
        const defaultCategories = [
          'Emojis', 'Shapes & Symbols', 'Sports & Games', 'Letters & Numbers',
          'Animals', 'Mascots', 'Nature', 'America', 'Food & Drink',
          'Travel', 'Objects', 'Clothing', 'Activities'
        ];
        
        defaultCategories.forEach(cat => {
          const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          categories.push({ name: cat, slug });
          assets[slug] = [];
        });
      }

      // 查找素材图片 - 尝试多种选择器，包括所有图片
      const imageSelectors = [
        'img[src*="art"]',
        'img[src*="artwork"]',
        'img[src*="asset"]',
        '[class*="art-panel"] img',
        '[class*="asset"] img',
        '[class*="grid"] img',
        '[class*="art"] img',
        'img', // 最后尝试所有图片
      ];
      
      let images = [];
      for (const selector of imageSelectors) {
        try {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length > 0) {
            images = found;
            console.log(`找到 ${found.length} 个图片 (选择器: ${selector})`);
            break;
          }
        } catch (e) {
          // 继续尝试
        }
      }
      
      images.forEach((img, index) => {
        const src = img.getAttribute('src') || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') ||
                   img.getAttribute('data-original');
        const alt = img.getAttribute('alt') || 
                   img.getAttribute('title') || 
                   img.getAttribute('data-name') ||
                   `art-${index + 1}`;
        
        if (src && !src.includes('data:image') && !src.includes('placeholder')) {
          // 跳过 base64 和占位符图片
          // 尝试从 URL 或父元素推断分类
          let categorySlug = 'other';
          const parent = img.closest('[class*="category"], [class*="card"], button, [class*="item"], [class*="grid"] > *');
          const parentText = parent ? parent.textContent?.trim() : '';
          
          // 从 URL 路径推断分类
          const urlPath = src.toLowerCase();
          for (const cat of categories) {
            if (urlPath.includes(cat.slug) || 
                alt.toLowerCase().includes(cat.slug) ||
                parentText.toLowerCase().includes(cat.name.toLowerCase()) ||
                urlPath.includes(cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
              categorySlug = cat.slug;
              break;
            }
          }
          
          if (!assets[categorySlug]) {
            assets[categorySlug] = [];
          }
          
          // 构建完整 URL
          let fullUrl = src;
          if (src.startsWith('//')) {
            fullUrl = `https:${src}`;
          } else if (src.startsWith('/')) {
            fullUrl = `https://www.customink.com${src}`;
          } else if (!src.startsWith('http')) {
            fullUrl = `https://www.customink.com/${src}`;
          }
          
          // 避免重复
          const exists = assets[categorySlug].some(a => a.url === fullUrl);
          if (!exists) {
            assets[categorySlug].push({
              name: alt,
              url: fullUrl,
              thumbnailUrl: fullUrl
            });
          }
        }
      });
      
      // 添加从网络请求捕获的 URL
      if (window.artAssetUrls && window.artAssetUrls.size > 0) {
        window.artAssetUrls.forEach((url) => {
          // 过滤掉非艺术素材的 URL
          const urlLower = url.toLowerCase();
          const skipPatterns = [
            'clickagy.com', 'bing.com', 'adnxs.com', 'cookielaw.org',
            'pixel.gif', 'tracking', 'analytics', 'beacon',
            'mms-images-prod.imgix.net', // 产品图片
            'logo', 'icon', 'button',
          ];
          
          if (skipPatterns.some(pattern => urlLower.includes(pattern))) {
            return; // 跳过
          }
          
          // 只保留艺术素材 URL
          const artPatterns = [
            'art', 'artwork', 'asset', 'design', 'graphic',
            '/ndx/assets', 'pigment-cdn', '/art/',
          ];
          
          if (!artPatterns.some(pattern => urlLower.includes(pattern))) {
            return; // 跳过非艺术素材
          }
          
          let categorySlug = 'other';
          
          // 尝试从 URL 路径提取分类
          const urlParts = url.split('/');
          for (let i = 0; i < urlParts.length; i++) {
            const part = urlParts[i].toLowerCase();
            for (const cat of categories) {
              if (part === cat.slug || part.includes(cat.slug) || cat.slug.includes(part)) {
                categorySlug = cat.slug;
                break;
              }
            }
            if (categorySlug !== 'other') break;
          }
          
          // 如果还是 other，尝试从文件名推断
          if (categorySlug === 'other') {
            const fileName = url.split('/').pop() || '';
            for (const cat of categories) {
              if (fileName.toLowerCase().includes(cat.slug)) {
                categorySlug = cat.slug;
                break;
              }
            }
          }
          
          if (!assets[categorySlug]) {
            assets[categorySlug] = [];
          }
          
          const fileName = url.split('/').pop() || 'art-asset';
          const name = fileName.split('?')[0].replace(/\.(png|jpg|jpeg|svg|webp)$/i, '') || 'art-asset';
          
          // 避免重复
          const exists = assets[categorySlug].some(a => a.url === url);
          if (!exists) {
            assets[categorySlug].push({
              name: name,
              url: url,
              thumbnailUrl: url
            });
          }
        });
      }

      return { categories, assets };
    });

    console.log(`\n✅ 找到 ${artData.categories.length} 个分类`);
    console.log(`   总素材数: ${Object.values(artData.assets).reduce((sum, arr) => sum + arr.length, 0)}\n`);

    // 保存分类和素材数据
    const dataFile = path.join(OUTPUT_DIR, 'art-assets-data.json');
    fs.writeFileSync(dataFile, JSON.stringify(artData, null, 2));
    console.log(`📄 已保存数据到: ${dataFile}\n`);

    // 下载并上传所有素材
    let totalDownloaded = 0;
    let totalUploaded = 0;
    let totalErrors = 0;

    for (const category of artData.categories) {
      const categoryDir = path.join(OUTPUT_DIR, category.slug);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      const categoryAssets = artData.assets[category.slug] || [];
      console.log(`📂 处理分类: ${category.name} (${categoryAssets.length} 个素材)`);

      for (const asset of categoryAssets) {
        try {
          // 获取文件扩展名
          const url = new URL(asset.url);
          const ext = path.extname(url.pathname) || '.png';
          const fileName = `${asset.name.replace(/[^a-z0-9]+/gi, '-')}${ext}`;
          const localPath = path.join(categoryDir, fileName);

          // 下载图片
          if (!fs.existsSync(localPath)) {
            const downloaded = await downloadImage(asset.url, localPath);
            if (downloaded) {
              totalDownloaded++;
              console.log(`  ✅ 下载: ${fileName}`);
            } else {
              totalErrors++;
              continue;
            }
          } else {
            console.log(`  ○ 已存在: ${fileName}`);
          }

          // 上传到 GCS
          const gcsUrl = await uploadToGcs(localPath, category.slug, fileName);
          if (gcsUrl) {
            totalUploaded++;
            console.log(`  ✅ 上传到 GCS: ${gcsUrl}`);
            
            // 更新数据中的 URL
            asset.imageUrl = gcsUrl;
            asset.thumbnailUrl = gcsUrl;
          } else {
            console.warn(`  ⚠️  GCS 上传失败: ${fileName}`);
          }

          await delay(500); // 避免请求过快
        } catch (error) {
          console.error(`  ❌ 处理素材失败 ${asset.name}:`, error.message);
          totalErrors++;
        }
      }

      console.log('');
    }

    // 保存更新后的数据（包含 GCS URL）
    fs.writeFileSync(dataFile, JSON.stringify(artData, null, 2));

    console.log('\n✨ 爬取完成！');
    console.log(`   - 下载: ${totalDownloaded} 个文件`);
    console.log(`   - 上传到 GCS: ${totalUploaded} 个文件`);
    console.log(`   - 错误: ${totalErrors} 个文件`);
    console.log(`\n📦 数据文件: ${dataFile}`);

  } catch (error) {
    console.error('❌ 爬取失败:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行脚本
if (require.main === module) {
  scrapeArtAssets()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { scrapeArtAssets };

