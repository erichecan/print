/**
 * 下载缺失的商品图片
* 专门为缺失图片的 4 个商品下载图片
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DATA_DIR = path.join(__dirname, '../data/scraped-products');
const IMAGES_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

// 需要下载图片的商品 slug 列表
const MISSING_IMAGES_PRODUCTS = ['135300', '2435100', '107200', '135500'];

// 下载图片到本地
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.customink.com/'
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
        return reject(new Error(`下载失败: ${response.statusCode} ${imageUrl.substring(0, 60)}...`));
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

// 下载单个商品的图片
async function downloadProductImages(productSlug) {
  const jsonPath = path.join(DATA_DIR, `${productSlug}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    console.log(`  ⚠️  JSON 文件不存在: ${jsonPath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const productData = JSON.parse(fileContent);
  
  const product = productData.product;
  const productImageDir = path.join(IMAGES_DIR, productSlug);
  
  // 确保目录存在
  if (!fs.existsSync(productImageDir)) {
    fs.mkdirSync(productImageDir, { recursive: true });
  }
  
  const downloadedImages = [];
  
  // 下载图片
  if (productData.images && productData.images.length > 0) {
    for (let i = 0; i < productData.images.length; i++) {
      const imageData = productData.images[i];
      const imageUrl = imageData.url;
      
      // 如果已经是本地路径，跳过
      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.log(`     ⏭️  图片 ${i + 1} 已经是本地路径或无效，跳过`);
        continue;
      }
      
      try {
        // 获取文件扩展名
        let ext = '.jpg';
        try {
          const urlPath = new URL(imageUrl).pathname;
          const urlExt = path.extname(urlPath).toLowerCase();
          if (urlExt && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(urlExt)) {
            ext = urlExt;
          } else if (imageUrl.includes('.png')) {
            ext = '.png';
          } else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
            ext = '.jpg';
          }
        } catch (e) {
          // 使用默认扩展名
        }
        
        const filename = i === 0 ? `main${ext}` : `image-${i}${ext}`;
        const outputPath = path.join(productImageDir, filename);
        
        // 如果文件已存在，跳过
        if (fs.existsSync(outputPath)) {
          console.log(`     ⏭️  图片 ${i + 1} 已存在: ${filename}`);
          const localPath = `/assets/products/${productSlug}/${filename}`;
          downloadedImages.push({
            url: localPath,
            alt: imageData.alt || product.name,
            sortOrder: imageData.sortOrder || i
          });
          continue;
        }
        
        console.log(`     📥 下载图片 ${i + 1}/${productData.images.length}: ${filename}`);
        await downloadImage(imageUrl, outputPath);
        
        // 更新图片路径为本地路径
        const localPath = `/assets/products/${productSlug}/${filename}`;
        downloadedImages.push({
          url: localPath,
          alt: imageData.alt || product.name,
          sortOrder: imageData.sortOrder || i
        });
        
        console.log(`     ✅ 已保存: ${localPath}`);
        
        // 添加延迟以避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`     ❌ 下载失败: ${error.message}`);
      }
    }
  }
  
  // 更新 JSON 文件中的图片路径
  if (downloadedImages.length > 0) {
    productData.images = downloadedImages;
    fs.writeFileSync(jsonPath, JSON.stringify(productData, null, 2));
    console.log(`     ✅ JSON 文件已更新`);
  }
  
  return downloadedImages;
}

// 主函数
async function main() {
  console.log('🖼️  开始下载缺失的商品图片...\n');
  console.log(`📋 需要处理的商品: ${MISSING_IMAGES_PRODUCTS.join(', ')}\n`);
  
  // 确保图片目录存在
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  
  let totalDownloaded = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < MISSING_IMAGES_PRODUCTS.length; i++) {
    const productSlug = MISSING_IMAGES_PRODUCTS[i];
    
    console.log(`\n📦 [${i + 1}/${MISSING_IMAGES_PRODUCTS.length}] 商品: ${productSlug}`);
    
    try {
      const downloadedImages = await downloadProductImages(productSlug);
      
      if (downloadedImages.length > 0) {
        totalDownloaded += downloadedImages.length;
        console.log(`   ✅ 完成: ${downloadedImages.length} 张图片`);
      } else {
        console.log(`   ⚠️  未下载到图片`);
        totalFailed++;
      }
      
    } catch (error) {
      console.error(`   ❌ 处理失败: ${error.message}`);
      totalFailed++;
    }
  }
  
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

module.exports = { downloadProductImages };

