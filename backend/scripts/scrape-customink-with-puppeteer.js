/**
 * Custom Ink 商品数据爬虫脚本 - Puppeteer 版本
 * [2025-01-28 21:00:00] 使用 Puppeteer 从 Custom Ink 网站爬取商品数据
 * 
 * 使用说明：
 * 1. 安装 Puppeteer: npm install puppeteer
 * 2. 运行脚本: node backend/scripts/scrape-customink-with-puppeteer.js [product-url]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// 导入共享的配置和函数
const { PRODUCT_URLS, downloadImage, generateSlug } = require('./scrape-customink-products');

const DATA_DIR = path.join(__dirname, '../data/scraped-products');
const IMAGES_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

// [2025-01-28 21:00:00] 从页面提取商品数据
async function scrapeProductData(page, productInfo) {
  console.log(`   📄 等待页面加载...`);
  
  // 等待页面基本加载完成
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 尝试多个选择器来查找商品名称
  let productName = productInfo.name;
  try {
    // 等待页面标题或其他标识元素
    await page.waitForSelector('body', { timeout: 30000 });
    
    // 尝试多个选择器
    const selectors = [
      'h1',
      '[class*="product-title"]',
      '[class*="product-name"]',
      '[data-testid*="product-title"]',
      '.product-details h1',
      'title'
    ];
    
    for (const selector of selectors) {
      try {
        productName = await page.$eval(selector, el => el.textContent?.trim() || el.innerText?.trim()).catch(() => null);
        if (productName && productName.length > 0) break;
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }
    
    // 如果还是没找到，尝试从页面标题提取
    if (!productName || productName.length < 5) {
      productName = await page.title().catch(() => productInfo.name);
    }
    
    // 清理商品名称：去除 "Custom", "Design ... at CustomInk.com" 等后缀
    if (productName) {
      productName = productName
        .replace(/^Custom\s+/i, '')
        .replace(/\s*-\s*Design.*at CustomInk.*/i, '')
        .replace(/\s*Online at CustomInk.*/i, '')
        .trim();
      
      // 如果清理后还是太长，尝试提取主要部分
      if (productName.length > 60) {
        const match = productName.match(/^([^-]+(?:T-shirt|Hoodie|Sweatshirt|Bag)[^,]*)/i);
        if (match) {
          productName = match[1].trim();
        }
      }
    }
    
    // 额外等待，让动态内容加载
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.log(`   ⚠️  页面加载警告: ${error.message}`);
    // 即使超时也继续执行
  }
  
  console.log(`   ✅ 商品名称: ${productName}`);
  
  // 提取面包屑导航获取类目信息
  let categoryParent = productInfo.expectedCategory.parent;
  let categoryChild = productInfo.expectedCategory.child;
  
  try {
    const breadcrumbs = await page.$$eval('nav[aria-label*="breadcrumb"] a, nav ol li a', 
      elements => elements.map(el => el.textContent.trim())
    );
    
    if (breadcrumbs.length > 0) {
      // 面包屑格式: All Product > T-shirt > Short Sleeve T-shirt > [产品名称]
      const breadcrumbText = breadcrumbs.map(b => b.toLowerCase()).join(' ');
      
      // 提取一级和二级类目
      if (breadcrumbText.includes('t-shirt') || breadcrumbText.includes('t- hirt')) {
        categoryParent = 't-shirts';
        if (breadcrumbText.includes('short sleeve')) {
          categoryChild = 'short-sleeve-t-shirts';
        } else if (breadcrumbText.includes('long sleeve')) {
          categoryChild = 'long-sleeve-t-shirts';
        }
      } else if (breadcrumbText.includes('sweatshirt') || breadcrumbText.includes('sweats')) {
        categoryParent = 'sweatshirts';
        if (breadcrumbText.includes('hoodie')) {
          categoryChild = 'hoodies';
        } else if (breadcrumbText.includes('crewneck')) {
          categoryChild = 'crewneck-sweatshirts';
        }
      } else if (breadcrumbText.includes('bag')) {
        categoryParent = 'bags';
        if (breadcrumbText.includes('tote')) {
          categoryChild = 'tote-bags';
        }
      }
    }
  } catch (error) {
    console.log(`   ⚠️  无法提取面包屑导航: ${error.message}`);
  }
  
  // 提取价格
  let basePriceCents = 0;
  try {
    const priceText = await page.$eval('[class*="price"], [data-testid*="price"], .price', 
      el => el.textContent.trim().replace(/[^0-9.]/g, '')
    ).catch(() => null);
    
    if (priceText) {
      const price = parseFloat(priceText);
      basePriceCents = Math.round(price * 100);
      console.log(`   ✅ 价格: $${price.toFixed(2)} (${basePriceCents} cents)`);
    }
  } catch (error) {
    console.log(`   ⚠️  无法提取价格: ${error.message}`);
  }
  
  // 提取描述
  let description = '';
  let longDescription = '';
  try {
    description = await page.$eval('[class*="description"], [data-testid*="description"]', 
      el => el.textContent.trim()
    ).catch(() => '');
    
    // 尝试提取详细描述
    longDescription = await page.$eval('[class*="long-description"], [class*="details"]', 
      el => el.textContent.trim()
    ).catch(() => description);
    
    if (description) {
      console.log(`   ✅ 描述: ${description.substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`   ⚠️  无法提取描述: ${error.message}`);
  }
  
  // 提取颜色列表
  const colors = [];
  try {
    // 查找颜色选择器
    const colorElements = await page.$$('[class*="color"], [data-testid*="color"], button[aria-label*="color"]');
    
    for (const el of colorElements.slice(0, 20)) { // 限制最多20个颜色
      try {
        const colorName = await el.evaluate(e => {
          return e.getAttribute('aria-label') || 
                 e.getAttribute('title') || 
                 e.textContent.trim() ||
                 e.getAttribute('data-color');
        });
        
        const colorHex = await el.evaluate(e => {
          const bgColor = window.getComputedStyle(e).backgroundColor;
          // 转换 rgb 到 hex
          const rgb = bgColor.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            return '#' + rgb.map(x => {
              const hex = parseInt(x).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('');
          }
          return e.getAttribute('data-hex') || null;
        });
        
        // 过滤无效的颜色名称
        const invalidColors = ['printing', 'select', 'choose', 'color', 'size'];
        const cleanedColorName = colorName.replace(/color|select|choose|size/gi, '').trim();
        
        if (cleanedColorName && 
            cleanedColorName.length > 0 && 
            cleanedColorName.length < 50 &&
            !invalidColors.includes(cleanedColorName.toLowerCase())) {
          colors.push({
            name: cleanedColorName || colorName,
            hex: colorHex || null
          });
        }
      } catch (e) {
        // 忽略单个颜色元素的错误
      }
    }
    
    // 去重
    const uniqueColors = Array.from(new Map(colors.map(c => [c.name.toLowerCase(), c])).values());
    console.log(`   ✅ 找到 ${uniqueColors.length} 个颜色`);
  } catch (error) {
    console.log(`   ⚠️  无法提取颜色: ${error.message}`);
  }
  
  // 提取尺寸列表
  const sizes = [];
  try {
    const sizeElements = await page.$$('[class*="size"], [data-testid*="size"], button[aria-label*="size"]');
    
    for (const el of sizeElements.slice(0, 20)) {
      try {
        const sizeName = await el.evaluate(e => {
          return e.textContent.trim() || 
                 e.getAttribute('aria-label') || 
                 e.getAttribute('data-size');
        });
        
        if (sizeName && /^(XS|S|M|L|XL|XXL|2X|3X|4X|5X|ONE|One Size)$/i.test(sizeName.trim())) {
          sizes.push(sizeName.trim().toUpperCase());
        }
      } catch (e) {
        // 忽略单个尺寸元素的错误
      }
    }
    
    // 去重并排序
    const uniqueSizes = Array.from(new Set(sizes));
    console.log(`   ✅ 找到 ${uniqueSizes.length} 个尺寸`);
  } catch (error) {
    console.log(`   ⚠️  无法提取尺寸: ${error.message}`);
  }
  
  // 提取图片
  const images = [];
  try {
    // 等待图片加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 提取所有产品相关的图片
    const imageElements = await page.$$eval('img', elements => {
      return elements.map(img => ({
        src: img.src || img.getAttribute('srcset')?.split(' ')[0] || img.getAttribute('data-src'),
        alt: img.alt || '',
        className: img.className || ''
      })).filter(img => 
        img.src && 
        img.src.startsWith('http') &&
        !img.src.includes('logo') &&
        !img.src.includes('icon') &&
        !img.src.includes('avatar') &&
        (img.src.includes('product') || img.src.includes('customink') || img.className.includes('product'))
      );
    }).catch(() => []);
    
    // 提取主图（通常是第一个产品图片）
    if (imageElements.length > 0) {
      const mainImage = imageElements[0];
      images.push({
        url: mainImage.src,
        alt: mainImage.alt || productName,
        sortOrder: 0
      });
      console.log(`   ✅ 找到主图: ${mainImage.src.substring(0, 50)}...`);
    }
    
    // 提取其他产品图片（最多 5 张）
    for (let i = 1; i < Math.min(5, imageElements.length); i++) {
      const img = imageElements[i];
      if (img.src && !images.find(existing => existing.url === img.src)) {
        images.push({
          url: img.src,
          alt: img.alt || productName,
          sortOrder: i
        });
      }
    }
    
    console.log(`   ✅ 找到 ${images.length} 张图片`);
  } catch (error) {
    console.log(`   ⚠️  无法提取图片: ${error.message}`);
  }
  
  // 生成 SKU 前缀
  const skuPrefix = productName
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 3)
    .map(w => w.substring(0, 3).toUpperCase())
    .join('-') || 'PROD';
  
  // 构建商品数据
  const productData = {
    sourceUrl: productInfo.url,
    scrapedAt: new Date().toISOString(),
    product: {
      name: productName || productInfo.name,
      slug: generateSlug(productInfo.url),
      description: description || '',
      longDescription: longDescription || description || '',
      basePriceCents: basePriceCents || 0,
      skuPrefix: skuPrefix,
      categoryParentSlug: categoryParent,
      categoryChildSlug: categoryChild,
      brandSlug: 'gildan',
      weight: null,
      dimensions: null,
      isCustomizable: true
    },
    variants: [],
    images: images
  };
  
  // 生成变体（颜色 × 尺寸组合）
  const defaultColors = colors.length > 0 ? colors : [{ name: 'Black', hex: '#000000' }];
  const defaultSizes = sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'];
  
  for (const color of defaultColors) {
    for (const size of defaultSizes) {
      productData.variants.push({
        color: color.name,
        colorHex: color.hex,
        size: size,
        priceAdjustment: 0,
        imageUrl: null, // 将在下载图片时填充
        stockQuantity: 50
      });
    }
  }
  
  return productData;
}

// [2025-01-28 21:00:00] 主函数
async function main() {
  console.log('🚀 开始使用 Puppeteer 爬取 Custom Ink 商品数据...\n');
  
  // 检查 Puppeteer 是否安装
  try {
    require.resolve('puppeteer');
  } catch (e) {
    console.error('❌ Puppeteer 未安装！请运行: npm install puppeteer');
    process.exit(1);
  }
  
  // 确保目录存在
  [DATA_DIR, IMAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // 获取命令行参数
  const targetUrl = process.argv[2];
  const productsToScrape = targetUrl 
    ? PRODUCT_URLS.filter(p => p.url === targetUrl)
    : PRODUCT_URLS; // 默认爬取所有商品
  
  console.log(`📋 将爬取 ${productsToScrape.length} 个商品\n`);
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const allProducts = [];
  
  try {
    for (const productInfo of productsToScrape) {
      console.log(`\n📦 正在爬取: ${productInfo.name}`);
      console.log(`   URL: ${productInfo.url}`);
      
      const page = await browser.newPage();
      
      try {
        // 访问页面 - 使用更宽松的加载策略
        await page.goto(productInfo.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 90000 
        });
        
        // 额外等待，让 JavaScript 执行
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 提取数据
        const productData = await scrapeProductData(page, productInfo);
        
        // 保存 JSON
        const slug = productData.product.slug;
        const jsonPath = path.join(DATA_DIR, `${slug}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(productData, null, 2));
        console.log(`   ✅ JSON 已保存: ${jsonPath}`);
        
        allProducts.push(productData);
        
      } catch (error) {
        console.error(`   ❌ 爬取失败: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  
  // 保存汇总 JSON
  if (allProducts.length > 0) {
    const allProductsPath = path.join(DATA_DIR, 'all-products.json');
    fs.writeFileSync(allProductsPath, JSON.stringify(allProducts, null, 2));
    console.log(`\n✅ 汇总 JSON 已保存: ${allProductsPath}`);
  }
  
  console.log(`\n✨ 完成！共爬取 ${allProducts.length} 个商品`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { scrapeProductData };

