#!/usr/bin/env node
/**
 * Custom Ink 产品图片爬取并上传到 GCS
 * [2025-01-31 14:00:00] 从 Custom Ink 爬取所有产品图片并上传到 GCS，确保不会出现 404
 * 
 * 功能：
 * 1. 爬取所有产品的所有颜色和视图组合的图片
 * 2. 上传到 GCS (print-main-product-images)
 * 3. 生成图片 URL 映射文件
 * 
 * 使用：
 * GCP_IMAGE_BUCKET=print-main-product-images \
 * GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images \
 * node scripts/scrape-and-upload-customink-product-images.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const gcsUtils = require('../backend/src/utils/gcsStorage');

// 配置
const PRODUCTS = {
  'gildan-softstyle-tshirt': {
    productId: '6a62c76ef0978853a20391b6c32da4fe',
    productName: 'Gildan Softstyle Jersey T-shirt',
    colors: {
      'White': '176100',
      'Navy': '176101',
      'Maroon': '176102',
      'Black': '176103',
      'Heather Grey': '176104',
      'Heather Dark Grey': '176105',
    }
  }
};

const VIEWS = ['front', 'back', 'sleeve'];
const SIZE = 'large_extended'; // 使用 large_extended 作为主要尺寸

// 本地临时目录
const TEMP_DIR = path.join(__dirname, '../temp-customink-images');
const RESULTS_FILE = path.join(__dirname, '../docs/customink-product-images-gcs.json');

// 确保目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * 下载图片到本地
 */
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return reject(new Error(`无效的图片 URL: ${imageUrl}`));
    }

    // 如果文件已存在，跳过下载
    if (fs.existsSync(outputPath)) {
      console.log(`  ○ 已存在: ${path.basename(outputPath)}`);
      return resolve(outputPath);
    }

    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const file = fs.createWriteStream(outputPath);

    const request = client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.customink.com/',
      },
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`  ✓ 下载成功: ${path.basename(outputPath)}`);
          resolve(outputPath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
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
        reject(new Error(`HTTP ${response.statusCode}: ${imageUrl}`));
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
      reject(new Error(`下载超时: ${imageUrl}`));
    });
  });
}

/**
 * 生成 Custom Ink 图片 URL
 */
