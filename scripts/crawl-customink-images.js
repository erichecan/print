/**
 * Custom Ink 产品图片爬虫脚本
 * [2025-12-02] 爬取 Custom Ink 所有产品的所有颜色和视图组合的图片
 * 
 * 功能：
 * 1. 从产品列表获取所有产品
 * 2. 对每个产品，遍历所有颜色
 * 3. 对每个颜色，遍历所有视图（front/back/left/right 等）
 * 4. 下载所有图片并保存到本地目录结构
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// 输出目录
const IMAGES_DIR = path.join(__dirname, '../customink-images/products');
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');

// 确保目录存在
[IMAGES_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 下载图片
 */
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(imageUrl);
    const client = url.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(outputPath);
    
    client.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        file.close();
        fs.unlinkSync(outputPath);
        downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

/**
 * 从产品页面提取图片 URL
 */
async function extractProductImages(page, productUrl, colorName = null, view = 'front') {
  try {
    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // 如果指定了颜色，尝试切换颜色
    if (colorName) {
      // 查找颜色选择器并点击
      const colorSelectors = [
        `button[aria-label*="${colorName}" i]`,
        `[data-color*="${colorName}" i]`,
        `[class*="color"][title*="${colorName}" i]`
      ];
      
      for (const selector of colorSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(1000); // 等待图片加载
            break;
          }
        } catch (e) {
          // 继续下一个选择器
        }
      }
    }
    
    // 如果指定了视图，尝试切换视图
    if (view !== 'front') {
      const viewSelectors = [
        `button[aria-label*="${view}" i]`,
        `button:has-text("${view}")`
      ];
      
      for (const selector of viewSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(1000); // 等待图片加载
            break;
          }
        } catch (e) {
          // 继续下一个选择器
        }
      }
    }
    
    // 查找产品预览图片
    const imageSelectors = [
      'img[src*="product"]',
      'img[src*="variant"]',
      'img[src*="front"]',
      'img[src*="back"]',
      '[class*="product-image"] img',
      '[class*="product-preview"] img',
      'canvas'
    ];
    
    const images = [];
    for (const selector of imageSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const src = await element.getAttribute('src').catch(() => null);
          if (src && (src.includes('product') || src.includes('variant') || src.includes('customink'))) {
            const fullUrl = src.startsWith('http') ? src : `https://www.customink.com${src}`;
            if (!images.find(img => img.url === fullUrl)) {
              images.push({
                url: fullUrl,
                selector: selector,
                alt: await element.getAttribute('alt').catch(() => null)
              });
            }
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    return images;
  } catch (error) {
    console.error(`   ❌ 提取图片失败: ${error.message}`);
    return [];
  }
}

/**
 * 爬取单个产品的所有图片
 */
async function crawlProductImages(page, product) {
  const { id, slug, name, url, colors = [] } = product;
  const productDir = path.join(IMAGES_DIR, slug);
  
  if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir, { recursive: true });
  }
  
  console.log(`📦 爬取产品: ${name} (${slug})`);
  
  const downloadedImages = [];
  const views = ['front', 'back', 'left', 'right'];
  
  // 如果有颜色信息，遍历所有颜色
  if (colors.length > 0) {
    for (const color of colors) {
      const colorName = color.name || color;
      const colorDir = path.join(productDir, colorName.toLowerCase().replace(/\s+/g, '-'));
      
      if (!fs.existsSync(colorDir)) {
        fs.mkdirSync(colorDir, { recursive: true });
      }
      
      console.log(`   🎨 颜色: ${colorName}`);
      
      // 遍历所有视图
      for (const view of views) {
        try {
          const images = await extractProductImages(page, url, colorName, view);
          
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const filename = `${view}${i > 0 ? `-${i}` : ''}.png`;
            const outputPath = path.join(colorDir, filename);
            
            try {
              await downloadImage(image.url, outputPath);
              downloadedImages.push({
                product: slug,
                color: colorName,
                view: view,
                url: image.url,
                path: outputPath
              });
              console.log(`      ✅ 下载: ${view} - ${filename}`);
            } catch (error) {
              console.error(`      ❌ 下载失败: ${error.message}`);
            }
            
            // 添加延迟避免请求过快
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.error(`   ❌ 视图 ${view} 提取失败: ${error.message}`);
        }
      }
    }
  } else {
    // 没有颜色信息，只下载默认图片
    console.log(`   ⚠️  未找到颜色信息，尝试下载默认图片`);
    const images = await extractProductImages(page, url);
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const filename = `default-${i + 1}.png`;
      const outputPath = path.join(productDir, filename);
      
      try {
        await downloadImage(image.url, outputPath);
        downloadedImages.push({
          product: slug,
          color: 'default',
          view: 'default',
          url: image.url,
          path: outputPath
        });
        console.log(`   ✅ 下载: ${filename}`);
      } catch (error) {
        console.error(`   ❌ 下载失败: ${error.message}`);
      }
    }
  }
  
  return downloadedImages;
}

/**
 * 主函数：爬取所有产品图片
 */
async function crawlAllImages() {
  console.log('🚀 开始爬取 Custom Ink 产品图片...\n');
  
  // 读取产品列表
  const productListPath = path.join(OUTPUT_DIR, 'product-list.json');
  if (!fs.existsSync(productListPath)) {
    console.error(`❌ 产品列表文件不存在: ${productListPath}`);
    console.error('   请先运行 scripts/extract-customink-product-list.js 提取产品列表');
    process.exit(1);
  }
  
  const productList = JSON.parse(fs.readFileSync(productListPath, 'utf-8'));
  const products = productList.products || [];
  
  if (products.length === 0) {
    console.error('❌ 产品列表为空');
    process.exit(1);
  }
  
  console.log(`📋 找到 ${products.length} 个产品\n`);
  
  const browser = await playwright.chromium.launch({
    headless: false,
    slowMo: 1000 // 减慢操作速度
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  const allDownloadedImages = [];
  
  try {
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n[${i + 1}/${products.length}] 处理产品: ${product.name}\n`);
      
      const images = await crawlProductImages(page, product);
      allDownloadedImages.push(...images);
      
      // 产品之间添加延迟
      await page.waitForTimeout(2000);
    }
    
    // 保存下载清单
    const inventory = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      totalImages: allDownloadedImages.length,
      images: allDownloadedImages
    };
    
    const inventoryPath = path.join(OUTPUT_DIR, 'image-inventory.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    
    console.log('\n✅ 图片爬取完成！');
    console.log(`   - 总产品数: ${products.length}`);
    console.log(`   - 总图片数: ${allDownloadedImages.length}`);
    console.log(`   - 图片目录: ${IMAGES_DIR}`);
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
  crawlAllImages().catch(console.error);
}

module.exports = { crawlAllImages, crawlProductImages, downloadImage };

