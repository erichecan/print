/**
 * Custom Ink 颜色 ID 和图片爬取脚本
 * [2025-01-30 23:55:00] 从 Custom Ink Design Lab 爬取产品颜色 ID 和图片 URL
 * 
 * 功能：
 * 1. 访问 Custom Ink Design Lab
 * 2. 监听网络请求，提取产品 ID 和颜色 ID
 * 3. 尝试从页面提取颜色名称
 * 4. 生成颜色映射表
 * 5. 验证图片 URL 是否存在
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '../docs/customink-analysis');
const COLORS_FILE = path.join(OUTPUT_DIR, 'color-mapping.json');

// 确保目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 已知的产品 ID（Gildan Softstyle Jersey T-shirt）
const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';

// 颜色名称映射（从已知信息扩展）
const KNOWN_COLOR_NAMES = {
  '176100': 'White',
  '176101': 'Navy',
  '176102': 'Maroon',
  '176103': 'Black',
  '176104': 'Heather Grey',
  '176105': 'Heather Dark Grey',
  // 常见颜色 ID（需要验证）
  '176106': 'Red',
  '176107': 'Royal Blue',
  '176108': 'Forest Green',
  '176109': 'Purple',
  '176110': 'Pink',
  '176111': 'Orange',
  '176112': 'Yellow',
  '176113': 'Charcoal',
  '176114': 'Heather Blue',
  '176115': 'Heather Red',
};

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
  const baseUrl = `https://mms-images-prod.imgix.net/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${view}_${size}.png`;
  return `${baseUrl}?w=2000&q=100`;
}

/**
 * 从 Custom Ink Design Lab 提取颜色信息
 */
async function scrapeColorInfo() {
  console.log('🚀 开始从 Custom Ink Design Lab 提取颜色信息...\n');
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // 存储颜色信息：productId -> { colorId -> { name, hex, imageUrls } }
  const colorMap = new Map();
  
  try {
    console.log('📄 访问 Custom Ink Design Lab...');
    await page.goto('https://www.customink.com/ndx/#/welcome', { 
      waitUntil: 'commit',
      timeout: 120000 
    });
    
    await page.waitForTimeout(10000);
    
    // 监听网络请求，提取产品 ID 和颜色 ID
    page.on('response', async (response) => {
      const url = response.url();
      
      // 提取图片 URL 中的产品 ID 和颜色 ID
      if (url.includes('mms-images-prod.imgix.net') && url.includes('/catalog/')) {
        const match = url.match(/\/catalog\/([^/]+)\/colors\/(\d+)/);
        if (match) {
          const productId = match[1];
          const colorId = match[2];
          
          if (!colorMap.has(productId)) {
            colorMap.set(productId, new Map());
          }
          
          const productColors = colorMap.get(productId);
          if (!productColors.has(colorId)) {
            productColors.set(colorId, {
              colorId: colorId,
              name: KNOWN_COLOR_NAMES[colorId] || null,
              hex: null,
              imageUrls: {
                front: null,
                back: null,
                sleeve: null
              },
              verified: false
            });
          }
          
          // 提取视图类型
          const viewMatch = url.match(/\/(front|back|sleeve|left|right)_/);
          if (viewMatch) {
            const view = viewMatch[1];
            if (view === 'left' || view === 'right') {
              // 左右视图映射到 sleeve
              productColors.get(colorId).imageUrls.sleeve = url.split('?')[0];
            } else if (['front', 'back', 'sleeve'].includes(view)) {
              productColors.get(colorId).imageUrls[view] = url.split('?')[0];
            }
          }
        }
      }
    });
    
    // 等待更多请求
    console.log('⏳ 等待网络请求...');
    await page.waitForTimeout(20000);
    
    // 尝试从页面提取颜色名称（如果可能）
    try {
      console.log('🔍 尝试从页面提取颜色名称...');
      const colorButtons = await page.$$('button[aria-label*="color" i], [data-color], [class*="color"]');
      
      for (const button of colorButtons.slice(0, 30)) {
        try {
          const colorName = await button.getAttribute('aria-label') || 
                           await button.getAttribute('title') || 
                           await button.textContent();
          const colorHex = await button.getAttribute('data-hex') ||
                          await button.evaluate(el => {
                            const bg = window.getComputedStyle(el).backgroundColor;
                            if (bg && bg !== 'rgba(0, 0, 0, 0)') {
                              const rgb = bg.match(/\d+/g);
                              if (rgb && rgb.length >= 3) {
                                return '#' + rgb.map(x => {
                                  const hex = parseInt(x).toString(16);
                                  return hex.length === 1 ? '0' + hex : hex;
                                }).join('');
                              }
                            }
                            return null;
                          });
          
          // 这里需要将颜色名称映射到颜色 ID，但需要更多上下文
          // 暂时跳过，主要依赖网络请求提取
        } catch (e) {
          // 忽略单个元素的错误
        }
      }
    } catch (e) {
      console.log('⚠️  无法从页面提取颜色名称:', e.message);
    }
    
    console.log('✅ 提取完成\n');
    
  } catch (error) {
    console.error('❌ 提取失败:', error.message);
  } finally {
    await browser.close();
  }
  
  // 转换为可序列化的格式
  const result = {};
  for (const [productId, colors] of colorMap.entries()) {
    result[productId] = {};
    for (const [colorId, colorInfo] of colors.entries()) {
      result[productId][colorId] = colorInfo;
    }
  }
  
  return result;
}