function generateCustomInkImageUrl(productId, colorId, view, size = 'large_extended') {
  // sleeve 视图可能不存在，使用 front 作为后备
  const viewToUse = view === 'sleeve' ? 'front' : view;
  return `https://mms-images-prod.imgix.net/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${viewToUse}_${size}.png?w=2000&q=100`;
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 爬取并上传单个产品图片
 */
async function scrapeAndUploadProductImage(productKey, productInfo, colorName, colorId, view) {
  try {
    // 生成图片 URL
    const imageUrl = generateCustomInkImageUrl(productInfo.productId, colorId, view, SIZE);
    
    // 本地临时文件路径
    const colorNameSafe = colorName.toLowerCase().replace(/\s+/g, '-');
    const localFileName = `${productKey}-${colorNameSafe}-${view}-${SIZE}.png`;
    const localPath = path.join(TEMP_DIR, localFileName);
    
    // 下载图片
    console.log(`  📥 下载: ${colorName} - ${view}...`);
    await downloadImage(imageUrl, localPath);
    await delay(300); // 避免请求过快
    
    // 检查文件是否存在且有内容
    if (!fs.existsSync(localPath)) {
      throw new Error(`文件下载后不存在: ${localPath}`);
    }
    
    const stats = fs.statSync(localPath);
    if (stats.size === 0) {
      throw new Error(`文件大小为 0: ${localPath}`);
    }
    
    // 上传到 GCS
    console.log(`  ☁️  上传到 GCS: ${colorName} - ${view}...`);
    const gcsObjectPath = gcsUtils.buildObjectPath('design-lab-products', [
      productKey,
      colorNameSafe,
      `${view}-${SIZE}.png`
    ]);
    
    const gcsUrl = await gcsUtils.uploadFileToGcs(localPath, gcsObjectPath, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable'
    });
    
    // 设置文件为公共可读
    try {
      const bucketName = gcsUtils.getImageBucketName();
      const storage = gcsUtils.getStorageClient();
      const bucket = storage.bucket(bucketName);
      await bucket.file(gcsObjectPath).makePublic();
    } catch (error) {
      console.warn(`    ⚠️  设置公开权限失败（可能已公开）: ${error.message}`);
    }
    
    console.log(`  ✅ 上传成功: ${gcsUrl}`);
    
    return {
      colorName,
      view,
      originalUrl: imageUrl,
      gcsUrl,
      gcsObjectPath,
      localPath,
      fileSize: stats.size,
      status: 'success'
    };
    
  } catch (error) {
    console.error(`  ❌ 失败: ${colorName} - ${view}: ${error.message}`);
    return {
      colorName,
      view,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * 爬取并上传单个产品的所有图片
 */
async function scrapeAndUploadProduct(productKey, productInfo) {
  console.log(`\n📦 处理产品: ${productInfo.productName}`);
  console.log(`   Product ID: ${productInfo.productId}`);
  console.log(`   颜色数量: ${Object.keys(productInfo.colors).length}`);
  
  const results = {
    productKey,
    productId: productInfo.productId,
    productName: productInfo.productName,
    images: []
  };
  
  // 遍历所有颜色和视图
  for (const [colorName, colorId] of Object.entries(productInfo.colors)) {
    for (const view of VIEWS) {
      const result = await scrapeAndUploadProductImage(
        productKey,
        productInfo,
        colorName,
        colorId,
        view
      );
      results.images.push(result);
      
      // 短暂延迟，避免请求过快
      await delay(500);
    }
  }
  
  return results;
}

/**
 * 生成图片 URL 映射
 */
function generateImageUrlMapping(allResults) {
  const mapping = {};
  
  for (const productResult of allResults) {
    for (const imageResult of productResult.images) {
      if (imageResult.status === 'success' && imageResult.gcsUrl) {
        const key = `${productResult.productKey}:${imageResult.colorName}:${imageResult.view}`;
        mapping[key] = {
          gcsUrl: imageResult.gcsUrl,
          colorName: imageResult.colorName,
          view: imageResult.view
        };
      }
    }
  }
  
  return mapping;
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Custom Ink 产品图片爬取并上传到 GCS');
  console.log('='.repeat(60));
  console.log(`时间: ${new Date().toISOString()}`);
  console.log(`临时目录: ${TEMP_DIR}`);
  
  // 检查 GCS 配置
  try {
    const bucketName = gcsUtils.getImageBucketName();
    const baseUrl = gcsUtils.getImageBaseUrl();
    console.log(`GCS Bucket: ${bucketName}`);
    console.log(`GCS Base URL: ${baseUrl}`);
  } catch (error) {
    console.error('❌ GCS 配置错误:', error.message);
    console.error('\n请设置环境变量:');
    console.error('  export GCP_IMAGE_BUCKET=print-main-product-images');
    console.error('  export GCP_IMAGE_BASE_URL=https://storage.googleapis.com/print-main-product-images');
    process.exit(1);
  }
  
  const allResults = [];
  
  try {
    // 爬取并上传所有产品
    for (const [productKey, productInfo] of Object.entries(PRODUCTS)) {
      const result = await scrapeAndUploadProduct(productKey, productInfo);
      allResults.push(result);
    }
    
    // 生成图片 URL 映射
    const imageUrlMapping = generateImageUrlMapping(allResults);
    
    // 保存结果
    const summary = {
      timestamp: new Date().toISOString(),
      bucket: gcsUtils.getImageBucketName(),
      baseUrl: gcsUtils.getImageBaseUrl(),
      totalProducts: allResults.length,
      totalImages: allResults.reduce((sum, r) => sum + r.images.length, 0),
      successCount: allResults.reduce((sum, r) => 
        sum + r.images.filter(img => img.status === 'success').length, 0
      ),
      failedCount: allResults.reduce((sum, r) => 
        sum + r.images.filter(img => img.status === 'failed').length, 0
      ),
      products: allResults,
      imageUrlMapping
    };
    
    // 确保目录存在
    const resultsDir = path.dirname(RESULTS_FILE);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      RESULTS_FILE,
      JSON.stringify(summary, null, 2),
      'utf-8'
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 爬取和上传完成！');
    console.log('='.repeat(60));
    console.log(`总产品数: ${summary.totalProducts}`);
    console.log(`总图片数: ${summary.totalImages}`);
    console.log(`成功: ${summary.successCount}`);
    console.log(`失败: ${summary.failedCount}`);
    console.log(`\n结果已保存到: ${RESULTS_FILE}`);
    console.log(`图片 URL 映射已生成，可以在代码中使用`);
    
  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    process.exit(1);
  } finally {
    // 可选：清理临时文件
    console.log('\n提示：临时文件保存在:', TEMP_DIR);
    console.log('可以手动删除或保留用于调试');
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  scrapeAndUploadProductImage,
  generateCustomInkImageUrl
};


