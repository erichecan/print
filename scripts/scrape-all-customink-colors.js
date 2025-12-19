#!/usr/bin/env node
/**
 * Custom Ink 所有颜色爬取脚本
 * [2025-01-30 21:00:00] 从 Custom Ink 产品页面抓取所有可用颜色
 * 
 * 功能：
 * 1. 访问 Custom Ink 产品页面
 * 2. 提取所有颜色选择器
 * 3. 获取每个颜色的 ID、名称和 hex 值
 * 4. 验证图片 URL 是否存在
 * 5. 生成完整的颜色映射文件
 * 
 * 使用：
 * node scripts/scrape-all-customink-colors.js
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// 配置
const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';
const PRODUCT_URL = `https://www.customink.com/ndx/?SK=176100&PK=176126#/productColor`;

// 输出文件
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
const COLORS_FILE = path.join(OUTPUT_DIR, 'all-colors-mapping.json');

// 确保目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 检查图片 URL 是否存在
 */
function checkImageExists(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    const request = client.get(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode === 200);
    });
    
    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * 生成图片 URL
 */
function generateImageUrl(productId, colorId, view = 'front', size = 'large_extended') {
  return `https://mms-images-prod.imgix.net/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${view}_${size}.png?w=2000&q=100`;
}

/**
 * 从颜色元素提取颜色 ID
 */
function extractColorIdFromElement(element) {
  // 尝试多种方式提取颜色 ID
  // 1. 从 data-color-id 属性
  // 2. 从 data-color 属性
  // 3. 从 aria-label 或 title
  // 4. 从点击事件监听器
  return element.getAttribute('data-color-id') ||
         element.getAttribute('data-color') ||
         element.getAttribute('data-id') ||
         null;
}

/**
 * 从网络请求中提取颜色 ID
 */
