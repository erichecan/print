/**
 * Custom Ink 产品列表提取脚本
* 提取 Custom Ink 的所有产品列表，包括产品 ID、名称、可用颜色和视图类型
 * 
 * 用途：
 * 1. 从 Custom Ink 产品目录页面提取所有产品
 * 2. 对每个产品，提取可用颜色和视图信息
 * 3. 为后续图片爬取做准备
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 提取 Custom Ink 产品列表
 */
async function extractProductList() {
  console.log('🚀 开始提取 Custom Ink 产品列表...\n');
  
  // Custom Ink 产品目录 URL
  const productsUrl = process.env.CUSTOMINK_PRODUCTS_URL || 'https://www.customink.com/products';
  
  console.log(`📍 目标 URL: ${productsUrl}\n`);
  
  const browser = await playwright.chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  const products = [];
  
  try {
    console.log('📄 正在加载产品目录页面...');
    await page.goto(productsUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    console.log('🔍 开始提取产品信息...\n');
    
    // 查找产品链接
    const productSelectors = [
      'a[href*="/products/"]',
      'a[href*="/designs/"]',
      '[class*="product"] a',
      '[class*="product-card"]',
      '[class*="product-item"]'
    ];
    
    const productLinks = [];
    for (const selector of productSelectors) {
      try {
        const links = await page.$$(selector);
        for (const link of links) {
          const href = await link.getAttribute('href').catch(() => null);
          const text = await link.textContent().catch(() => null);
          
          if (href && (href.includes('/products/') || href.includes('/designs/'))) {
            const fullUrl = href.startsWith('http') ? href : `https://www.customink.com${href}`;
            if (!productLinks.find(p => p.url === fullUrl)) {
              productLinks.push({
                url: fullUrl,
                text: text?.trim(),
                selector: selector
              });
            }
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    console.log(`   找到 ${productLinks.length} 个产品链接\n`);
    
    // 提取每个产品的基本信息
    for (let i = 0; i < Math.min(productLinks.length, 10); i++) { // 限制前10个用于测试
      const link = productLinks[i];
      console.log(`📦 处理产品 ${i + 1}/${Math.min(productLinks.length, 10)}: ${link.text || link.url}`);
      
      try {
        await page.goto(link.url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        // 提取产品名称
        const nameSelectors = ['h1', '[class*="product-title"]', '[class*="product-name"]', 'title'];
        let productName = link.text || 'Unknown';
        for (const selector of nameSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              productName = await element.textContent().catch(() => null);
              if (productName && productName.trim()) break;
            }
          } catch (e) {
            // 继续下一个选择器
          }
        }
        
        // 提取颜色信息
        const colorSelectors = [
          '[class*="color"]',
          '[class*="swatch"]',
          '[data-color]',
          'button[aria-label*="color" i]'
        ];
        
        const colors = [];
        for (const selector of colorSelectors) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const colorName = await element.getAttribute('aria-label').catch(() => null) ||
                               await element.getAttribute('title').catch(() => null) ||
                               await element.textContent().catch(() => null);
              const colorHex = await element.getAttribute('data-color').catch(() => null) ||
                              await element.evaluate(el => window.getComputedStyle(el).backgroundColor).catch(() => null);
              
              if (colorName && colorName.trim() && !colors.find(c => c.name === colorName.trim())) {
                colors.push({
                  name: colorName.trim(),
                  hex: colorHex
                });
              }
            }
          } catch (e) {
            // 继续
          }
        }
        
        // 生成产品 slug
        const slug = link.url.split('/').filter(p => p).pop() || 'unknown';
        
        products.push({
          id: slug,
          slug: slug,
          name: productName.trim(),
          url: link.url,
          colors: colors.slice(0, 20), // 限制颜色数量
          extractedAt: new Date().toISOString()
        });
        
        console.log(`   ✅ 提取完成: ${productName.trim()} (${colors.length} 种颜色)\n`);
        
      } catch (error) {
        console.error(`   ❌ 提取失败: ${error.message}\n`);
      }
    }
    
    // 保存结果
    const result = {
      timestamp: new Date().toISOString(),
      sourceUrl: productsUrl,
      totalProducts: productLinks.length,
      extractedProducts: products.length,
      products: products
    };
    
    const resultPath = path.join(OUTPUT_DIR, 'product-list.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    
    console.log('✅ 产品列表提取完成！');
    console.log(`   - 总产品链接: ${productLinks.length}`);
    console.log(`   - 已提取产品: ${products.length}`);
    console.log(`   - 结果保存到: ${resultPath}\n`);
    
  } catch (error) {
    console.error('❌ 提取过程中出错:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// 运行提取
if (require.main === module) {
  extractProductList().catch(console.error);
}

module.exports = { extractProductList };

