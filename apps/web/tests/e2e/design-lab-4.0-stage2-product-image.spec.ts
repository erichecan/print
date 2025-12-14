/**
 * Design Lab 4.0 阶段2：商品底图居中 cover 验证测试
 * [2025-12-20 00:25:00] 阶段2：验证底图在 Canvas 区域居中且填满（cover）
 */

import { test, expect } from '@playwright/test';

test.describe('Design Lab 4.0 - 阶段2：商品底图居中 cover 验证', () => {
  test.beforeEach(async ({ page }) => {
    // [2025-12-20 00:25:00] 阶段2：导航到 Design Lab 页面
    await page.goto('/design-lab');
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    // 等待 Canvas 初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
  });

  test('阶段2-1：验证底图对象存在', async ({ page }) => {
    // [2025-12-20 00:45:00] 阶段2：验证底图对象已加载
    // 等待足够时间让 Fabric.js 初始化完成
    await page.waitForTimeout(5000);
    
    // 检查 Canvas 元素存在
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // 通过 JavaScript 检查底图对象
    const result = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) return { hasProductImage: false, error: 'Canvas not found' };
      
      // 尝试获取 Fabric Canvas 对象
      let fabricCanvas = null;
      if ((window as any).fabricCanvas) {
        fabricCanvas = (window as any).fabricCanvas;
      } else if ((canvasElement as any).fabricCanvas) {
        fabricCanvas = (canvasElement as any).fabricCanvas;
      } else {
        const allCanvases = document.querySelectorAll('canvas');
        for (let i = 0; i < allCanvases.length; i++) {
          const canvas = allCanvases[i];
          if ((canvas as any).fabricCanvas && (canvas as any).fabricCanvas.getObjects) {
            fabricCanvas = (canvas as any).fabricCanvas;
            break;
          }
        }
      }
      
      if (!fabricCanvas || !fabricCanvas.getObjects) {
        return { hasProductImage: false, error: 'Fabric Canvas not accessible' };
      }
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const layerType = obj.data && obj.data.layerType;
        const name = obj.name || '';
        const stableKey = obj.data && obj.data.stableKey;
        return layerType === 'product-image' || 
               name.indexOf('product-image') >= 0 ||
               (stableKey && stableKey.indexOf('product-image') >= 0);
      });
      
      return { 
        hasProductImage: !!productImage,
        objectCount: objects.length,
      };
    });
    
    expect(result.hasProductImage).toBeTruthy();
  });

  test('阶段2-2：验证底图中心接近画布中心（误差 ≤ 2px）', async ({ page }) => {
    // [2025-12-20 00:45:00] 阶段2：验证底图中心位置
    await page.waitForTimeout(5000); // 等待底图加载完成
    
    const CANVAS_WIDTH = 1000;
    const CANVAS_HEIGHT = 1200;
    const CENTER_X = CANVAS_WIDTH / 2;
    const CENTER_Y = CANVAS_HEIGHT / 2;
    const TOLERANCE = 2; // 允许误差 2px
    
    // 通过 JavaScript 获取底图位置
    const result = await page.evaluate(({ CANVAS_WIDTH, CANVAS_HEIGHT, CENTER_X, CENTER_Y }) => {
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) return { error: 'Canvas not found' };
      
      // 获取 Fabric Canvas 对象
      let fabricCanvas = null;
      if ((window as any).fabricCanvas) {
        fabricCanvas = (window as any).fabricCanvas;
      } else if ((canvasElement as any).fabricCanvas) {
        fabricCanvas = (canvasElement as any).fabricCanvas;
      } else {
        const allCanvases = document.querySelectorAll('canvas');
        for (let i = 0; i < allCanvases.length; i++) {
          const canvas = allCanvases[i];
          if ((canvas as any).fabricCanvas && (canvas as any).fabricCanvas.getObjects) {
            fabricCanvas = (canvas as any).fabricCanvas;
            break;
          }
        }
      }
      
      if (!fabricCanvas || !fabricCanvas.getObjects) {
        return { error: 'Fabric Canvas not accessible' };
      }
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const layerType = obj.data && obj.data.layerType;
        const name = obj.name || '';
        const stableKey = obj.data && obj.data.stableKey;
        return layerType === 'product-image' || 
               name.indexOf('product-image') >= 0 ||
               (stableKey && stableKey.indexOf('product-image') >= 0);
      });
      
      if (!productImage) {
        return { error: 'Product image not found' };
      }
      
      const left = productImage.left || 0;
      const top = productImage.top || 0;
      const originX = productImage.originX || '';
      const originY = productImage.originY || '';
      const leftDiff = Math.abs(left - CENTER_X);
      const topDiff = Math.abs(top - CENTER_Y);
      
      return {
        left,
        top,
        originX,
        originY,
        leftDiff,
        topDiff,
        centerX: CENTER_X,
        centerY: CENTER_Y,
      };
    }, { CANVAS_WIDTH, CANVAS_HEIGHT, CENTER_X, CENTER_Y });
    
    expect(result.error).toBeUndefined();
    expect(result.leftDiff).toBeLessThanOrEqual(TOLERANCE);
    expect(result.topDiff).toBeLessThanOrEqual(TOLERANCE);
    expect(result.originX).toBe('center');
    expect(result.originY).toBe('center');
  });

  test('阶段2-3：验证底图使用 cover 策略（填满 Canvas）', async ({ page }) => {
    // [2025-12-20 00:45:00] 阶段2：验证 cover 策略
    await page.waitForTimeout(5000); // 等待底图加载完成
    
    const CANVAS_WIDTH = 1000;
    const CANVAS_HEIGHT = 1200;
    
    // 通过 JavaScript 获取底图尺寸和缩放
    const result = await page.evaluate(({ CANVAS_WIDTH, CANVAS_HEIGHT }) => {
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) return { error: 'Canvas not found' };
      
      // 获取 Fabric Canvas 对象
      let fabricCanvas = null;
      if ((window as any).fabricCanvas) {
        fabricCanvas = (window as any).fabricCanvas;
      } else if ((canvasElement as any).fabricCanvas) {
        fabricCanvas = (canvasElement as any).fabricCanvas;
      } else {
        const allCanvases = document.querySelectorAll('canvas');
        for (let i = 0; i < allCanvases.length; i++) {
          const canvas = allCanvases[i];
          if ((canvas as any).fabricCanvas && (canvas as any).fabricCanvas.getObjects) {
            fabricCanvas = (canvas as any).fabricCanvas;
            break;
          }
        }
      }
      
      if (!fabricCanvas || !fabricCanvas.getObjects) {
        return { error: 'Fabric Canvas not accessible' };
      }
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const layerType = obj.data && obj.data.layerType;
        const name = obj.name || '';
        const stableKey = obj.data && obj.data.stableKey;
        return layerType === 'product-image' || 
               name.indexOf('product-image') >= 0 ||
               (stableKey && stableKey.indexOf('product-image') >= 0);
      });
      
      if (!productImage) {
        return { error: 'Product image not found' };
      }
      
      const scaleX = productImage.scaleX || 1;
      const scaleY = productImage.scaleY || 1;
      const width = productImage.width || 0;
      const height = productImage.height || 0;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      const widthReachesCanvas = scaledWidth >= CANVAS_WIDTH;
      const heightReachesCanvas = scaledHeight >= CANVAS_HEIGHT;
      
      return {
        scaledWidth,
        scaledHeight,
        widthReachesCanvas,
        heightReachesCanvas,
        isCover: widthReachesCanvas || heightReachesCanvas,
      };
    }, { CANVAS_WIDTH, CANVAS_HEIGHT });
    
    expect(result.error).toBeUndefined();
    expect(result.isCover).toBeTruthy();
  });

  test('阶段2-4：验证底图 origin 为 center', async ({ page }) => {
    // [2025-12-20 00:45:00] 阶段2：验证 origin 设置
    await page.waitForTimeout(5000);
    
    const result = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) return { error: 'Canvas not found' };
      
      // 获取 Fabric Canvas 对象
      let fabricCanvas = null;
      if ((window as any).fabricCanvas) {
        fabricCanvas = (window as any).fabricCanvas;
      } else if ((canvasElement as any).fabricCanvas) {
        fabricCanvas = (canvasElement as any).fabricCanvas;
      } else {
        const allCanvases = document.querySelectorAll('canvas');
        for (let i = 0; i < allCanvases.length; i++) {
          const canvas = allCanvases[i];
          if ((canvas as any).fabricCanvas && (canvas as any).fabricCanvas.getObjects) {
            fabricCanvas = (canvas as any).fabricCanvas;
            break;
          }
        }
      }
      
      if (!fabricCanvas || !fabricCanvas.getObjects) {
        return { error: 'Fabric Canvas not accessible' };
      }
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const layerType = obj.data && obj.data.layerType;
        const name = obj.name || '';
        const stableKey = obj.data && obj.data.stableKey;
        return layerType === 'product-image' || 
               name.indexOf('product-image') >= 0 ||
               (stableKey && stableKey.indexOf('product-image') >= 0);
      });
      
      if (!productImage) {
        return { error: 'Product image not found' };
      }
      
      return {
        originX: productImage.originX || '',
        originY: productImage.originY || '',
      };
    });
    
    expect(result.error).toBeUndefined();
    expect(result.originX).toBe('center');
    expect(result.originY).toBe('center');
  });
});
