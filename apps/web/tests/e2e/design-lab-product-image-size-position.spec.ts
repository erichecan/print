/**
 * Design Lab 底图大小与位置测试
 * [2025-12-19 21:15:00] 验证底图尺寸占比和居中位置
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
} from './fixtures/design-lab-helpers';

test.describe('Design Lab 底图大小与位置', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test('底图应该占据画布80%宽×90%高并居中', async ({ page }) => {
    // [2025-12-19 21:15:00] 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000); // 等待底图加载完成
    
    // [2025-12-19 21:15:00] 通过evaluate获取Fabric canvas中的product-image对象信息
    const productImageInfo = await page.evaluate(() => {
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) return null;
      
      // 通过window对象访问Fabric canvas（如果暴露的话）
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;
      
      // 查找product-image对象
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name.startsWith('product-image-') || layerType === 'product-image';
      });
      
      if (!productImage) return null;
      
      const canvasWidth = fabricCanvas.width || 1000;
      const canvasHeight = fabricCanvas.height || 1200;
      
      // 计算缩放后的实际尺寸
      const scaleX = productImage.scaleX || 1;
      const scaleY = productImage.scaleY || 1;
      const actualWidth = (productImage.width || 0) * scaleX;
      const actualHeight = (productImage.height || 0) * scaleY;
      
      // 计算目标尺寸（80% × 90%）
      const targetWidth = canvasWidth * 0.8;
      const targetHeight = canvasHeight * 0.9;
      
      // 计算居中位置的误差
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const leftDiff = Math.abs((productImage.left || 0) - centerX);
      const topDiff = Math.abs((productImage.top || 0) - centerY);
      
      return {
        found: true,
        canvasWidth,
        canvasHeight,
        productImageWidth: actualWidth,
        productImageHeight: actualHeight,
        productImageLeft: productImage.left,
        productImageTop: productImage.top,
        originX: productImage.originX,
        originY: productImage.originY,
        targetWidth,
        targetHeight,
        centerX,
        centerY,
        leftDiff,
        topDiff,
        // 验证：尺寸应该至少达到目标的某个阈值（cover模式可能略大）
        widthRatio: actualWidth / targetWidth,
        heightRatio: actualHeight / targetHeight,
      };
    });
    
    // [2025-12-19 21:15:00] 验证product-image对象存在
    expect(productImageInfo).toBeTruthy();
    expect(productImageInfo?.found).toBe(true);
    
    if (productImageInfo) {
      // [2025-12-19 21:15:00] 验证居中位置（误差阈值 ≤ 2px）
      expect(productImageInfo.leftDiff).toBeLessThanOrEqual(2);
      expect(productImageInfo.topDiff).toBeLessThanOrEqual(2);
      
      // [2025-12-19 21:15:00] 验证originX和originY是center（用于真正的居中）
      expect(productImageInfo.originX).toBe('center');
      expect(productImageInfo.originY).toBe('center');
      
      // [2025-12-19 21:15:00] 验证尺寸占比（cover模式下，至少一边应该达到或超过目标）
      // 对于cover模式，缩放后的尺寸应该至少有一边达到目标尺寸
      const widthOk = productImageInfo.widthRatio >= 1.0;
      const heightOk = productImageInfo.heightRatio >= 1.0;
      expect(widthOk || heightOk).toBe(true); // 至少一边达到目标
      
      // [2025-12-19 21:15:00] 验证尺寸不会过大（不超过目标太多，例如1.2倍）
      expect(productImageInfo.widthRatio).toBeLessThanOrEqual(1.2);
      expect(productImageInfo.heightRatio).toBeLessThanOrEqual(1.2);
    }
  });

  test('底图应该在最底层，不影响其他图层', async ({ page }) => {
    // [2025-12-19 21:15:00] 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // [2025-12-19 21:15:00] 验证product-image对象不可选中
    const isSelectable = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const name = obj.name || '';
        const layerType = obj.data?.layerType;
        return name.startsWith('product-image-') || layerType === 'product-image';
      });
      
      if (!productImage) return null;
      
      return {
        selectable: productImage.selectable,
        evented: productImage.evented,
        zIndex: productImage.data?.zIndex,
        index: objects.indexOf(productImage),
      };
    });
    
    expect(isSelectable).toBeTruthy();
    expect(isSelectable?.selectable).toBe(false);
    expect(isSelectable?.evented).toBe(false);
    // [2025-12-19 21:15:00] 验证底图在objects数组的第一个位置（最底层）
    expect(isSelectable?.index).toBe(0);
  });
});
