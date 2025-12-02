/**
 * Custom Ink 产品图片完整爬虫脚本
 * [2025-12-02] 基于分析结果，爬取 Custom Ink 所有产品的所有颜色和视图图片
 * 
 * 从分析结果中提取的产品和颜色信息，然后生成所有可能的图片 URL 并下载
 */

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

// [2025-12-02] 从分析结果中提取的已知产品
const KNOWN_PRODUCTS = [
  {
    productId: '6a62c76ef0978853a20391b6c32da4fe',
    productName: 'Gildan Softstyle Jersey T-shirt',
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
  const pathPart = `/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${view}_${size}.png`;
  const url = `${IMAGE_BASE_URL}${pathPart}`;
  
  // 高质量图片参数（可选）
  return url; // 先尝试无参数的原始 URL
}

/**
 * 检查图片是否存在（HEAD 请求）
 */
function checkImageExists(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    const request = client.request(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode === 200);
    });
    
    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
    
    request.end();
  });
}

/**
 * 下载图片
 */
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    // 先尝试无参数的原始 URL
    const baseUrl = imageUrl.split('?')[0];
    
    const file = fs.createWriteStream(outputPath);
    
    function tryDownload(urlToTry) {
      const request = client.get(urlToTry, (response) => {
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
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          tryDownload(response.headers.location);
        } else {
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(new Error(`HTTP ${response.statusCode}`));
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
        reject(new Error('Timeout'));
      });
    }
    
    tryDownload(baseUrl);
  });
}

/**
 * 从分析结果文件加载已知的产品
 */
function loadProductsFromAnalysis() {
  const analysisPath = path.join(OUTPUT_DIR, 'preview-analysis-result.json');
  
  if (!fs.existsSync(analysisPath)) {
    console.log('⚠️  分析结果文件不存在，使用已知产品列表\n');
    return KNOWN_PRODUCTS;
  }
  
  try {
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    const products = new Map();
    
    // 从图片 URL 中提取产品 ID 和颜色 ID
    if (analysis.analysis && analysis.analysis.images) {
      analysis.analysis.images.forEach(img => {
        if (img.src && img.src.includes('mms-images-prod.imgix.net')) {
          const match = img.src.match(/\/catalog\/([^/]+)\/colors\/(\d+)/);
          if (match) {
            const productId = match[1];
            const colorId = parseInt(match[2]);
            
            if (!products.has(productId)) {
              products.set(productId, {
                productId: productId,
                productName: `Product ${productId.substring(0, 8)}`,
                colorIds: new Set()
              });
            }
            
            products.get(productId).colorIds.add(colorId);
          }
        }
      });
    }
    
    // 转换为数组
    const productList = Array.from(products.values()).map(p => ({
      productId: p.productId,
      productName: p.productName,
      colorIds: Array.from(p.colorIds)
    }));
    
    if (productList.length > 0) {
      console.log(`📋 从分析结果加载了 ${productList.length} 个产品\n`);
      return productList;
    }
  } catch (error) {
    console.error('❌ 加载分析结果失败:', error.message);
  }
  
  return KNOWN_PRODUCTS;
}

/**
 * 爬取所有产品图片
 */
async function crawlAllImages() {
  console.log('🚀 开始爬取 Custom Ink 产品图片...\n');
  
  // 加载产品列表
  const products = loadProductsFromAnalysis();
  
  console.log(`📋 将爬取 ${products.length} 个产品的图片\n`);
  
  const downloadedImages = [];
  let totalDownloaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  for (const product of products) {
    const { productId, productName, colorIds } = product;
    const productDir = path.join(IMAGES_DIR, productId);
    
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    
    console.log(`📦 产品: ${productName} (${productId.substring(0, 8)}...)`);
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
            totalSkipped++;
            continue;
          }
          
          // 生成 URL
          const imageUrl = generateImageUrl(productId, colorId, view, size);
          
          try {
            // 下载图片（不预先检查，直接尝试下载）
            await downloadImage(imageUrl, outputPath);
            
            downloadedImages.push({
              productId: productId,
              productName: productName,
              colorId: colorId,
              view: view,
              size: size,
              url: imageUrl,
              path: outputPath
            });
            
            totalDownloaded++;
            console.log(`      ✅ 下载成功: ${filename}`);
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            totalFailed++;
            // 不打印错误，避免输出过多
            // console.error(`      ❌ 下载失败: ${filename} - ${error.message}`);
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
    totalSkipped: totalSkipped,
    images: downloadedImages
  };
  
  const inventoryPath = path.join(OUTPUT_DIR, 'image-inventory.json');
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
  
  console.log('✅ 爬取完成！');
  console.log(`   - 总产品数: ${products.length}`);
  console.log(`   - 下载成功: ${totalDownloaded} 张`);
  console.log(`   - 下载失败: ${totalFailed} 张`);
  console.log(`   - 跳过 (已存在): ${totalSkipped} 张`);
  console.log(`   - 图片目录: ${IMAGES_DIR}`);
  console.log(`   - 清单文件: ${inventoryPath}\n`);
}

// 运行爬虫
if (require.main === module) {
  crawlAllImages().catch(console.error);
}

module.exports = { crawlAllImages, generateImageUrl, downloadImage };

