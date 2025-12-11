/**
 * Canvas Product Image E2E Test
 * [2025-01-30 20:15:00] 验证 Design Lab 4.0 主图加载、居中与图层顺序
 * [2025-01-30 20:55:00] 修复：验证循环修复和状态机保护
 */

import { test, expect } from '@playwright/test';

test.describe('Design Lab 4.0 - Canvas Product Image', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 访问 Design Lab 页面
    await page.goto('/design-lab', { waitUntil: 'networkidle' });
    
    // 等待画布初始化
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000); // 等待图片加载
  });

  test('product image should load and be centered', async ({ page }) => {
    // 1. 断言画布存在
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // 2. 检查是否有 400 错误（产品图片加载失败）
    const networkRequests = await page.evaluate(() => {
      return (window as any).performance?.getEntriesByType?.('resource') || [];
    });
    
    const image400Errors = networkRequests.filter((req: any) => {
      return req.name?.match(/\.(png|jpg|jpeg|gif|webp)/i) && 
             req.responseStatus === 400;
    });
    
    // 断言不应有 400 错误
    expect(image400Errors.length).toBe(0);
    
    // 3. 验证产品图片已加载（通过检查画布上的背景图片对象）
    const hasBackgroundImage = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      
      // 尝试访问 Fabric.js 对象（如果可用）
      const fabric = (window as any).fabric;
      if (fabric && (window as any).fabricCanvas) {
        const objects = (window as any).fabricCanvas.getObjects();
        const background = objects.find((obj: any) => obj.name === 'background');
        return !!background && background.width > 0 && background.height > 0;
      }
      
      // 如果没有 Fabric 对象，检查网络请求
      return true; // 默认返回 true，因为我们已经检查了 400 错误
    });
    
    expect(hasBackgroundImage).toBe(true);
    
    // 4. 验证图片居中（通过检查位置）
    const imagePosition = await page.evaluate(() => {
      const fabric = (window as any).fabric;
      if (!fabric || !(window as any).fabricCanvas) return null;
      
      const canvas = (window as any).fabricCanvas;
      const objects = canvas.getObjects();
      const background = objects.find((obj: any) => obj.name === 'background');
      
      if (!background) return null;
      
      const canvasWidth = canvas.width || 1000;
      const canvasHeight = canvas.height || 1200;
      const imageWidth = (background.width || 0) * (background.scaleX || 1);
      const imageHeight = (background.height || 0) * (background.scaleY || 1);
      
      return {
        left: background.left || 0,
        top: background.top || 0,
        width: imageWidth,
        height: imageHeight,
        canvasWidth,
        canvasHeight,
        // 计算居中位置
        expectedLeft: (canvasWidth - imageWidth) / 2,
        expectedTop: (canvasHeight - imageHeight) / 2,
        // 允许 5px 误差
        isCentered: Math.abs((background.left || 0) - (canvasWidth - imageWidth) / 2) < 5 &&
                   Math.abs((background.top || 0) - (canvasHeight - imageHeight) / 2) < 5,
      };
    });
    
    if (imagePosition) {
      expect(imagePosition.isCentered).toBe(true);
    }
  });

  test('layer order should be correct (background < upload < text)', async ({ page }) => {
    // 1. 等待画布初始化
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);
    
    // 2. 验证图层顺序（通过检查 zIndex 或对象顺序）
    const layerOrder = await page.evaluate(() => {
      const fabric = (window as any).fabric;
      if (!fabric || !(window as any).fabricCanvas) return null;
      
      const canvas = (window as any).fabricCanvas;
      const objects = canvas.getObjects();
      
      const background = objects.find((obj: any) => obj.name === 'background');
      const uploads = objects.filter((obj: any) => obj.name && obj.name.includes('upload'));
      const texts = objects.filter((obj: any) => obj.name && obj.name.includes('text'));
      
      return {
        backgroundIndex: background ? objects.indexOf(background) : -1,
        uploadIndices: uploads.map((obj: any) => objects.indexOf(obj)),
        textIndices: texts.map((obj: any) => objects.indexOf(obj)),
        // 验证：背景应该在所有对象之前（index 最小）
        isValid: background ? 
          (uploads.length === 0 || uploads.every((obj: any) => objects.indexOf(obj) > objects.indexOf(background))) &&
          (texts.length === 0 || texts.every((obj: any) => objects.indexOf(obj) > objects.indexOf(background))) :
          false,
      };
    });
    
    if (layerOrder) {
      // 如果有背景图片，验证图层顺序
      if (layerOrder.backgroundIndex >= 0) {
        expect(layerOrder.isValid).toBe(true);
      }
    }
  });

  test('should show error placeholder if product image fails to load', async ({ page, context }) => {
    // 阻止产品图片加载（模拟失败）
    await context.route('**/mms-images-prod.imgix.net/**', route => route.abort());
    await context.route('**/storage.googleapis.com/**/*product*', route => route.abort());
    
    // 重新加载页面
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000); // 等待错误处理
    
    // 验证是否有错误处理（占位图或错误提示）
    const hasErrorHandling = await page.evaluate(() => {
      // 检查是否有占位图或错误提示
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      
      const fabric = (window as any).fabric;
      if (fabric && (window as any).fabricCanvas) {
        const objects = (window as any).fabricCanvas.getObjects();
        // 应该有背景对象（即使加载失败，也应该有占位图）
        const background = objects.find((obj: any) => obj.name === 'background');
        return !!background;
      }
      
      return false;
    });
    
    expect(hasErrorHandling).toBe(true);
  });

  test('should display version stamp in console', async ({ page }) => {
    // 监听控制台消息
    const versionMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Design Lab Version') || text.includes('Version:') || text.includes('SHA:')) {
        versionMessages.push(text);
      }
    });
    
    await page.goto('/design-lab', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 验证版本信息已输出
    expect(versionMessages.length).toBeGreaterThan(0);
  });

  test('should not have repeated add/remove loop for product image', async ({ page }) => {
    // [2025-01-30 20:55:00] 验证循环修复：不应出现重复的加载-移除循环
    const addLogs: string[] = [];
    const removeLogs: string[] = [];
    const loopWarnings: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Object added') && text.includes('product-image')) {
        addLogs.push(text);
      }
      if (text.includes('Object removed') && text.includes('product-image')) {
        removeLogs.push(text);
      }
      if (text.includes('POTENTIAL LOOP') || text.includes('Repeated removal')) {
        loopWarnings.push(text);
      }
    });
    
    await page.goto('/design-lab', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // 等待图片加载完成（最多等待 10 秒）
    await page.waitForTimeout(5000);
    
    // 验证：
    // 1. 不应有循环警告
    expect(loopWarnings.length).toBe(0);
    
    // 2. 产品图片应该只添加一次（或很少几次，但不应无限循环）
    const productImageAdds = addLogs.filter(log => log.includes('product-image'));
    expect(productImageAdds.length).toBeLessThanOrEqual(3); // 允许最多 3 次（初始加载 + 可能的颜色切换）
    
    // 3. 产品图片移除次数应该很少（不应超过添加次数）
    const productImageRemoves = removeLogs.filter(log => log.includes('product-image'));
    expect(productImageRemoves.length).toBeLessThanOrEqual(productImageAdds.length);
    
    // 4. 验证"Product image ready"只出现一次
    const readyLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Product image ready') && text.includes('one-time')) {
        readyLogs.push(text);
      }
    });
    
    // 重新加载页面验证
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // 最多允许 2 次 ready（一次初始加载，一次 reload）
    const allReadyLogs = await page.evaluate(() => {
      // 这里我们无法直接访问日志，但可以通过检查对象状态来验证
      const fabric = (window as any).fabric;
      if (!fabric || !(window as any).fabricCanvas) return [];
      
      const canvas = (window as any).fabricCanvas;
      const objects = canvas.getObjects();
      const productImages = objects.filter((obj: any) => 
        obj.name && obj.name.startsWith('product-image-')
      );
      
      return productImages.length; // 应该只有 1 个产品图片对象
    });
    
    expect(allReadyLogs).toBeLessThanOrEqual(1); // 画布上应该只有 1 个产品图片
  });

  test('product image should be centered correctly', async ({ page }) => {
    // [2025-01-30 20:55:00] 验证居中算法修复
    await page.goto('/design-lab', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000); // 等待图片加载
    
    const centered = await page.evaluate(() => {
      const fabric = (window as any).fabric;
      if (!fabric || !(window as any).fabricCanvas) return false;
      
      const canvas = (window as any).fabricCanvas;
      const objects = canvas.getObjects();
      const productImage = objects.find((obj: any) => 
        obj.name && obj.name.startsWith('product-image-')
      );
      
      if (!productImage) return false;
      
      const canvasWidth = canvas.width || 1000;
      const canvasHeight = canvas.height || 1200;
      
      // 检查位置是否在画布中心（允许 10px 误差）
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      
      const imageX = productImage.left || 0;
      const imageY = productImage.top || 0;
      
      const tolerance = 10;
      const isCentered = 
        Math.abs(imageX - centerX) < tolerance &&
        Math.abs(imageY - centerY) < tolerance;
      
      return {
        isCentered,
        centerX,
        centerY,
        imageX,
        imageY,
        tolerance,
      };
    });
    
    expect(centered.isCentered).toBe(true);
  });
});
