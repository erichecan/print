/**
 * Custom Ink 产品预览分析脚本
 * [2025-12-02] 使用 Playwright 分析 Custom Ink Design Lab 的产品预览实现方式
 * 
 * 目标：
 * 1. 分析 Canvas 中央产品图片的实现方式（无 logo、高清、支持 front/back/侧面视图）
 * 2. 确定颜色变化机制（是否为预渲染的不同颜色图片）
 * 3. 提取图片 URL 结构模式
 */

/**
 * [2025-12-02 执行 Custom Ink 分析计划] Playwright 导入
 * 优先使用根目录的 playwright，如果没有则使用 apps/web 的 @playwright/test
 */
let playwright;
let chromium;
try {
  // 尝试使用根目录的 playwright
  playwright = require('playwright');
  chromium = playwright.chromium;
} catch (e) {
  try {
    // 尝试使用 apps/web 的 @playwright/test
    const pwTest = require('@playwright/test');
    chromium = pwTest.chromium;
  } catch (e2) {
    console.error('❌ Playwright 未安装！');
    console.error('   请运行以下命令之一：');
    console.error('   1. npm install playwright');
    console.error('   2. cd apps/web && npm install');
    process.exit(1);
  }
}

const fs = require('fs');
const path = require('path');

// 创建输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 分析 Custom Ink Design Lab 的产品预览实现
 */
