/**
 * Design Lab 上传图片功能测试
 * [2025-01-31 19:30:00] 测试上传图片后不会被误删的问题
 * 使用 Playwright + Chrome DevTools Protocol
 */
import { test, expect, chromium } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const DESIGN_LAB_URL = `${FRONTEND_URL}/design-lab`;

test.describe('Design Lab 上传图片测试', () => {
  test('上传图片后应该保留在画布上，不会被误删', async () => {
    // [2025-01-31 19:30:00] 启动浏览器并启用 CDP
    const browser = await chromium.launch({
      headless: false, // 显示浏览器窗口便于调试
      devtools: true, // 打开 DevTools
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // [2025-01-31 19:30:00] 启用 CDP 会话
    const client = await context.newCDPSession(page);
    
    // 启用网络和运行时域
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // [2025-01-31 19:30:00] 监听控制台消息（特别是 [DesignLab] 前缀的日志）
    const consoleMessages: Array<{ type: string; message: string; timestamp: number }> = [];
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
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
        console.log(message); // 输出到测试日志
      }
    });

    // [2025-01-31 19:30:00] 监听对象移除事件
    const objectRemovedEvents: Array<{ name: string; layerType: string; timestamp: number }> = [];
    
    // 通过页面注入监听器
    await page.addInitScript(() => {
      (window as any).__uploadTestRemovedObjects = [];
      
      // 这个会在页面加载后通过 evaluate 设置
    });

    try {
      console.log('1️⃣  访问 Design Lab 页面...');
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // 等待页面初始化

      console.log('2️⃣  等待画布初始化...');
      // 等待画布初始化完成的信号
      await page.waitForFunction(() => {
        return (window as any).fabricCanvas || document.querySelector('canvas');
      }, { timeout: 10000 });

      console.log('3️⃣  注入 Fabric.js 事件监听器...');
      // 注入监听器来追踪对象移除
      await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
        if (canvas) {
          canvas.on('object:removed', (e: any) => {
            const obj = e.target;
            const objName = (obj as any)?.name || 'unnamed';
            const objLayerType = (obj as any)?.data?.layerType || 'unknown';
            
            if (!(window as any).__uploadTestRemovedObjects) {
              (window as any).__uploadTestRemovedObjects = [];
            }
            (window as any).__uploadTestRemovedObjects.push({
              name: objName,
              layerType: objLayerType,
              timestamp: Date.now(),
            });
          });
        }
      });

      console.log('4️⃣  查找上传按钮并上传图片...');
      // 查找上传按钮（可能是 Upload 工具或文件输入）
      const uploadButton = page.locator('button:has-text("Upload"), button[data-tool="upload"], input[type="file"]').first();
      
      if (await uploadButton.getAttribute('type') === 'file') {
        // 如果是文件输入，直接上传
        const testImagePath = require('path').join(__dirname, '../fixtures/test-image.png');
        // 如果测试图片不存在，创建一个简单的占位
        await uploadButton.setInputFiles(testImagePath).catch(async () => {
          // 如果没有测试图片，通过点击按钮触发文件选择
          await uploadButton.click();
        });
      } else {
        // 点击上传按钮
        await uploadButton.click();
        await page.waitForTimeout(500);
        
        // 如果有文件输入出现，上传文件
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          const testImagePath = require('path').join(__dirname, '../fixtures/test-image.png');
          await fileInput.setInputFiles(testImagePath).catch(() => {
            // 忽略错误，继续测试
          });
        }
      }

      console.log('5️⃣  等待图片上传完成...');
      await page.waitForTimeout(3000); // 等待图片加载和添加到画布

      console.log('6️⃣  验证上传图片是否在画布上...');
      // 检查画布上的对象
      const canvasObjects = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
        if (!canvas) return [];
        
        return canvas.getObjects().map((obj: any) => ({
          name: obj.name || 'unnamed',
          type: obj.type,
          layerType: obj.data?.layerType || 'unknown',
          visible: obj.visible,
        }));
      });

      console.log('画布对象列表:', canvasObjects);
      
      // 验证上传图片存在
      const uploadImageExists = canvasObjects.some((obj: any) => 
        obj.layerType === 'upload' || obj.name.startsWith('image_')
      );
      
      expect(uploadImageExists).toBe(true);
      console.log('✅ 上传图片存在于画布上');

      console.log('7️⃣  触发产品图片加载（模拟切换颜色）...');
      // 如果页面有颜色选择器，切换颜色来触发产品图片重新加载
      const colorButton = page.locator('button:has-text("Color"), [data-color]').first();
      if (await colorButton.count() > 0) {
        await colorButton.click();
        await page.waitForTimeout(2000); // 等待产品图片加载
      }

      console.log('8️⃣  再次验证上传图片是否仍然存在...');
      await page.waitForTimeout(1000);
      
      const canvasObjectsAfterReload = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
        if (!canvas) return [];
        
        return canvas.getObjects().map((obj: any) => ({
          name: obj.name || 'unnamed',
          type: obj.type,
          layerType: obj.data?.layerType || 'unknown',
          visible: obj.visible,
        }));
      });

      console.log('重新加载后的画布对象列表:', canvasObjectsAfterReload);
      
      // 验证上传图片仍然存在
      const uploadImageStillExists = canvasObjectsAfterReload.some((obj: any) => 
        obj.layerType === 'upload' || obj.name.startsWith('image_')
      );
      
      // 获取移除的对象列表
      const removedObjects = await page.evaluate(() => {
        return (window as any).__uploadTestRemovedObjects || [];
      });

      console.log('移除的对象列表:', removedObjects);
      
      // 检查是否有上传图片被移除
      const uploadImageRemoved = removedObjects.some((obj: any) => 
        obj.layerType === 'upload' || obj.name.startsWith('image_')
      );

      if (uploadImageRemoved) {
        console.error('❌ 上传图片被移除了！');
        console.error('移除的对象:', removedObjects.filter((obj: any) => 
          obj.layerType === 'upload' || obj.name.startsWith('image_')
        ));
      }

      expect(uploadImageStillExists).toBe(true);
      expect(uploadImageRemoved).toBe(false);
      console.log('✅ 上传图片在产品图片重新加载后仍然存在');

      console.log('9️⃣  验证控制台日志...');
      // 检查是否有上传图片被移除的警告
      const uploadRemovedWarnings = consoleMessages.filter((msg) =>
        msg.message.includes('Upload image removed') || 
        msg.message.includes('⚠️ Upload image removed')
      );

      if (uploadRemovedWarnings.length > 0) {
        console.warn('⚠️ 检测到上传图片被移除的警告:', uploadRemovedWarnings);
      }

      expect(uploadRemovedWarnings.length).toBe(0);
      console.log('✅ 没有检测到上传图片被移除的警告');

    } catch (error) {
      console.error('测试失败:', error);
      
      // 输出相关日志用于调试
      console.log('相关的控制台消息:');
      consoleMessages.forEach(msg => console.log(`  ${msg.type}: ${msg.message}`));
      
      throw error;
    } finally {
      await browser.close();
    }
  });
});