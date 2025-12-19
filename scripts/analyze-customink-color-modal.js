#!/usr/bin/env node
/**
 * 分析 Custom Ink 颜色选择模态框
 * [2025-01-30 21:30:00] 点击 "Change Color" 按钮，分析颜色选择模态框的结构
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
const MODAL_ANALYSIS_FILE = path.join(OUTPUT_DIR, 'color-modal-analysis.json');

// 确保目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 测试 URL
const PRODUCT_URL = 'https://www.customink.com/ndx/?SK=176100&PK=176126#/productColor';

async function analyzeColorModal() {
  console.log('🔍 开始分析 Custom Ink 颜色选择模态框...\n');
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
    changeColorButton: null,
    modalStructure: null,
    colorSwatches: [],
    urlChanges: []
  };
  
  try {
    // 监听 URL 变化
    const urlChanges = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        urlChanges.push({
          timestamp: new Date().toISOString(),
          url: frame.url()
        });
      }
    });
    
    // 监听网络请求，捕获颜色相关的请求
    const colorRequests = [];
    page.on('request', (request) => {
      const url = request.url();
      // 捕获包含颜色 ID 的图片请求
      if (url.includes('/colors/') && url.includes('mms-images-prod.imgix.net')) {
        const match = url.match(/\/colors\/(\d+)\//);
        if (match) {
          colorRequests.push({
            colorId: match[1],
            url: url,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    // 访问页面
    console.log('⏳ 加载页面...');
    await page.goto(PRODUCT_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });
    
    await page.waitForTimeout(5000);
    console.log('✅ 页面加载完成\n');
    
    // 查找 "Change Color" 按钮
    console.log('🔍 查找 "Change Color" 按钮...\n');
    
    const changeColorSelectors = [
      'text=/change color/i',
      'button:has-text("Change Color")',
      'a:has-text("Change Color")',
      '[aria-label*="change color" i]',
      '[title*="change color" i]',
      'button[class*="color"]',
      'a[class*="color"]'
    ];
    
    let changeColorButton = null;
    for (const selector of changeColorSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.toLowerCase().includes('change color')) {
            changeColorButton = element;
            console.log(`   ✅ 找到 "Change Color" 按钮: ${selector}`);
            break;
          }
        }
        if (changeColorButton) break;
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    if (!changeColorButton) {
      // 尝试更通用的方法
      console.log('   ⚠️  未找到按钮，尝试通用方法...');
      const allButtons = await page.$$('button, a, [role="button"]');
      for (const button of allButtons) {
        const text = await element.textContent();
        if (text && text.toLowerCase().includes('color')) {
          console.log(`   ✅ 找到可能的颜色按钮: ${text}`);
          changeColorButton = button;
          break;
        }
      }
    }
    
    if (changeColorButton) {
      const buttonInfo = await changeColorButton.evaluate((el) => {
        return {
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent?.trim(),
          ariaLabel: el.getAttribute('aria-label'),
          href: el.getAttribute('href'),
          onclick: el.getAttribute('onclick')
        };
      });
      
      analysis.changeColorButton = buttonInfo;
      console.log(`   📋 按钮信息: ${JSON.stringify(buttonInfo, null, 2)}\n`);
      
      // 点击按钮打开模态框
      console.log('🖱️  点击 "Change Color" 按钮...\n');
      const beforeUrl = page.url();
      
      await changeColorButton.click();
      await page.waitForTimeout(3000); // 等待模态框打开
      
      const afterUrl = page.url();
      if (beforeUrl !== afterUrl) {
        console.log(`   ✅ URL 变化: ${beforeUrl} -> ${afterUrl}`);
        analysis.urlChanges.push({
          action: 'click_change_color',
          before: beforeUrl,
          after: afterUrl
        });
      }
      
      // 分析模态框结构
      console.log('🔍 分析颜色选择模态框...\n');
      
      const modalInfo = await page.evaluate(() => {
        const info = {
          modalElements: [],
          colorSwatches: [],
          colorButtons: []
        };
        
        // 查找模态框
        const modalSelectors = [
          '[role="dialog"]',
          '.modal',
          '[class*="modal"]',
          '[class*="dialog"]',
          '[id*="modal"]',
          '[id*="dialog"]'
        ];
        
        let modal = null;
        for (const selector of modalSelectors) {
          modal = document.querySelector(selector);
          if (modal) {
            info.modalElements.push({
              selector: selector,
              tagName: modal.tagName,
              className: modal.className,
              id: modal.id,
              visible: modal.offsetWidth > 0 && modal.offsetHeight > 0
            });
            break;
          }
        }
        
        // 查找所有可能的颜色选择器
        const swatchSelectors = [
          'button[aria-label*="color" i]',
          '[data-color-id]',
          '[data-color]',
          '[data-sk]',
          '.color-swatch',
          '[class*="swatch"]',
          '[class*="color-item"]'
        ];
        
        for (const selector of swatchSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            info.colorSwatches.push({
              selector: selector,
              count: elements.length
            });
            
            // 提取前20个颜色选择器的详细信息
            Array.from(elements).slice(0, 20).forEach((el, index) => {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                info.colorButtons.push({
                  index: index,
                  tagName: el.tagName,
                  className: el.className,
                  ariaLabel: el.getAttribute('aria-label'),
                  title: el.getAttribute('title'),
                  dataAttributes: {
                    colorId: el.getAttribute('data-color-id'),
                    color: el.getAttribute('data-color'),
                    sk: el.getAttribute('data-sk'),
                    pk: el.getAttribute('data-pk'),
                    hex: el.getAttribute('data-hex')
                  },
                  textContent: el.textContent?.trim().substring(0, 50),
                  style: {
                    backgroundColor: window.getComputedStyle(el).backgroundColor,
                    width: rect.width,
                    height: rect.height
                  }
                });
              }
            });
          }
        }
        
        return info;
      });
      
      analysis.modalStructure = modalInfo;
      analysis.colorSwatches = modalInfo.colorButtons;
      
      console.log(`   ✅ 找到 ${modalInfo.colorButtons.length} 个颜色选择器\n`);
      
      // 测试点击几个颜色选择器，观察 URL 变化
      console.log('🖱️  测试点击颜色选择器...\n');
      
      const clickTests = [];
      for (let i = 0; i < Math.min(5, modalInfo.colorButtons.length); i++) {
        const colorInfo = modalInfo.colorButtons[i];
        try {
          const selector = `button[aria-label="${colorInfo.ariaLabel}"], [data-sk="${colorInfo.dataAttributes.sk}"]`;
          const colorButton = await page.$(selector);
          
          if (colorButton) {
            const beforeUrl = page.url();
            console.log(`   🖱️  点击颜色 ${i + 1}: ${colorInfo.ariaLabel || colorInfo.textContent}`);
            
            await colorButton.click();
            await page.waitForTimeout(2000);
            
            const afterUrl = page.url();
            if (beforeUrl !== afterUrl) {
              console.log(`      ✅ URL 变化: ${beforeUrl} -> ${afterUrl}`);
              clickTests.push({
                colorIndex: i,
                colorName: colorInfo.ariaLabel || colorInfo.textContent,
                beforeUrl: beforeUrl,
                afterUrl: afterUrl,
                urlChanged: true
              });
            } else {
              clickTests.push({
                colorIndex: i,
                colorName: colorInfo.ariaLabel || colorInfo.textContent,
                urlChanged: false
              });
            }
          }
        } catch (error) {
          console.log(`      ❌ 点击失败: ${error.message}`);
        }
      }
      
      analysis.clickTests = clickTests;
      analysis.colorRequests = colorRequests;
      
    } else {
      console.log('   ❌ 未找到 "Change Color" 按钮\n');
    }
    
    // 保存分析结果
    fs.writeFileSync(MODAL_ANALYSIS_FILE, JSON.stringify(analysis, null, 2));
    
    console.log('\n✅ 分析完成！');
    console.log(`📄 结果已保存到: ${MODAL_ANALYSIS_FILE}\n`);
    
    // 打印摘要
    console.log('📊 分析摘要:');
    if (analysis.changeColorButton) {
      console.log(`   ✅ 找到 "Change Color" 按钮`);
    } else {
      console.log(`   ❌ 未找到 "Change Color" 按钮`);
    }
    if (analysis.modalStructure) {
      console.log(`   - 颜色选择器数量: ${analysis.colorSwatches.length}`);
      console.log(`   - URL 变化次数: ${analysis.urlChanges.length}`);
      console.log(`   - 颜色请求数量: ${colorRequests.length}`);
    }
    
    // 等待一下让用户观察
    console.log('\n⏳ 等待 10 秒以便观察页面...');
    await page.waitForTimeout(10000);
    
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
  analyzeColorModal().catch(console.error);
}

module.exports = { analyzeColorModal };

