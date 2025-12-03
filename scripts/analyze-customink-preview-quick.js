/**
 * Custom Ink 产品预览快速分析脚本
 * [2025-12-02] 快速分析 Custom Ink Design Lab 的产品预览实现方式
 * 专门处理 SPA（单页应用）和复杂的 JavaScript 加载
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// 创建输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 快速分析 Custom Ink Design Lab
 */
async function quickAnalyze() {
  console.log('🚀 开始快速分析 Custom Ink Design Lab...\n');
  
  const customInkUrl = process.env.CUSTOMINK_URL || process.argv[2] || 'https://www.customink.com/ndx/#/welcome';
  
  console.log(`📍 目标 URL: ${customInkUrl}\n`);
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // 监听网络请求
  const imageRequests = [];
  const apiRequests = [];
  
  page.on('request', (request) => {
    const url = request.url();
    const resourceType = request.resourceType();
    
    if (resourceType === 'image') {
      imageRequests.push({
        url: url,
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    }
    
    if (url.includes('api') || url.includes('json')) {
      apiRequests.push({
        url: url,
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('📄 正在加载页面（使用宽松策略）...');
    await page.goto(customInkUrl, { 
      waitUntil: 'commit',
      timeout: 120000 
    });
    
    console.log('⏳ 等待页面渲染（10秒）...');
    await page.waitForTimeout(10000);
    
    // 获取页面基本信息
    const title = await page.title();
    const url = page.url();
    
    console.log(`\n📋 页面信息:`);
    console.log(`   - 标题: ${title}`);
    console.log(`   - 最终 URL: ${url}\n`);
    
    // 查找 Canvas 元素
    console.log('🔍 查找 Canvas 元素...');
    const canvasCount = await page.$$eval('canvas', elements => elements.length);
    console.log(`   - Canvas 数量: ${canvasCount}\n`);
    
    // 查找图片元素
    console.log('🔍 查找图片元素...');
    const images = await page.$$eval('img', elements => 
      elements.map(img => ({
        src: img.src,
        alt: img.alt,
        className: img.className
      })).filter(img => img.src && (
        img.src.includes('product') || 
        img.src.includes('variant') || 
        img.src.includes('customink') ||
        img.src.includes('mms-images')
      ))
    );
    
    console.log(`   - 相关图片数量: ${images.length}`);
    if (images.length > 0) {
      console.log(`   - 图片 URL 示例:`);
      images.slice(0, 3).forEach((img, i) => {
        console.log(`     ${i + 1}. ${img.src.substring(0, 100)}...`);
      });
    }
    console.log('');
    
    // 分析图片 URL 模式
    if (images.length > 0) {
      console.log('🔗 分析图片 URL 模式...');
      const urlPatterns = new Set();
      const domains = new Set();
      
      images.forEach(img => {
        try {
          const urlObj = new URL(img.src);
          domains.add(urlObj.hostname);
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          if (pathParts.length > 0) {
            urlPatterns.add(pathParts.join('/'));
          }
        } catch (e) {
          // 忽略无效 URL
        }
      });
      
      console.log(`   - 图片域名: ${Array.from(domains).join(', ')}`);
      console.log(`   - URL 模式数量: ${urlPatterns.size}`);
      if (urlPatterns.size > 0) {
        console.log(`   - URL 模式示例:`);
        Array.from(urlPatterns).slice(0, 5).forEach((pattern, i) => {
          console.log(`     ${i + 1}. .../${pattern}`);
        });
      }
      console.log('');
    }
    
    // 获取页面 HTML 片段
    const bodyHTML = await page.evaluate(() => {
      return document.body.innerHTML.substring(0, 10000);
    });
    
    // 保存分析结果
    const result = {
      timestamp: new Date().toISOString(),
      url: customInkUrl,
      finalUrl: url,
      title: title,
      analysis: {
        canvasCount: canvasCount,
        images: images.slice(0, 50), // 限制数量
        imageRequests: imageRequests.slice(0, 50),
        apiRequests: apiRequests.slice(0, 30),
        urlPatterns: Array.from(new Set(images.map(img => {
          try {
            const urlObj = new URL(img.src);
            return urlObj.pathname;
          } catch (e) {
            return null;
          }
        }).filter(Boolean))).slice(0, 20),
        htmlSnippet: bodyHTML
      }
    };
    
    const resultPath = path.join(OUTPUT_DIR, 'preview-analysis-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    
    console.log('✅ 分析完成！');
    console.log(`   - 结果保存到: ${resultPath}\n`);
    
    // 截图
    try {
      const screenshotPath = path.join(OUTPUT_DIR, 'customink-preview-full-page.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   - 截图保存到: ${screenshotPath}\n`);
    } catch (e) {
      console.log(`   ⚠️  截图失败: ${e.message}\n`);
    }
    
    // 打印关键发现
    console.log('📊 关键发现:');
    console.log(`   - Canvas 元素: ${canvasCount > 0 ? '是（可能使用 Canvas 渲染）' : '否'}`);
    console.log(`   - 图片元素: ${images.length} 个`);
    console.log(`   - 图片请求: ${imageRequests.length} 个`);
    console.log(`   - API 请求: ${apiRequests.length} 个`);
    
    if (images.length > 0) {
      console.log(`\n💡 初步结论:`);
      console.log(`   产品预览可能使用 ${canvasCount > 0 ? 'Canvas 渲染 + ' : ''}预渲染的图片`);
      console.log(`   图片 URL 包含关键词: product, variant, customink, mms-images`);
    }
    
  } catch (error) {
    console.error('❌ 分析过程中出错:', error.message);
    
    // 即使出错也保存部分结果
    const errorResult = {
      timestamp: new Date().toISOString(),
      url: customInkUrl,
      error: error.message,
      stack: error.stack
    };
    
    const errorPath = path.join(OUTPUT_DIR, 'preview-analysis-error.json');
    fs.writeFileSync(errorPath, JSON.stringify(errorResult, null, 2));
    console.log(`   错误信息已保存到: ${errorPath}`);
  } finally {
    await browser.close();
  }
}

// 运行分析
if (require.main === module) {
  quickAnalyze().catch(console.error);
}

module.exports = { quickAnalyze };


