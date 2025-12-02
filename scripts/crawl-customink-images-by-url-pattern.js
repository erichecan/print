/**
 * Custom Ink 产品图片爬虫脚本 - 基于 URL 模式
 * [2025-12-02] 根据分析得出的 URL 模式，生成并下载所有产品图片
 * 
 * URL 模式：
 * https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
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

// [2025-12-02] 从分析结果中提取的产品和颜色信息
const KNOWN_PRODUCTS = [
  {
    productId: '6a62c76ef0978853a20391b6c32da4fe',
    productName: 'Product 1',
    colorIds: [176100]
  },
  {
    productId: '7be22be6c27a7c98161714a10147ad88',
    productName: 'Product 2',
    colorIds: [176100]
  }
];

// 视图和尺寸组合
const VIEWS = ['front', 'back', 'left', 'right'];
const SIZES = ['large_extended', 'medium_extended'];

// 图片域名
const IMAGE_BASE_URL = 'https://mms-images-prod.imgix.net';

/**
 * 生成图片 URL
 */
function generateImageUrl(productId, colorId, view, size, highQuality = true) {
  const path = `/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${view}_${size}.png`;
  const url = `${IMAGE_BASE_URL}${path}`;
  
  // 高质量图片参数
  if (highQuality) {
    return `${url}?w=2000&q=100`;
  }
  
  return url;
}

/**
 * 检查图片是否存在
 */
function checkImageExists(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    const request = client.get(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode === 200);
    });
    
    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * 下载图片
 */
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    // 移除查询参数获取原始图片（如果失败再尝试带参数的）
    const baseUrl = imageUrl.split('?')[0];
    
    const file = fs.createWriteStream(outputPath);
    
    function tryDownload(urlToTry) {
      client.get(urlToTry, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(outputPath);
          });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(outputPath);
          tryDownload(response.headers.location);
        } else {
          file.close();
          fs.unlinkSync(outputPath);
          
          // 如果原始 URL 失败，尝试带高质量参数的
          if (urlToTry === baseUrl && imageUrl.includes('?')) {
            tryDownload(imageUrl);
          } else {
            reject(new Error(`Failed to download: ${response.statusCode}`));
          }
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        // 如果原始 URL 失败，尝试带参数的
        if (urlToTry === baseUrl && imageUrl.includes('?')) {
          tryDownload(imageUrl);
        } else {
          reject(err);
        }
      });
    }
    
    tryDownload(baseUrl);
  });
}

/**
 * 从 Custom Ink Design Lab 提取产品信息
 */
async function extractProductInfoFromDesignLab() {
  console.log('🔍 从 Design Lab 提取产品信息...\n');
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  const products = new Map();
  
  try {
    await page.goto('https://www.customink.com/ndx/#/welcome', { 
      waitUntil: 'commit',
      timeout: 120000 
    });
    
    await page.waitForTimeout(10000);
    
    // 监听网络请求，提取产品 ID 和颜色 ID
    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('mms-images-prod.imgix.net') && url.includes('/catalog/')) {
        // 提取产品 ID 和颜色 ID
        const match = url.match(/\/catalog\/([^/]+)\/colors\/(\d+)/);
        if (match) {
          const productId = match[1];
          const colorId = parseInt(match[2]);
          
          if (!products.has(productId)) {
            products.set(productId, {
              productId: productId,
              colorIds: new Set()
            });
          }
          
          products.get(productId).colorIds.add(colorId);
        }
      }
      
      // 尝试从 API 响应中提取产品信息
      if (url.includes('api') && response.headers()['content-type']?.includes('json')) {
        try {
          const data = await response.json().catch(() => null);
          if (data && data.products) {
            // 处理产品数据
          }
        } catch (e) {
          // 忽略 JSON 解析错误
        }
      }
    });
    
    // 等待更多请求
    await page.waitForTimeout(15000);
    
    // 转换为数组
    const productList = Array.from(products.values()).map(p => ({
      productId: p.productId,
      colorIds: Array.from(p.colorIds)
    }));
    
    console.log(`   ✅ 提取到 ${productList.length} 个产品\n`);
    
    return productList;
    
  } catch (error) {
    console.error('❌ 提取产品信息失败:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * 爬取所有产品图片
 */
async function crawlAllImages() {
  console.log('🚀 开始爬取 Custom Ink 产品图片...\n');
  
  // 1. 从 Design Lab 提取产品信息
  let products = await extractProductInfoFromDesignLab();
  
  // 如果没有提取到，使用已知的产品
  if (products.length === 0) {
    console.log('⚠️  未能从 Design Lab 提取产品信息，使用已知产品列表\n');
    products = KNOWN_PRODUCTS.map(p => ({
      productId: p.productId,
      colorIds: p.colorIds
    }));
  }
  
  console.log(`📋 将爬取 ${products.length} 个产品的图片\n`);
  
  const downloadedImages = [];
  let totalDownloaded = 0;
  let totalFailed = 0;
  
  for (const product of products) {
    const { productId, colorIds } = product;
    const productDir = path.join(IMAGES_DIR, productId);
    
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    
    console.log(`📦 产品: ${productId}`);
    console.log(`   颜色数: ${colorIds.length}\n`);
    
    for (const colorId of colorIds) {
      const colorDir = path.join(productDir, `color-${colorId}`);
      
      if (!fs.existsSync(colorDir)) {
        fs.mkdirSync(colorDir, { recursive: true });
      }
      
      console.log(`   🎨 颜色: ${colorId}`);
      
      for (const view of VIEWS) {
        for (const size of SIZES) {
          const filename = `${view}_${size}.png`;
          const outputPath = path.join(colorDir, filename);
          
          // 如果文件已存在，跳过
          if (fs.existsSync(outputPath)) {
            console.log(`      ⏭️  跳过 (已存在): ${filename}`);
            continue;
          }
          
          // 生成 URL
          const imageUrl = generateImageUrl(productId, colorId, view, size, true);
          
          try {
            // 先检查图片是否存在
            const exists = await checkImageExists(imageUrl);
            
            if (!exists) {
              console.log(`      ❌ 不存在: ${filename}`);
              totalFailed++;
              continue;
            }
            
            // 下载图片
            await downloadImage(imageUrl, outputPath);
            
            downloadedImages.push({
              productId: productId,
              colorId: colorId,
              view: view,
              size: size,
              url: imageUrl,
              path: outputPath
            });
            
            totalDownloaded++;
            console.log(`      ✅ 下载成功: ${filename}`);
            
            // 添加延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            totalFailed++;
            console.error(`      ❌ 下载失败: ${filename} - ${error.message}`);
          }
        }
      }
      
      console.log('');
    }
    
    console.log('');
  }
  
  // 保存清单
  const inventory = {
    timestamp: new Date().toISOString(),
    totalProducts: products.length,
    totalDownloaded: totalDownloaded,
    totalFailed: totalFailed,
    images: downloadedImages
  };
  
  const inventoryPath = path.join(OUTPUT_DIR, 'image-inventory.json');
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
  
  console.log('✅ 爬取完成！');
  console.log(`   - 总产品数: ${products.length}`);
  console.log(`   - 下载成功: ${totalDownloaded} 张`);
  console.log(`   - 下载失败: ${totalFailed} 张`);
  console.log(`   - 图片目录: ${IMAGES_DIR}`);
  console.log(`   - 清单文件: ${inventoryPath}\n`);
}

// 运行爬虫
if (require.main === module) {
  crawlAllImages().catch(console.error);
}

module.exports = { crawlAllImages, generateImageUrl, checkImageExists, downloadImage };

