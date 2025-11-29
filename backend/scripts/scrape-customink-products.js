/**
 * Custom Ink 商品数据爬虫脚本
 * [2025-01-28 20:15:00] 从 Custom Ink 网站爬取商品数据并保存为 JSON
 * 
 * 使用说明：
 * node backend/scripts/scrape-customink-products.js [product-url]
 * 如果不提供 URL，将爬取所有定义的商品
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// [2025-01-28 20:15:00] 待爬取的商品 URL 列表
const PRODUCT_URLS = [
  {
    name: 'Gildan Softstyle Jersey T-shirt',
    url: 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-softstyle-jersey-t-shirt/176100?PK=176113&bg=1',
    expectedCategory: { parent: 't-shirts', child: 'short-sleeve-t-shirts' }
  },
  {
    name: 'Gildan Ultra Cotton T-shirt',
    url: 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-ultra-cotton-t-shirt/4600?PK=4662',
    expectedCategory: { parent: 't-shirts', child: 'short-sleeve-t-shirts' }
  },
  {
    name: 'Gildan Hammer T-shirt',
    url: 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-hammer-t-shirt/364900?PK=364902',
    expectedCategory: { parent: 't-shirts', child: 'short-sleeve-t-shirts' }
  },
  {
    name: 'Comfort Colors 100% Cotton T-shirt',
    url: 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/comfort-colors-100-cotton-t-shirt/175800?PK=175801',
    expectedCategory: { parent: 't-shirts', child: 'short-sleeve-t-shirts' }
  },
  {
    name: 'Gildan Womens Softstyle Jersey Blend T-shirt',
    url: 'https://www.customink.com/products/womens/womens-short-sleeve-t-shirts/gildan-womens-softstyle-jersey-blend-t-shirt/1021100?PK=1021101',
    expectedCategory: { parent: 't-shirts', child: 'womens-short-sleeve-t-shirts' }
  },
  {
    name: 'Gildan Youth 100% Cotton T-shirt',
    url: 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-youth-100-cotton-t-shirt/134000?PK=134045',
    expectedCategory: { parent: 't-shirts', child: 'short-sleeve-t-shirts' }
  },
  {
    name: 'Gildan 100% Cotton Long Sleeve T-shirt',
    url: 'https://www.customink.com/products/t-shirts/long-sleeve-t-shirts/gildan-100-cotton-long-sleeve-t-shirt/225900?PK=225905',
    expectedCategory: { parent: 't-shirts', child: 'long-sleeve-t-shirts' }
  },
  {
    name: 'Gildan Midweight 50/50 Pullover Hoodie',
    url: 'https://www.customink.com/products/sweatshirts/hoodies/gildan-midweight-50-50-pullover-hoodie/108200?PK=108205&bg=1',
    expectedCategory: { parent: 'sweatshirts', child: 'hoodies' }
  },
  {
    name: 'Gildan Youth Midweight 50/50 Pullover Hoodie',
    url: 'https://www.customink.com/products/kids/kids-sweats/gildan-youth-midweight-50-50-pullover-hoodie/135300?PK=135301',
    expectedCategory: { parent: 'sweatshirts', child: 'kids-sweats' }
  },
  {
    name: 'Gildan Midweight 50/50 Crewneck Sweatshirt',
    url: 'https://www.customink.com/products/sweatshirts/crewneck-sweatshirts/gildan-midweight-50-50-crewneck-sweatshirt/107200?PK=107202&bg=1',
    expectedCategory: { parent: 'sweatshirts', child: 'crewneck-sweatshirts' }
  },
  {
    name: 'Gildan Youth Midweight 50/50 Crewneck Sweatshirt',
    url: 'https://www.customink.com/products/kids/kids-sweats/gildan-youth-midweight-50-50-crewneck-sweatshirt/135500?PK=135507',
    expectedCategory: { parent: 'sweatshirts', child: 'kids-sweats' }
  },
  {
    name: 'Medium Cotton Canvas Tote Bag',
    url: 'https://www.customink.com/products/bags/tote-bags/medium-cotton-canvas-tote-bag/2435100?PK=2435100&bg=1',
    expectedCategory: { parent: 'bags', child: 'tote-bags' }
  }
];

// 目录路径
const DATA_DIR = path.join(__dirname, '../data/scraped-products');
const IMAGES_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

// [2025-01-28 20:15:00] 确保目录存在
function ensureDirectories() {
  [DATA_DIR, IMAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    }
  });
}

// [2025-01-28 20:15:00] 从 URL 生成 slug
function generateSlug(url) {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(p => p);
  // 找到 products 之后的路径部分
  const productIndex = pathParts.indexOf('products');
  if (productIndex >= 0 && productIndex < pathParts.length - 1) {
    // 获取产品名称部分（通常是最后一个路径段）
    const productPart = pathParts[pathParts.length - 1];
    return productPart.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  return 'unknown-product';
}

// [2025-01-28 20:25:00] 从页面提取商品数据（需要浏览器工具实现）
// 这个函数需要使用 Puppeteer 或浏览器工具来访问页面并提取数据
async function scrapeProductData(productInfo) {
  // TODO: 实现实际的数据提取逻辑
  // 需要使用 Puppeteer 或浏览器工具访问页面
  
  // 占位数据结构
  const productData = {
    sourceUrl: productInfo.url,
    scrapedAt: new Date().toISOString(),
    product: {
      name: productInfo.name,
      slug: generateSlug(productInfo.url),
      description: '',
      longDescription: '',
      basePriceCents: 0,
      skuPrefix: '',
      categoryParentSlug: productInfo.expectedCategory.parent,
      categoryChildSlug: productInfo.expectedCategory.child,
      brandSlug: 'gildan',
      weight: null,
      dimensions: null,
      isCustomizable: true
    },
    variants: [],
    images: []
  };
  
  console.log(`   ⚠️  数据提取功能待实现（需要使用 Puppeteer 或浏览器工具）`);
  console.log(`   💡 提示：请使用浏览器工具访问页面并提取数据，或安装 Puppeteer 实现自动化提取`);
  
  return productData;
}

// [2025-01-28 20:15:00] 下载图片到本地
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(outputPath);
    const request = client.get(imageUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        file.close();
        fs.unlinkSync(outputPath);
        return downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
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
  });
}

// [2025-01-28 20:15:00] 主函数
async function main() {
  console.log('🚀 开始爬取 Custom Ink 商品数据...\n');
  
  ensureDirectories();
  
  // 获取命令行参数
  const targetUrl = process.argv[2];
  const productsToScrape = targetUrl 
    ? PRODUCT_URLS.filter(p => p.url === targetUrl)
    : PRODUCT_URLS;
  
  if (productsToScrape.length === 0) {
    console.error('❌ 未找到匹配的商品 URL');
    process.exit(1);
  }
  
  console.log(`📋 将爬取 ${productsToScrape.length} 个商品\n`);
  
  const allProducts = [];
  
  for (const productInfo of productsToScrape) {
    console.log(`\n📦 正在爬取: ${productInfo.name}`);
    console.log(`   URL: ${productInfo.url}`);
    
    try {
      // [2025-01-28 20:15:00] 提取商品数据
      // 注意：实际的数据提取需要使用 Puppeteer 或浏览器工具
      // 这里提供一个占位结构，实际使用时需要实现 scrapeProductData 函数
      const productData = await scrapeProductData(productInfo);
      
      // 保存单个商品 JSON
      const slug = productData.product.slug;
      const jsonPath = path.join(DATA_DIR, `${slug}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(productData, null, 2));
      console.log(`   ✅ JSON 已保存: ${jsonPath}`);
      
      allProducts.push(productData);
      
    } catch (error) {
      console.error(`   ❌ 爬取失败: ${error.message}`);
      console.error(`   ${error.stack}`);
    }
  }
  
  // 保存汇总 JSON
  const allProductsPath = path.join(DATA_DIR, 'all-products.json');
  fs.writeFileSync(allProductsPath, JSON.stringify(allProducts, null, 2));
  console.log(`\n✅ 汇总 JSON 已保存: ${allProductsPath}`);
  console.log(`\n✨ 完成！共爬取 ${allProducts.length} 个商品`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { PRODUCT_URLS, downloadImage, generateSlug };