async function extractColorIdFromNetwork(page, colorElement) {
  return new Promise(async (resolve) => {
    // 监听网络请求
    const requestHandler = async (request) => {
      const url = request.url();
      // 匹配颜色 ID 模式: /colors/{colorId}/
      const match = url.match(/\/colors\/(\d+)\//);
      if (match) {
        page.removeListener('request', requestHandler);
        resolve(match[1]);
      }
    };
    
    page.on('request', requestHandler);
    
    // 点击颜色元素
    try {
      await colorElement.click({ timeout: 2000 });
      // 等待一下让请求发出
      await page.waitForTimeout(500);
    } catch (error) {
      // 如果点击失败，尝试其他方式
    }
    
    // 如果 2 秒后还没找到，返回 null
    setTimeout(() => {
      page.removeListener('request', requestHandler);
      resolve(null);
    }, 2000);
  });
}

/**
 * 从页面抓取所有颜色
 */
async function scrapeAllColors() {
  console.log('🚀 开始抓取 Custom Ink 所有颜色...\n');
  
  const browser = await playwright.chromium.launch({
    headless: false, // 显示浏览器以便调试
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`📄 访问产品页面: ${PRODUCT_URL}`);
    await page.goto(PRODUCT_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    // 等待颜色选择器加载
    console.log('⏳ 等待颜色选择器加载...');
    await page.waitForTimeout(3000);
    
    // 查找所有颜色选择器
    // 尝试多种选择器
    const colorSelectors = [
      'button[data-color-id]',
      'button[data-color]',
      '[data-color-id]',
      '[data-color]',
      '.color-swatch',
      '.color-item',
      '[role="button"][aria-label*="color" i]',
      'button[aria-label*="color" i]',
    ];
    
    let colorElements = [];
    for (const selector of colorSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ 使用选择器 "${selector}" 找到 ${elements.length} 个颜色元素`);
          colorElements = elements;
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    if (colorElements.length === 0) {
      // 尝试更通用的方法：查找所有可能的颜色按钮
      console.log('⚠️  未找到颜色选择器，尝试通用方法...');
      colorElements = await page.$$('button, [role="button"], [onclick*="color" i]');
      console.log(`   找到 ${colorElements.length} 个可能的按钮元素`);
    }
    
    if (colorElements.length === 0) {
      throw new Error('未找到任何颜色元素');
    }
    
    console.log(`\n📋 开始提取 ${colorElements.length} 个颜色的信息...\n`);
    
    const colors = [];
    const colorIds = new Set(); // 用于去重
    
    // 监听网络请求以捕获颜色 ID
    const networkColorIds = new Map();
    page.on('request', (request) => {
      const url = request.url();
      const match = url.match(/\/colors\/(\d+)\//);
      if (match) {
        const colorId = match[1];
        // 从 URL 中提取颜色名称（如果可能）
        networkColorIds.set(colorId, url);
      }
    });
    
    // 提取每个颜色的信息
    for (let i = 0; i < Math.min(colorElements.length, 100); i++) { // 限制最多100个
      const element = colorElements[i];
      
      try {
        // 提取颜色名称
        const colorName = await element.evaluate((el) => {
          return el.getAttribute('aria-label') ||
                 el.getAttribute('title') ||
                 el.getAttribute('data-color-name') ||
                 el.textContent?.trim() ||
                 el.getAttribute('alt') ||
                 null;
        });
        
        // 提取颜色 hex 值
        const colorHex = await element.evaluate((el) => {
          // 尝试从样式获取
          const bgColor = window.getComputedStyle(el).backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const hex = '#' + rgb.map(x => {
                const h = parseInt(x).toString(16);
                return h.length === 1 ? '0' + h : h;
              }).join('');
              return hex;
            }
          }
          
          // 尝试从属性获取
          return el.getAttribute('data-hex') ||
                 el.getAttribute('data-color-hex') ||
                 el.style.backgroundColor ||
                 null;
        });
        
        // 提取颜色 ID
        let colorId = await element.evaluate(extractColorIdFromElement);
        
        // 如果无法从元素提取，尝试点击并监听网络请求
        if (!colorId) {
          console.log(`   🔍 尝试从网络请求提取颜色 ID: ${colorName || 'Unknown'}`);
          colorId = await extractColorIdFromNetwork(page, element);
        }
        
        // 过滤无效的颜色
        if (!colorName || colorName.length < 2 || colorName.length > 50) {
          continue;
        }
        
        // 过滤无效的颜色名称
        const invalidNames = ['select', 'choose', 'color', 'size', 'add', 'product'];
        if (invalidNames.includes(colorName.toLowerCase().trim())) {
          continue;
        }
        
        // 如果还没有颜色 ID，尝试从已知范围猜测
        if (!colorId) {
          // 可以尝试从颜色名称映射到已知 ID
          // 或者使用网络请求中捕获的 ID
          continue; // 暂时跳过没有 ID 的颜色
        }
        
        // 去重
        if (colorIds.has(colorId)) {
          continue;
        }
        colorIds.add(colorId);
        
        // 验证图片 URL
        const frontUrl = generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front');
        const imageExists = await checkImageExists(frontUrl);
        
        if (imageExists) {
          colors.push({
            colorId: colorId,
            colorName: colorName.trim(),
            colorHex: colorHex || null,
            imageUrls: {
              front: frontUrl.split('?')[0],
              back: generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'back').split('?')[0],
              sleeve: generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front').split('?')[0]
            },
            verified: true
          });
          
          console.log(`   ✅ ${colorName} (${colorId}) - ${colorHex || 'N/A'}`);
        } else {
          console.log(`   ⚠️  ${colorName} (${colorId}) - 图片不存在`);
        }
        
        // 添加延迟避免请求过快
        await page.waitForTimeout(200);
        
      } catch (error) {
        console.log(`   ❌ 提取颜色 ${i + 1} 时出错: ${error.message}`);
        continue;
      }
    }
    
    console.log(`\n✅ 成功提取 ${colors.length} 个颜色\n`);
    
    // 生成结果
    const result = {
      timestamp: new Date().toISOString(),
      productId: GILDAN_SOFTSTYLE_PRODUCT_ID,
      productName: 'Gildan Softstyle Jersey T-shirt',
      totalColors: colors.length,
      colors: colors,
      colorMapping: colors.reduce((acc, color) => {
        acc[color.colorName] = color.colorId;
        return acc;
      }, {})
    };
    
    // 保存结果
    fs.writeFileSync(COLORS_FILE, JSON.stringify(result, null, 2));
    
    console.log('📄 结果已保存到:', COLORS_FILE);
    console.log(`\n📊 统计:`);
    console.log(`   - 总颜色数: ${result.totalColors}`);
    console.log(`   - 已验证图片: ${colors.filter(c => c.verified).length}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ 抓取失败:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行
if (require.main === module) {
  scrapeAllColors().catch(console.error);
}

module.exports = { scrapeAllColors };

