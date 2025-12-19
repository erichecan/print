#!/usr/bin/env node
/**
 * 分析 Custom Ink 页面结构
 * [2025-01-30 21:15:00] 使用 Playwright 分析页面结构，找出颜色选择器的位置和 URL 参数变化
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
const ANALYSIS_FILE = path.join(OUTPUT_DIR, 'page-structure-analysis.json');

// 确保目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 测试 URL
const PRODUCT_URL = 'https://www.customink.com/ndx/?SK=176100&PK=176126#/productColor';

async function analyzePageStructure() {
  console.log('🔍 开始分析 Custom Ink 页面结构...\n');
  console.log(`📄 访问 URL: ${PRODUCT_URL}\n`);
  
  const browser = await playwright.chromium.launch({
    headless: false, // 显示浏览器以便观察
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  const analysis = {
    timestamp: new Date().toISOString(),
    url: PRODUCT_URL,
    urlParams: {},
    colorSelectors: [],
    colorElements: [],
    networkRequests: [],
    pageStructure: {}
  };
  
  try {
    // 解析 URL 参数
    const urlObj = new URL(PRODUCT_URL);
    urlObj.searchParams.forEach((value, key) => {
      analysis.urlParams[key] = value;
    });
    
    console.log('📋 URL 参数分析:');
    console.log(`   SK (可能是颜色 ID): ${analysis.urlParams.SK}`);
    console.log(`   PK (可能是产品 ID): ${analysis.urlParams.PK}`);
    console.log(`   Hash: ${urlObj.hash}\n`);
    
    // 监听网络请求
    const networkData = [];
    page.on('request', (request) => {
      const url = request.url();
      // 记录包含颜色 ID 的请求
      if (url.includes('/colors/') || url.includes('SK=') || url.includes('color')) {
        networkData.push({
          url: url,
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', (response) => {
      const url = response.url();
      // 记录图片请求
      if (url.includes('mms-images-prod.imgix.net') || url.includes('/colors/')) {
        networkData.push({
          url: url,
          status: response.status(),
          type: response.request().resourceType()
        });
      }
    });
    
    // 访问页面
    console.log('⏳ 加载页面...');
    try {
      await page.goto(PRODUCT_URL, { 
        waitUntil: 'domcontentloaded', 
        timeout: 90000 
      });
    } catch (error) {
      console.log(`⚠️  页面加载超时，但继续分析: ${error.message}`);
    }
    
    // 等待页面完全加载（包括动态内容）
    console.log('⏳ 等待动态内容加载（10秒）...');
    await page.waitForTimeout(10000);
    
    console.log('✅ 页面加载完成\n');
    
    // 分析页面标题
    const title = await page.title();
    console.log(`📄 页面标题: ${title}\n`);
    
    // 分析当前 URL（可能已变化）
    const currentUrl = page.url();
    console.log(`🔗 当前 URL: ${currentUrl}\n`);
    
    // 分析 URL 参数变化
    const currentUrlObj = new URL(currentUrl);
    const currentParams = {};
    currentUrlObj.searchParams.forEach((value, key) => {
      currentParams[key] = value;
    });
    analysis.urlParams.current = currentParams;
    
    // 尝试多种选择器查找颜色元素
    console.log('🔍 查找颜色选择器...\n');
    
    const selectorAttempts = [
      'button[data-color-id]',
      'button[data-color]',
      '[data-color-id]',
      '[data-color]',
      '.color-swatch',
      '.color-item',
      '[class*="color"]',
      'button[aria-label*="color" i]',
      '[role="button"][aria-label*="color" i]',
      'button',
      '[role="button"]'
    ];
    
    for (const selector of selectorAttempts) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`   ✅ 选择器 "${selector}": 找到 ${elements.length} 个元素`);
          analysis.colorSelectors.push({
            selector: selector,
            count: elements.length
          });
          
          // 分析前几个元素
          const sampleElements = [];
          for (let i = 0; i < Math.min(5, elements.length); i++) {
            const element = elements[i];
            const info = await element.evaluate((el) => {
              return {
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                ariaLabel: el.getAttribute('aria-label'),
                title: el.getAttribute('title'),
                dataAttributes: {
                  colorId: el.getAttribute('data-color-id'),
                  color: el.getAttribute('data-color'),
                  colorName: el.getAttribute('data-color-name'),
                  hex: el.getAttribute('data-hex'),
                  sk: el.getAttribute('data-sk'),
                  pk: el.getAttribute('data-pk'),
                },
                textContent: el.textContent?.trim().substring(0, 50),
                style: {
                  backgroundColor: window.getComputedStyle(el).backgroundColor,
                  width: window.getComputedStyle(el).width,
                  height: window.getComputedStyle(el).height
                }
              };
            });
            sampleElements.push(info);
          }
          analysis.colorElements.push({
            selector: selector,
            sample: sampleElements
          });
        }
      } catch (error) {
        // 忽略选择器错误
      }
    }
    
    // 查找包含 "color" 文本的元素
    console.log('\n🔍 查找包含 "color" 文本的元素...\n');
    try {
      const colorTextElements = await page.$$('text=/color/i');
      console.log(`   找到 ${colorTextElements.length} 个包含 "color" 的元素`);
    } catch (error) {
      console.log(`   ⚠️  无法搜索文本: ${error.message}`);
    }
    
    // 分析页面结构 - 查找可能的颜色容器
    console.log('\n🔍 分析页面结构...\n');
    const structureInfo = await page.evaluate(() => {
      const info = {
        colorContainers: [],
        buttons: [],
        gridElements: []
      };
      
      // 查找可能的颜色容器
      const containers = document.querySelectorAll('[class*="color"], [id*="color"], [class*="swatch"], [class*="grid"]');
      containers.forEach((container, index) => {
        if (index < 10) { // 只取前10个
          info.colorContainers.push({
            tagName: container.tagName,
            className: container.className,
            id: container.id,
            childCount: container.children.length
          });
        }
      });
      
      // 查找所有按钮
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        if (index < 20) { // 只取前20个
          const rect = button.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) { // 只取可见的按钮
            info.buttons.push({
              className: button.className,
              ariaLabel: button.getAttribute('aria-label'),
              title: button.getAttribute('title'),
              dataAttributes: {
                colorId: button.getAttribute('data-color-id'),
                color: button.getAttribute('data-color'),
                sk: button.getAttribute('data-sk'),
                pk: button.getAttribute('data-pk'),
              },
              dimensions: {
                width: rect.width,
                height: rect.height
              },
              position: {
                x: rect.x,
                y: rect.y
              }
            });
          }
        }
      });
      
      return info;
    });
    
    analysis.pageStructure = structureInfo;
    
    // 分析网络请求
    analysis.networkRequests = networkData.slice(0, 50); // 只保留前50个
    
    // 尝试点击颜色并观察 URL 变化
    console.log('\n🔍 测试点击颜色元素...\n');
    const clickTestResults = [];
    
    // 找到所有可能的颜色按钮
    const allButtons = await page.$$('button');
    console.log(`   找到 ${allButtons.length} 个按钮，测试前10个...\n`);
    
    for (let i = 0; i < Math.min(10, allButtons.length); i++) {
      const button = allButtons[i];
      try {
        const beforeUrl = page.url();
        const buttonInfo = await button.evaluate((el) => {
          return {
            ariaLabel: el.getAttribute('aria-label'),
            className: el.className,
            dataColorId: el.getAttribute('data-color-id'),
            dataSk: el.getAttribute('data-sk'),
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          };
        });
        
        if (buttonInfo.visible && buttonInfo.ariaLabel && buttonInfo.ariaLabel.toLowerCase().includes('color')) {
          console.log(`   🖱️  点击按钮 ${i + 1}: ${buttonInfo.ariaLabel}`);
          
          await button.click();
          await page.waitForTimeout(1000);
          
          const afterUrl = page.url();
          if (beforeUrl !== afterUrl) {
            console.log(`      URL 变化: ${beforeUrl} -> ${afterUrl}`);
            clickTestResults.push({
              buttonIndex: i,
              ariaLabel: buttonInfo.ariaLabel,
              beforeUrl: beforeUrl,
              afterUrl: afterUrl,
              urlChanged: true
            });
          } else {
            clickTestResults.push({
              buttonIndex: i,
              ariaLabel: buttonInfo.ariaLabel,
              urlChanged: false
            });
          }
        }
      } catch (error) {
        // 忽略点击错误
      }
    }
    
    analysis.clickTests = clickTestResults;
    
    // 保存分析结果
    fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analysis, null, 2));
    
    console.log('\n✅ 分析完成！');
    console.log(`📄 结果已保存到: ${ANALYSIS_FILE}\n`);
    
    // 打印摘要
    console.log('📊 分析摘要:');
    console.log(`   - 找到 ${analysis.colorSelectors.length} 种选择器`);
    console.log(`   - 找到 ${structureInfo.buttons.length} 个按钮`);
    console.log(`   - 找到 ${structureInfo.colorContainers.length} 个可能的颜色容器`);
    console.log(`   - 记录了 ${networkData.length} 个相关网络请求`);
    console.log(`   - 测试了 ${clickTestResults.length} 个按钮点击\n`);
    
    // 等待一下让用户观察（可选，如果 headless 模式可以缩短）
    console.log('⏳ 等待 5 秒以便观察页面...');
    await page.waitForTimeout(5000);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行
if (require.main === module) {
  analyzePageStructure().catch(console.error);
}

module.exports = { analyzePageStructure };

