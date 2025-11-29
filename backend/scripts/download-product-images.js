/**
 * 商品图片下载脚本
 * [2025-01-28 21:40:00] 从 JSON 文件中读取商品数据，下载所有图片到本地
 * 
 * 使用说明：
 * node backend/scripts/download-product-images.js [json-file-path]
 * 如果不提供路径，将从 all-products.json 下载所有商品的图片
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DATA_DIR = path.join(__dirname, '../data/scraped-products');
const ALL_PRODUCTS_FILE = path.join(DATA_DIR, 'all-products.json');
const IMAGES_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

// [2025-01-28 21:40:00] 下载图片到本地
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return reject(new Error(`无效的图片 URL: ${imageUrl}`));
    }
    
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(outputPath);
    
    const request = client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        return downloadImage(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        return reject(new Error(`下载失败: ${response.statusCode} ${imageUrl}`));
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
    
    file.on('error', (err) => {
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
      reject(new Error('下载超时'));
    });
  });
}

// [2025-01-28 21:40:00] 从页面提取图片 URL
async function extractImageUrls(productInfo, page) {
  const images = [];
  
  try {
    // 提取主图
    const mainImageSelectors = [
      '[class*="main-image"] img',
      '[class*="product-image"] img',
      '[data-testid*="main-image"] img',
      '.product-gallery img:first-child',
      'img[alt*="product" i]',
      'img[src*="product" i]'
    ];
    
    for (const selector of mainImageSelectors) {
      try {
        const imgUrl = await page.$eval(selector, el => {
          return el.src || el.getAttribute('srcset')?.split(' ')[0] || null;
        }).catch(() => null);
        
        if (imgUrl && imgUrl.startsWith('http')) {
          images.push({
            url: imgUrl,
            alt: productInfo.name,
            sortOrder: 0,
            type: 'main'
          });
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }
    
    // 提取所有产品图片
    const allImages = await page.$$eval('img[src*="product" i], img[alt*="product" i]', 
      elements => elements.map(el => ({
        src: el.src || el.getAttribute('srcset')?.split(' ')[0],
        alt: el.alt || ''
      }))
    ).catch(() => []);
    
    for (const img of allImages) {
      if (img.src && img.src.startsWith('http') && !images.find(i => i.url === img.src)) {
        images.push({
          url: img.src,
          alt: img.alt || productInfo.name,
          sortOrder: images.length,
          type: 'product'
        });
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  无法提取图片: ${error.message}`);
  }
  
  return images;
}

// [2025-01-28 21:40:00] 下载商品图片
async function downloadProductImages(productData) {
  const product = productData.product;
  const slug = product.slug;
  const productImageDir = path.join(IMAGES_DIR, slug);
  
  // 确保目录存在
  if (!fs.existsSync(productImageDir)) {
    fs.mkdirSync(productImageDir, { recursive: true });
  }
  
  const downloadedImages = [];
  
  // 下载主图
  if (productData.images && productData.images.length > 0) {
    for (let i = 0; i < productData.images.length; i++) {
      const imageData = productData.images[i];
      if (!imageData.url || !imageData.url.startsWith('http')) {
        continue;
      }
      
      try {
        const ext = path.extname(new URL(imageData.url).pathname) || '.jpg';
        const filename = i === 0 ? `main${ext}` : `image-${i}${ext}`;
        const outputPath = path.join(productImageDir, filename);
        
        console.log(`      📥 下载图片 ${i + 1}/${productData.images.length}: ${filename}`);
        await downloadImage(imageData.url, outputPath);
        
        // 更新图片路径为本地路径
        const localPath = `/assets/products/${slug}/${filename}`;
        downloadedImages.push({
          url: localPath,
          alt: imageData.alt || product.name,
          sortOrder: imageData.sortOrder || i
        });
        
        console.log(`      ✅ 已保存: ${localPath}`);
        
      } catch (error) {
        console.log(`      ❌ 下载失败: ${error.message}`);
      }
    }
  }
  
  // 如果没有图片，尝试从变体图片下载
  if (downloadedImages.length === 0 && productData.variants) {
    console.log(`      ⚠️  未找到主图，尝试从变体下载图片...`);
    
    // 收集所有唯一的图片 URL
    const variantImageUrls = new Set();
    for (const variant of productData.variants) {
      if (variant.imageUrl && variant.imageUrl.startsWith('http')) {
        variantImageUrls.add(variant.imageUrl);
      }
    }
    
    let imageIndex = 0;
    for (const imageUrl of Array.from(variantImageUrls).slice(0, 5)) {
      try {
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const filename = imageIndex === 0 ? `main${ext}` : `image-${imageIndex}${ext}`;
        const outputPath = path.join(productImageDir, filename);
        
        console.log(`      📥 下载变体图片 ${imageIndex + 1}: ${filename}`);
        await downloadImage(imageUrl, outputPath);
        
        const localPath = `/assets/products/${slug}/${filename}`;
        downloadedImages.push({
          url: localPath,
          alt: product.name,
          sortOrder: imageIndex
        });
        
        imageIndex++;
        
      } catch (error) {
        console.log(`      ❌ 下载失败: ${error.message}`);
      }
    }
  }
  
  return downloadedImages;
}

// [2025-01-28 21:40:00] 主函数
async function main() {
  console.log('🖼️  开始下载商品图片...\n');
  
  // 确保图片目录存在
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  
  // 读取 JSON 文件
  const jsonPath = process.argv[2] || ALL_PRODUCTS_FILE;
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON 文件不存在: ${jsonPath}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  let productsData;
  
  try {
    const parsed = JSON.parse(fileContent);
    productsData = Array.isArray(parsed) ? parsed : [parsed];
  } catch (parseError) {
    console.error(`❌ JSON 解析失败: ${parseError.message}`);
    process.exit(1);
  }
  
  console.log(`📋 将处理 ${productsData.length} 个商品的图片\n`);
  
  let totalDownloaded = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < productsData.length; i++) {
    const productData = productsData[i];
    const product = productData.product;
    
    console.log(`\n📦 [${i + 1}/${productsData.length}] ${product.name}`);
    console.log(`   Slug: ${product.slug}`);
    
    try {
      const downloadedImages = await downloadProductImages(productData);
      
      if (downloadedImages.length > 0) {
        // 更新 JSON 中的图片路径
        productData.images = downloadedImages;
        
        // 更新变体图片路径
        if (productData.variants && downloadedImages.length > 0) {
          const mainImageUrl = downloadedImages[0].url;
          for (const variant of productData.variants) {
            if (!variant.imageUrl || variant.imageUrl.startsWith('http')) {
              variant.imageUrl = mainImageUrl; // 使用主图作为变体图片
            }
          }
        }
        
        // 保存更新后的 JSON
        const slug = product.slug;
        const jsonFilePath = path.join(DATA_DIR, `${slug}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(productData, null, 2));
        
        totalDownloaded += downloadedImages.length;
        console.log(`   ✅ 下载完成: ${downloadedImages.length} 张图片`);
      } else {
        console.log(`   ⚠️  未找到可下载的图片`);
        totalFailed++;
      }
      
    } catch (error) {
      console.error(`   ❌ 处理失败: ${error.message}`);
      totalFailed++;
    }
  }
  
  // 更新汇总 JSON
  const allProductsPath = path.join(DATA_DIR, 'all-products.json');
  fs.writeFileSync(allProductsPath, JSON.stringify(productsData, null, 2));
  console.log(`\n✅ 汇总 JSON 已更新: ${allProductsPath}`);
  
  console.log(`\n✨ 完成！`);
  console.log(`   - 成功下载: ${totalDownloaded} 张图片`);
  console.log(`   - 失败: ${totalFailed} 个商品`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { downloadImage, downloadProductImages };