/**
 * 验证并补充颜色信息
 */
async function verifyAndEnrichColors(colorData) {
  console.log('🔍 验证颜色图片 URL...\n');
  
  const productId = GILDAN_SOFTSTYLE_PRODUCT_ID;
  const productColors = colorData[productId] || {};
  
  // 尝试常见颜色 ID 范围（176100-176200）
  const colorIdRange = Array.from({ length: 100 }, (_, i) => 176100 + i);
  
  for (const colorId of colorIdRange) {
    const colorIdStr = colorId.toString();
    
    // 如果已经存在，跳过
    if (productColors[colorIdStr]) {
      continue;
    }
    
    // 生成 front 视图 URL 并验证
    const frontUrl = generateImageUrl(productId, colorIdStr, 'front');
    const exists = await checkImageExists(frontUrl);
    
    if (exists) {
      console.log(`✅ 发现新颜色 ID: ${colorIdStr}`);
      productColors[colorIdStr] = {
        colorId: colorIdStr,
        name: KNOWN_COLOR_NAMES[colorIdStr] || `Color-${colorIdStr}`,
        hex: null,
        imageUrls: {
          front: frontUrl.split('?')[0],
          back: generateImageUrl(productId, colorIdStr, 'back').split('?')[0],
          sleeve: generateImageUrl(productId, colorIdStr, 'front').split('?')[0] // sleeve 可能不存在，使用 front
        },
        verified: true
      };
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // 验证已存在的颜色
  for (const [colorId, colorInfo] of Object.entries(productColors)) {
    if (!colorInfo.verified && colorInfo.imageUrls.front) {
      const exists = await checkImageExists(colorInfo.imageUrls.front);
      colorInfo.verified = exists;
      if (exists) {
        console.log(`✅ 验证成功: ${colorId} (${colorInfo.name || 'Unknown'})`);
      } else {
        console.log(`❌ 验证失败: ${colorId} (${colorInfo.name || 'Unknown'})`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return colorData;
}

/**
 * 生成颜色映射表（用于前端）
 */
function generateColorMapping(colorData) {
  const productId = GILDAN_SOFTSTYLE_PRODUCT_ID;
  const productColors = colorData[productId] || {};
  
  const mapping = {};
  for (const [colorId, colorInfo] of Object.entries(productColors)) {
    if (colorInfo.verified && colorInfo.name) {
      mapping[colorInfo.name] = colorId;
    }
  }
  
  return mapping;
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('Custom Ink 颜色 ID 和图片爬取脚本');
  console.log('========================================\n');
  
  // 1. 从 Design Lab 提取颜色信息
  let colorData = await scrapeColorInfo();
  
  // 2. 如果没有提取到，使用已知数据
  if (!colorData[GILDAN_SOFTSTYLE_PRODUCT_ID] || Object.keys(colorData[GILDAN_SOFTSTYLE_PRODUCT_ID]).length === 0) {
    console.log('⚠️  未能从 Design Lab 提取颜色信息，使用已知数据并验证...\n');
    colorData[GILDAN_SOFTSTYLE_PRODUCT_ID] = {};
    for (const [colorId, name] of Object.entries(KNOWN_COLOR_NAMES)) {
      colorData[GILDAN_SOFTSTYLE_PRODUCT_ID][colorId] = {
        colorId: colorId,
        name: name,
        hex: null,
        imageUrls: {
          front: generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front').split('?')[0],
          back: generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'back').split('?')[0],
          sleeve: generateImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front').split('?')[0]
        },
        verified: false
      };
    }
  }
  
  // 3. 验证并补充颜色信息
  colorData = await verifyAndEnrichColors(colorData);
  
  // 4. 生成颜色映射表
  const colorMapping = generateColorMapping(colorData);
  
  // 5. 保存结果
  const result = {
    timestamp: new Date().toISOString(),
    productId: GILDAN_SOFTSTYLE_PRODUCT_ID,
    productName: 'Gildan Softstyle Jersey T-shirt',
    colorData: colorData[GILDAN_SOFTSTYLE_PRODUCT_ID],
    colorMapping: colorMapping,
    totalColors: Object.keys(colorData[GILDAN_SOFTSTYLE_PRODUCT_ID]).length,
    verifiedColors: Object.values(colorData[GILDAN_SOFTSTYLE_PRODUCT_ID]).filter(c => c.verified).length
  };
  
  fs.writeFileSync(COLORS_FILE, JSON.stringify(result, null, 2));
  
  console.log('\n✅ 完成！');
  console.log(`   - 总颜色数: ${result.totalColors}`);
  console.log(`   - 已验证: ${result.verifiedColors}`);
  console.log(`   - 输出文件: ${COLORS_FILE}\n`);
  
  // 打印颜色映射表（用于更新 COLOR_ID_MAP）
  console.log('颜色映射表（用于更新 COLOR_ID_MAP）:');
  console.log(JSON.stringify(colorMapping, null, 2));
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { scrapeColorInfo, verifyAndEnrichColors, generateColorMapping };

