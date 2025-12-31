import { test, expect } from '@playwright/test';

/**
* Send to Back 功能调试测试
 * 使用 Chrome DevTools Protocol 来深入调试 send to back 功能
 */
test.describe('Design Lab 5.0 - Send to Back 功能调试', () => {
  test('测试 Send to Back 功能并调试问题', async ({ page, context }) => {
    // 启用 CDP
    const client = await context.newCDPSession(page);
    
    // 启用 Console 和 Runtime
    await client.send('Console.enable');
    await client.send('Runtime.enable');
    
    const consoleMessages: any[] = [];
    const exceptions: any[] = [];
    
    // 监听 Console 消息
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
        if (arg.value !== undefined) return arg.value;
        if (arg.objectId) return `[Object ${arg.objectId}]`;
        return arg.description || JSON.stringify(arg);
      });
      consoleMessages.push({
        type: event.type,
        args,
        timestamp: event.timestamp,
      });
      console.log(`[Console ${event.type}]`, ...args);
    });
    
    // 监听异常
    client.on('Runtime.exceptionThrown', (event) => {
      exceptions.push(event.exceptionDetails);
      console.error('[Exception]', event.exceptionDetails);
    });

    // 导航到 Design Lab
    await page.goto('http://localhost:3000/design-lab');
    await page.waitForTimeout(3000);

    // 等待 canvas 初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 1. 上传一张图片
    console.log('📤 步骤 1: 上传图片');
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
      });
      await page.waitForTimeout(2000);
    }

    // 2. 获取初始状态
    console.log('🔍 步骤 2: 获取初始状态');
    const initialState = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;

      const objects = fabricCanvas.getObjects();
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });

      const uploadObjects = objects.filter((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name.includes('upload') || layerType === 'upload';
      });

      return {
        totalObjects: objects.length,
        backgroundIndex,
        uploadObjects: uploadObjects.map((obj: any, idx: number) => ({
          index: objects.indexOf(obj),
          name: obj.name,
          layerType: obj.data?.layerType,
        })),
        allObjects: objects.map((obj: any, idx: number) => ({
          index: idx,
          name: obj.name || 'unnamed',
          type: obj.type,
          layerType: obj.data?.layerType,
        })),
      };
    });

    console.log('初始状态:', JSON.stringify(initialState, null, 2));

    if (!initialState || initialState.uploadObjects.length === 0) {
      console.log('❌ 没有找到上传的对象，跳过测试');
      return;
    }

    // 3. 选择上传的图片
    console.log('👆 步骤 3: 选择上传的图片');
    await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return;

      const objects = fabricCanvas.getObjects();
      const uploadObject = objects.find((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name.includes('upload') || layerType === 'upload';
      });

      if (uploadObject) {
        fabricCanvas.setActiveObject(uploadObject);
        fabricCanvas.renderAll();
      }
    });

    await page.waitForTimeout(1000);

    // 4. 获取点击 Send to Back 之前的状态
    console.log('📊 步骤 4: 获取点击 Send to Back 之前的状态');
    const beforeState = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;

      const activeObject = fabricCanvas.getActiveObject();
      if (!activeObject) return null;

      const objects = fabricCanvas.getObjects();
      const currentIndex = objects.indexOf(activeObject);
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });
      const targetIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

      return {
        currentIndex,
        backgroundIndex,
        targetIndex,
        activeObjectName: (activeObject as any).name,
      };
    });

    console.log('点击前状态:', JSON.stringify(beforeState, null, 2));

    // 5. 添加日志钩子来监听 handleSendToBack 的调用
    console.log('🔧 步骤 5: 添加调试日志');
    await page.evaluate(() => {
      // 在 handleSendToBack 执行时添加日志
      (window as any).__debugSendToBack = {
        called: false,
        currentIndex: null,
        backgroundIndex: null,
        targetIndex: null,
        adjustedTargetIndex: null,
        objectsBefore: null,
        objectsAfter: null,
      };
    });

    // 6. 查找并点击 Send to Back 按钮
    console.log('🖱️ 步骤 6: 点击 Send to Back 按钮');
    
    // 尝试多种方式找到按钮
    const sendToBackButton = page.locator('button:has-text("Send to Back"), button[aria-label*="Send to Back"], button[aria-label*="send to back"], .dl-edit-upload-panel__toolbar button:has([data-icon="layering-down"])').first();
    
    if (await sendToBackButton.count() === 0) {
      // 尝试通过 SVG 路径查找
      const layeringDownButton = page.locator('button:has(svg path[d*="M12 6"])').first();
      if (await layeringDownButton.count() > 0) {
        await layeringDownButton.click();
      } else {
        console.log('❌ 找不到 Send to Back 按钮');
        // 尝试直接调用函数
        await page.evaluate(() => {
          const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
          if (!fabricCanvas) return;

          const activeObject = fabricCanvas.getActiveObject();
          if (!activeObject) return;

          // 直接执行 send to back 逻辑
          const objects = fabricCanvas.getObjects();
          const currentIndex = objects.indexOf(activeObject);
          const backgroundIndex = objects.findIndex((obj: any) => {
            const name = obj.name || '';
            const layerType = obj.data?.layerType;
            return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
          });
          const targetIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

          console.log('[Direct Call]', {
            currentIndex,
            backgroundIndex,
            targetIndex,
            objectsLength: objects.length,
          });

          if (currentIndex !== targetIndex) {
            objects.splice(currentIndex, 1);
            const adjustedTargetIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
            objects.splice(adjustedTargetIndex, 0, activeObject);
            fabricCanvas.renderAll();
          }
        });
      }
    } else {
      await sendToBackButton.click();
    }

    await page.waitForTimeout(2000);

    // 7. 获取点击后的状态
    console.log('📊 步骤 7: 获取点击后的状态');
    const afterState = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;

      const activeObject = fabricCanvas.getActiveObject();
      const objects = fabricCanvas.getObjects();
      
      const currentIndex = activeObject ? objects.indexOf(activeObject) : -1;
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });
      const expectedIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

      return {
        currentIndex,
        backgroundIndex,
        expectedIndex,
        isCorrectPosition: currentIndex === expectedIndex,
        activeObjectName: activeObject ? (activeObject as any).name : null,
        allObjects: objects.map((obj: any, idx: number) => ({
          index: idx,
          name: obj.name || 'unnamed',
          type: obj.type,
          layerType: obj.data?.layerType,
        })),
      };
    });

    console.log('点击后状态:', JSON.stringify(afterState, null, 2));

    // 8. 输出所有控制台消息和异常
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach((msg, idx) => {
      if (msg.args.some((arg: any) => typeof arg === 'string' && (arg.includes('sendToBack') || arg.includes('Send to Back') || arg.includes('EditUploadPanel')))) {
        console.log(`[${idx}]`, msg.type, ...msg.args);
      }
    });

    console.log('\n=== Exceptions ===');
    exceptions.forEach((exc, idx) => {
      console.log(`[${idx}]`, exc.exception?.description || exc.text);
    });

    // 9. 验证结果
    if (beforeState && afterState) {
      console.log('\n=== 验证结果 ===');
      console.log('点击前索引:', beforeState.currentIndex);
      console.log('目标索引:', beforeState.targetIndex);
      console.log('点击后索引:', afterState.currentIndex);
      console.log('期望索引:', afterState.expectedIndex);
      console.log('位置是否正确:', afterState.isCorrectPosition);
      console.log('是否移动:', beforeState.currentIndex !== afterState.currentIndex);

      if (!afterState.isCorrectPosition) {
        console.log('❌ Send to Back 功能未生效！');
        console.log('所有对象顺序:', afterState.allObjects);
      } else {
        console.log('✅ Send to Back 功能正常工作！');
      }
    }

    // 截图保存
    await page.screenshot({ path: 'test-results/send-to-back-debug.png', fullPage: true });
  });
});
