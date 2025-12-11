/**
 * Design Lab 上传图片功能测试脚本（使用 Chrome DevTools Protocol）
 * [2025-01-31 19:30:00] 独立脚本，不依赖完整的测试环境
 * 使用方法: node apps/web/scripts/test-design-lab-upload-cdp.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const DESIGN_LAB_URL = `${FRONTEND_URL}/design-lab`;

// 创建一个简单的测试图片（如果不存在）
function createTestImageIfNeeded() {
  const testImagePath = path.join(__dirname, '../tests/e2e/fixtures/test-image.png');
  const fixturesDir = path.dirname(testImagePath);
  
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  // 如果图片不存在，创建一个简单的 1x1 PNG（base64）
  if (!fs.existsSync(testImagePath)) {
    // 这是一个 1x1 红色 PNG 的 base64 编码
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    fs.writeFileSync(testImagePath, Buffer.from(pngBase64, 'base64'));
    console.log(`✅ 创建测试图片: ${testImagePath}`);
  }
  
  return testImagePath;
}

async function testDesignLabUpload() {
  console.log('🚀 开始测试 Design Lab 上传图片功能...\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  // 启用 CDP 域
  await client.send('Network.enable');
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('DOM.enable');

  // 收集控制台消息
  const consoleMessages = [];
  client.on('Runtime.consoleAPICalled', (event) => {
    const args = event.args.map((arg) => {
      if (arg.type === 'string') return arg.value;
      if (arg.type === 'number') return arg.value;
      return JSON.stringify(arg.value);
    }).join(' ');
    
    const message = `[Console ${event.type}]: ${args}`;
    if (message.includes('[DesignLab]') || message.includes('[ProductImageLayer]')) {
      consoleMessages.push({
        type: event.type,
        message,
        timestamp: Date.now(),
      });
      console.log(message);
    }
  });

  // 收集网络请求
  const networkRequests = [];
  client.on('Network.responseReceived', (event) => {
    if (event.response.url.includes('/api/') || event.response.url.includes('/design-lab')) {
      networkRequests.push({
        url: event.response.url,
        status: event.response.status,
        timestamp: Date.now(),
      });
    }
  });

  try {
    console.log('1️⃣  访问 Design Lab 页面...');
    await page.goto(DESIGN_LAB_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('2️⃣  等待画布初始化...');
    await page.waitForFunction(() => {
      return window.fabricCanvas || document.querySelector('canvas');
    }, { timeout: 10000 });

    console.log('3️⃣  注入 Fabric.js 事件监听器...');
    await page.evaluate(() => {
      const canvas = window.fabricCanvas || (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas());
      if (canvas) {
        window.__uploadTestRemovedObjects = [];
        
        canvas.on('object:removed', (e) => {
          const obj = e.target;
          const objName = obj && obj.name ? obj.name : 'unnamed';
          const objLayerType = (obj && obj.data && obj.data.layerType) ? obj.data.layerType : 'unknown';
          
          window.__uploadTestRemovedObjects.push({
            name: objName,
            layerType: objLayerType,
            timestamp: Date.now(),
          });
        });
        
        canvas.on('object:added', (e) => {
          const obj = e.target;
          const objName = obj && obj.name ? obj.name : 'unnamed';
          const objLayerType = (obj && obj.data && obj.data.layerType) ? obj.data.layerType : 'unknown';
          console.log(`[Test] Object added: ${objName} (${objLayerType})`);
        });
      }
    });

    console.log('4️⃣  查找上传按钮并上传图片...');
    
    // 创建测试图片
    const testImagePath = createTestImageIfNeeded();
    
    // 尝试多种方式触发上传
    const uploadSelectors = [
      'button:has-text("Upload")',
      'button[data-tool="upload"]',
      'input[type="file"]',
      '[aria-label*="upload" i]',
    ];
    
    let uploaded = false;
    for (const selector of uploadSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === 'input' && await element.getAttribute('type') === 'file') {
          await element.setInputFiles(testImagePath);
          uploaded = true;
          break;
        } else {
          await element.click();
          await page.waitForTimeout(500);
          
          const fileInput = page.locator('input[type="file"]').first();
          if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(testImagePath);
            uploaded = true;
            break;
          }
        }
      }
    }

    if (!uploaded) {
      console.warn('⚠️  无法找到上传按钮，尝试直接上传...');
      // 通过 JavaScript 触发文件上传
      await page.evaluate((imagePath) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file && window.handleFileUpload) {
            window.handleFileUpload(file);
          }
        };
        input.click();
      }, testImagePath);
    }

    console.log('5️⃣  等待图片上传完成...');
    await page.waitForTimeout(3000);

    console.log('6️⃣  验证上传图片是否在画布上...');
    const canvasObjects = await page.evaluate(() => {
      const canvas = window.fabricCanvas || (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas());
      if (!canvas) return [];
      
      return canvas.getObjects().map((obj) => ({
        name: obj.name || 'unnamed',
        type: obj.type,
        layerType: (obj.data && obj.data.layerType) ? obj.data.layerType : 'unknown',
        visible: obj.visible,
      }));
    });

    console.log('画布对象列表:', JSON.stringify(canvasObjects, null, 2));
    
    const uploadImageExists = canvasObjects.some((obj) => 
      obj.layerType === 'upload' || obj.name.startsWith('image_')
    );
    
    if (!uploadImageExists) {
      console.error('❌ 上传图片不存在于画布上');
      console.error('画布对象:', canvasObjects);
      throw new Error('上传图片未成功添加到画布');
    }
    
    console.log('✅ 上传图片存在于画布上');

    console.log('7️⃣  触发产品图片加载（模拟切换颜色）...');
    // 尝试触发产品图片重新加载
    const colorButtons = await page.locator('button:has-text("Color"), [data-color], button[aria-label*="color" i]').all();
    if (colorButtons.length > 0 && colorButtons.length > 1) {
      await colorButtons[1].click();
      await page.waitForTimeout(2000);
    } else {
      // 直接调用加载函数
      await page.evaluate(() => {
        if (window.loadBackgroundImage) {
          window.loadBackgroundImage('front');
        }
      });
      await page.waitForTimeout(2000);
    }

    console.log('8️⃣  再次验证上传图片是否仍然存在...');
    await page.waitForTimeout(1000);
    
    const canvasObjectsAfterReload = await page.evaluate(() => {
      const canvas = window.fabricCanvas || (window.DesignLabCanvas && window.DesignLabCanvas.getCanvas());
      if (!canvas) return [];
      
      return canvas.getObjects().map((obj) => ({
        name: obj.name || 'unnamed',
        type: obj.type,
        layerType: (obj.data && obj.data.layerType) ? obj.data.layerType : 'unknown',
        visible: obj.visible,
      }));
    });

    console.log('重新加载后的画布对象列表:', JSON.stringify(canvasObjectsAfterReload, null, 2));
    
    const uploadImageStillExists = canvasObjectsAfterReload.some((obj) => 
      obj.layerType === 'upload' || obj.name.startsWith('image_')
    );
    
    const removedObjects = await page.evaluate(() => {
      return window.__uploadTestRemovedObjects || [];
    });

    console.log('移除的对象列表:', JSON.stringify(removedObjects, null, 2));
    
    const uploadImageRemoved = removedObjects.some((obj) => 
      obj.layerType === 'upload' || obj.name.startsWith('image_')
    );

    if (uploadImageRemoved) {
      console.error('❌ 上传图片被移除了！');
      console.error('移除的对象:', removedObjects.filter((obj) => 
        obj.layerType === 'upload' || obj.name.startsWith('image_')
      ));
    }

    if (!uploadImageStillExists) {
      console.error('❌ 上传图片在产品图片重新加载后不存在');
      throw new Error('上传图片被误删');
    }

    if (uploadImageRemoved) {
      console.error('❌ 检测到上传图片被移除的事件');
      throw new Error('上传图片被移除');
    }

    console.log('✅ 上传图片在产品图片重新加载后仍然存在');

    console.log('9️⃣  验证控制台日志...');
    const uploadRemovedWarnings = consoleMessages.filter((msg) =>
      msg.message.includes('Upload image removed') || 
      msg.message.includes('⚠️ Upload image removed') ||
      msg.message.includes('⚠️⚠️⚠️ UPLOAD IMAGE REMOVED')
    );

    if (uploadRemovedWarnings.length > 0) {
      console.warn('⚠️ 检测到上传图片被移除的警告:');
      uploadRemovedWarnings.forEach((msg) => console.warn(`  ${msg.type}: ${msg.message}`));
      throw new Error('检测到上传图片被移除的警告');
    }

    console.log('✅ 没有检测到上传图片被移除的警告');
    console.log('\n✅✅✅ 所有测试通过！上传图片功能正常 ✅✅✅\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n相关的控制台消息:');
    consoleMessages.forEach((msg) => console.log(`  ${msg.type}: ${msg.message}`));
    
    // 保存截图用于调试
    const screenshotPath = path.join(__dirname, '../test-results/upload-test-failure.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n截图已保存: ${screenshotPath}`);
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 运行测试
testDesignLabUpload().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});