#!/usr/bin/env node
/**
 * Custom Ink 所有颜色爬取脚本（改进版）
 * [2025-01-30 21:45:00] 结合网络请求监听、ID 范围扫描和 URL 变化观察
 * 
 * 功能：
 * 1. 访问 Custom Ink 产品页面
 * 2. 监听网络请求，提取颜色 ID
 * 3. 扫描颜色 ID 范围（176100-176200），验证哪些存在
 * 4. 点击颜色选择器，观察 URL 变化
 * 5. 获取每个颜色的名称和 hex 值
 * 6. 生成完整的颜色映射文件
 * 
 * 使用：
 * node scripts/scrape-all-customink-colors-improved.js
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// 配置
const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';
const PRODUCT_URL = 'https://www.customink.com/ndx/?SK=176100&PK=176126#/productColor';

// 输出文件
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
const COLORS_FILE = path.join(OUTPUT_DIR, 'all-colors-complete.json');

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
 * 从网络请求中提取产品 ID
 */
function extractProductIdFromUrl(url) {
  const match = url.match(/\/catalog\/([^/]+)\/colors\//);
  return match ? match[1] : null;
}

/**
 * 主函数
 */
async function scrapeAllColors() {
  console.log('🚀 开始抓取 Custom Ink 所有颜色（改进版）...\n');
  console.log(`📄 产品 URL: ${PRODUCT_URL}\n`);
  
  const browser = await playwright.chromium.launch({
    headless: false, // 显示浏览器以便观察
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // 存储发现的颜色
  const discoveredColors = new Map(); // colorId -> { colorId, colorName, colorHex, imageUrls, verified }
  const productIds = new Set();
  
  try {
    // 监听网络请求，提取颜色 ID
    console.log('📡 开始监听网络请求...\n');
    
    page.on('request', (request) => {
      const url = request.url();
      
      // 从图片 URL 中提取颜色 ID 和产品 ID
      if (url.includes('mms-images-prod.imgix.net') && url.includes('/colors/')) {
        const colorMatch = url.match(/\/colors\/(\d+)\//);
        const productMatch = url.match(/\/catalog\/([^/]+)\/colors\//);
        
        if (colorMatch) {
          const colorId = colorMatch[1];
          const productId = productMatch ? productMatch[1] : GILDAN_SOFTSTYLE_PRODUCT_ID;
          
          productIds.add(productId);
          
          if (!discoveredColors.has(colorId)) {
            discoveredColors.set(colorId, {
              colorId: colorId,
              colorName: null,
              colorHex: null,
              imageUrls: {
                front: null,
                back: null,
                sleeve: null
              },
              verified: false,
              source: 'network_request'
            });
          }
          
          // 提取视图类型
          const viewMatch = url.match(/\/(front|back|sleeve|left|right)_/);
          if (viewMatch) {
            const view = viewMatch[1] === 'left' || viewMatch[1] === 'right' ? 'sleeve' : viewMatch[1];
            const colorInfo = discoveredColors.get(colorId);
            if (!colorInfo.imageUrls[view]) {
              colorInfo.imageUrls[view] = url.split('?')[0];
            }
          }
        }
      }
    });
    
    // 访问页面
    console.log('⏳ 访问产品页面...');
    await page.goto(PRODUCT_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });
    
    await page.waitForTimeout(5000);
    console.log('✅ 页面加载完成\n');
    
    // 点击 "Change Color" 按钮打开颜色选择
    console.log('🖱️  点击 "Change Color" 按钮...');
    try {
      const changeColorButton = await page.locator('text=/change color/i').first();
      if (await changeColorButton.isVisible()) {
        await changeColorButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ 已打开颜色选择\n');
      }
    } catch (error) {
      console.log('⚠️  未找到 "Change Color" 按钮，继续...\n');
    }
    
    // 等待更多网络请求
    console.log('⏳ 等待网络请求收集颜色 ID（10秒）...');
    await page.waitForTimeout(10000);
    
    console.log(`✅ 从网络请求中发现 ${discoveredColors.size} 个颜色 ID\n`);
    
    // 方案 2: 扫描颜色 ID 范围
    console.log('🔍 开始扫描颜色 ID 范围（176100-176200）...\n');
    
    const colorIdRange = Array.from({ length: 101 }, (_, i) => 176100 + i);
    let scannedCount = 0;
    let foundCount = 0;
    
    // 使用第一个产品 ID（或默认的）
    const primaryProductId = Array.from(productIds)[0] || GILDAN_SOFTSTYLE_PRODUCT_ID;
    console.log(`   使用产品 ID: ${primaryProductId}\n`);
    
    for (const colorId of colorIdRange) {
      const colorIdStr = colorId.toString();
      scannedCount++;
      
      // 如果已经发现，跳过
      if (discoveredColors.has(colorIdStr)) {
        continue;
      }
      
      // 验证图片是否存在
      const frontUrl = generateImageUrl(primaryProductId, colorIdStr, 'front');
      const exists = await checkImageExists(frontUrl);
      
      if (exists) {
        foundCount++;
        console.log(`   ✅ 发现颜色 ID: ${colorIdStr}`);
        
        discoveredColors.set(colorIdStr, {
          colorId: colorIdStr,
          colorName: null,
          colorHex: null,
          imageUrls: {
            front: frontUrl.split('?')[0],
            back: generateImageUrl(primaryProductId, colorIdStr, 'back').split('?')[0],
            sleeve: generateImageUrl(primaryProductId, colorIdStr, 'front').split('?')[0]
          },
          verified: true,
          source: 'id_scan'
        });
      }
      
      // 每 10 个显示进度
      if (scannedCount % 10 === 0) {
        console.log(`   进度: ${scannedCount}/101, 已发现: ${discoveredColors.size} 个颜色`);
      }
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n✅ 扫描完成: 扫描 ${scannedCount} 个 ID，新发现 ${foundCount} 个颜色\n`);
    
    // 方案 3: 尝试从页面获取颜色名称
    console.log('🔍 尝试从页面获取颜色名称...\n');
    
    try {
      // 查找所有颜色选择器
      const colorSwatches = await page.$$('.swatch-outline, [class*="swatch"], [class*="color-item"]');
      console.log(`   找到 ${colorSwatches.length} 个颜色选择器\n`);
      
      // 尝试点击每个颜色，观察 URL 变化
      for (let i = 0; i < Math.min(20, colorSwatches.length); i++) {
        try {
          const swatch = colorSwatches[i];
          const beforeUrl = page.url();
          
          await swatch.click();
          await page.waitForTimeout(1000);
          
          const afterUrl = page.url();
          
          // 从 URL 中提取颜色 ID
          const urlMatch = afterUrl.match(/PK=(\d+)/);
          if (urlMatch) {
            const colorId = urlMatch[1];
            
            if (discoveredColors.has(colorId)) {
              // 尝试获取颜色名称
              const colorName = await page.evaluate(() => {
                // 查找显示当前颜色的元素
                const colorText = document.querySelector('[class*="color"]')?.textContent;
                return colorText?.trim() || null;
              });
              
              if (colorName) {
                discoveredColors.get(colorId).colorName = colorName;
                console.log(`   ✅ ${colorId}: ${colorName}`);
              }
            }
          }
        } catch (error) {
          // 忽略单个点击错误
        }
      }
    } catch (error) {
      console.log(`   ⚠️  无法从页面获取颜色名称: ${error.message}\n`);
    }
    
    // 验证所有颜色的图片 URL
    console.log('🔍 验证所有颜色的图片 URL...\n');
    
    let verifiedCount = 0;
    for (const [colorId, colorInfo] of discoveredColors.entries()) {
      if (!colorInfo.verified && colorInfo.imageUrls.front) {
        const exists = await checkImageExists(colorInfo.imageUrls.front);
        colorInfo.verified = exists;
        if (exists) {
          verifiedCount++;
        }
      } else if (colorInfo.verified) {
        verifiedCount++;
      }
    }
    
    console.log(`✅ 验证完成: ${verifiedCount}/${discoveredColors.size} 个颜色已验证\n`);
    
    // 转换为数组格式
    const colorsArray = Array.from(discoveredColors.values()).map(color => ({
      ...color,
      imageUrls: {
        front: color.imageUrls.front || generateImageUrl(primaryProductId, color.colorId, 'front').split('?')[0],
        back: color.imageUrls.back || generateImageUrl(primaryProductId, color.colorId, 'back').split('?')[0],
        sleeve: color.imageUrls.sleeve || generateImageUrl(primaryProductId, color.colorId, 'front').split('?')[0]
      }
    }));
    
    // 生成颜色映射表
    const colorMapping = {};
    for (const color of colorsArray) {
      if (color.colorName) {
        colorMapping[color.colorName] = color.colorId;
      }
    }
    
    // 生成结果
    const result = {
      timestamp: new Date().toISOString(),
      productId: primaryProductId,
      productName: 'Gildan Softstyle Jersey T-shirt',
      totalColors: colorsArray.length,
      verifiedColors: colorsArray.filter(c => c.verified).length,
      colors: colorsArray.sort((a, b) => parseInt(a.colorId) - parseInt(b.colorId)),
      colorMapping: colorMapping,
      productIds: Array.from(productIds)
    };
    
    // 保存结果
    fs.writeFileSync(COLORS_FILE, JSON.stringify(result, null, 2));
    
    console.log('\n✅ 抓取完成！');
    console.log(`📄 结果已保存到: ${COLORS_FILE}\n`);
    console.log('📊 统计:');
    console.log(`   - 总颜色数: ${result.totalColors}`);
    console.log(`   - 已验证: ${result.verifiedColors}`);
    console.log(`   - 有名称: ${Object.keys(colorMapping).length}`);
    console.log(`   - 产品 ID: ${primaryProductId}\n`);
    
    // 显示前10个颜色
    console.log('📋 前10个颜色:');
    colorsArray.slice(0, 10).forEach((color, index) => {
      console.log(`   ${index + 1}. ID: ${color.colorId}, 名称: ${color.colorName || 'N/A'}, 已验证: ${color.verified ? '✅' : '❌'}`);
    });
    
    // 等待一下让用户观察
    console.log('\n⏳ 等待 5 秒...');
    await page.waitForTimeout(5000);
    
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