async function analyzeCustomInkPreview() {
  console.log('🚀 开始分析 Custom Ink 产品预览实现...\n');
  
  // [2025-12-02 执行 Custom Ink 分析计划] 获取 Custom Ink URL
  // 优先使用环境变量或命令行参数，否则使用默认主页
  const customInkUrl = process.env.CUSTOMINK_URL || process.argv[2] || 'https://www.customink.com';
  
  console.log(`📍 目标 URL: ${customInkUrl}\n`);
  
  // 使用已导入的 chromium
  const browser = await chromium.launch({
    headless: true, // 使用无头模式提高性能
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // 监听网络请求
  const networkRequests = [];
  const imageRequests = [];
  
  page.on('request', (request) => {
    const url = request.url();
    const resourceType = request.resourceType();
    
    // 记录图片请求
    if (resourceType === 'image') {
      imageRequests.push({
        url: url,
        resourceType: resourceType,
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    }
    
    // 记录所有请求（用于分析 API 调用）
    networkRequests.push({
      url: url,
      method: request.method(),
      resourceType: resourceType,
      headers: request.headers(),
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('📄 正在加载页面...');
    // [2025-12-02] 使用更宽松的加载策略，Custom Ink 使用复杂的 JavaScript
    await page.goto(customInkUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 120000 
    });
    
    // 等待页面 JavaScript 完全加载
    console.log('⏳ 等待页面 JavaScript 加载完成...');
    await page.waitForTimeout(5000);
    
    // 尝试等待关键元素出现
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.log('   ⚠️  无法找到 body 元素，继续分析...');
    }
    
    console.log('🔍 开始分析页面结构...\n');
    
    // 1. 查找产品预览图片元素
    console.log('1️⃣ 查找产品预览图片元素...');
    const productImageSelectors = [
      'img[src*="product"]',
      'img[src*="variant"]',
      'img[src*="front"]',
      'img[src*="back"]',
      '[class*="product-image"]',
      '[class*="product-preview"]',
      '[class*="canvas"] img',
      'canvas',
      '[id*="product-image"]',
      '[id*="preview"]'
    ];
    
    const foundImages = [];
    for (const selector of productImageSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const src = await element.getAttribute('src').catch(() => null);
          const alt = await element.getAttribute('alt').catch(() => null);
          const className = await element.getAttribute('class').catch(() => null);
          const id = await element.getAttribute('id').catch(() => null);
          
          if (src || className || id) {
            foundImages.push({
              selector: selector,
              src: src,
              alt: alt,
              className: className,
              id: id,
              tagName: await element.evaluate(el => el.tagName).catch(() => null)
            });
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    console.log(`   找到 ${foundImages.length} 个可能的图片元素\n`);
    
    // 2. 分析 Canvas 元素
    console.log('2️⃣ 分析 Canvas 元素...');
    const canvasElements = await page.$$('canvas');
    console.log(`   找到 ${canvasElements.length} 个 Canvas 元素\n`);
    
    // 3. 查找颜色选择器
    console.log('3️⃣ 查找颜色选择器...');
    const colorSelectors = [
      '[class*="color"]',
      '[class*="swatch"]',
      '[class*="variant"]',
      '[data-color]',
      '[aria-label*="color" i]',
      'button[class*="color"]'
    ];
    
    const colorElements = [];
    for (const selector of colorSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const className = await element.getAttribute('class').catch(() => null);
          const dataColor = await element.getAttribute('data-color').catch(() => null);
          const style = await element.getAttribute('style').catch(() => null);
          const text = await element.textContent().catch(() => null);
          
          if (className || dataColor || style || text) {
            colorElements.push({
              selector: selector,
              className: className,
              dataColor: dataColor,
              style: style,
              text: text?.trim().substring(0, 50)
            });
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    console.log(`   找到 ${colorElements.length} 个可能的颜色选择器元素\n`);
    
    // 4. 查找视图切换按钮（Front/Back/Side）
    console.log('4️⃣ 查找视图切换按钮...');
    const viewSelectors = [
      'button[aria-label*="front" i]',
      'button[aria-label*="back" i]',
      'button[aria-label*="side" i]',
      'button[aria-label*="view" i]',
      '[class*="view-switch"]',
      '[class*="view-toggle"]',
      'button:has-text("Front")',
      'button:has-text("Back")',
      'button:has-text("Side")'
    ];
    
    const viewElements = [];
    for (const selector of viewSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.textContent().catch(() => null);
          const ariaLabel = await element.getAttribute('aria-label').catch(() => null);
          const className = await element.getAttribute('class').catch(() => null);
          
          if (text || ariaLabel) {
            viewElements.push({
              selector: selector,
              text: text?.trim(),
              ariaLabel: ariaLabel,
              className: className
            });
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    console.log(`   找到 ${viewElements.length} 个可能的视图切换元素\n`);
    
    // 5. 提取页面 HTML 片段用于进一步分析
    console.log('5️⃣ 提取页面关键区域 HTML...');
    const pageContent = await page.content();
    const htmlSnippet = pageContent.substring(0, 50000); // 前 50KB
    
    // 6. 获取页面截图
    console.log('6️⃣ 保存页面截图...');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'customink-preview-full-page.png'),
      fullPage: true
    });
    
    // 7. 分析结果
    const analysisResult = {
      timestamp: new Date().toISOString(),
      url: customInkUrl,
      analysis: {
        images: foundImages,
        canvasElements: canvasElements.length,
        colorElements: colorElements.slice(0, 20), // 限制数量
        viewElements: viewElements,
        imageRequests: imageRequests.slice(0, 50), // 限制数量
        networkRequests: networkRequests.filter(req => 
          req.url.includes('api') || req.url.includes('image') || req.url.includes('product')
        ).slice(0, 30)
      }
    };
    
    // 保存分析结果
    const resultPath = path.join(OUTPUT_DIR, 'preview-analysis-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(analysisResult, null, 2));
    console.log(`\n✅ 分析结果已保存到: ${resultPath}\n`);
    
    // 打印摘要
    console.log('📊 分析摘要：');
    console.log(`   - 图片元素: ${foundImages.length} 个`);
    console.log(`   - Canvas 元素: ${canvasElements.length} 个`);
    console.log(`   - 颜色选择器: ${colorElements.length} 个`);
    console.log(`   - 视图切换: ${viewElements.length} 个`);
    console.log(`   - 图片请求: ${imageRequests.length} 个`);
    console.log(`   - 相关网络请求: ${analysisResult.analysis.networkRequests.length} 个\n`);
    
    // 如果有图片请求，分析 URL 模式
    if (imageRequests.length > 0) {
      console.log('🔗 图片 URL 模式分析：');
      const uniqueDomains = new Set();
      const urlPatterns = [];
      
      imageRequests.forEach(req => {
        try {
          const url = new URL(req.url);
          uniqueDomains.add(url.hostname);
          
          // 提取 URL 路径模式
          const pathParts = url.pathname.split('/').filter(p => p);
          if (pathParts.length > 0) {
            urlPatterns.push({
              domain: url.hostname,
              pathPattern: pathParts.join('/'),
              fullUrl: req.url
            });
          }
        } catch (e) {
          // 忽略无效 URL
        }
      });
      
      console.log(`   - 图片域名: ${Array.from(uniqueDomains).join(', ')}`);
      console.log(`   - URL 模式示例:`);
      urlPatterns.slice(0, 5).forEach(pattern => {
        console.log(`     * ${pattern.pathPattern}`);
      });
      console.log('');
    }
    
    console.log('✅ 分析完成，正在关闭浏览器...\n');
    
  } catch (error) {
    console.error('❌ 分析过程中出错:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// 运行分析
if (require.main === module) {
  analyzeCustomInkPreview().catch(console.error);
}

module.exports = { analyzeCustomInkPreview };

