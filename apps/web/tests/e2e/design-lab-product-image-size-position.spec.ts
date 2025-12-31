/**
 * Design Lab 底图大小与位置测试
* 验证底图严格居中（left/top等于画布中心，误差≤2px）
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

  test('底图应该严格居中（left/top等于画布中心，误差≤2px）', async ({ page }) => {
// 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000); // 等待底图加载完成
    
// 通过evaluate获取Fabric canvas中的product-image对象信息
    const productImageInfo = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;
      
      // 查找product-image对象
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const name = obj.name || '';
        return name.startsWith('product-image-');
      });
      
      if (!productImage) return null;
      
// 获取画布逻辑尺寸（考虑viewportTransform）
      const vpt = fabricCanvas.viewportTransform;
      let logicalCanvasWidth = fabricCanvas.width || 1000;
      let logicalCanvasHeight = fabricCanvas.height || 1200;
      
      if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
        // 存在viewportTransform，使用逻辑尺寸
        logicalCanvasWidth = (fabricCanvas.width || 1000) / vpt[0];
        logicalCanvasHeight = (fabricCanvas.height || 1200) / vpt[3];
      }
      
      // 计算画布逻辑中心
      const centerX = logicalCanvasWidth / 2;
      const centerY = logicalCanvasHeight / 2;
      
      // 计算居中位置的误差
      const leftDiff = Math.abs((productImage.left || 0) - centerX);
      const topDiff = Math.abs((productImage.top || 0) - centerY);
      
      return {
        found: true,
        logicalCanvasWidth,
        logicalCanvasHeight,
        productImageLeft: productImage.left,
        productImageTop: productImage.top,
        originX: productImage.originX,
        originY: productImage.originY,
        centerX,
        centerY,
        leftDiff,
        topDiff,
        viewportTransform: vpt,
      };
    });
    
// 验证product-image对象存在
    expect(productImageInfo).toBeTruthy();
    expect(productImageInfo?.found).toBe(true);
    
    if (productImageInfo) {
// 验证居中位置（误差阈值 ≤ 2px）- 这是最关键的测试
      expect(productImageInfo.leftDiff, `left应该等于${productImageInfo.centerX}，实际是${productImageInfo.productImageLeft}，误差${productImageInfo.leftDiff}`).toBeLessThanOrEqual(2);
      expect(productImageInfo.topDiff, `top应该等于${productImageInfo.centerY}，实际是${productImageInfo.productImageTop}，误差${productImageInfo.topDiff}`).toBeLessThanOrEqual(2);
      
// 验证originX和originY是center（用于真正的居中）
      expect(productImageInfo.originX, 'originX应该是center').toBe('center');
      expect(productImageInfo.originY, 'originY应该是center').toBe('center');
    }
  });

  test('切换视图后底图仍应居中', async ({ page }) => {
// 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
// 验证初始视图（front）的居中
    const checkCentered = async (viewName: string) => {
      const info = await page.evaluate((view) => {
        const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
        if (!fabricCanvas) return null;
        
        const objects = fabricCanvas.getObjects();
        const productImage = objects.find((obj: any) => {
          const name = obj.name || '';
          return name.startsWith('product-image-');
        });
        
        if (!productImage) return null;
        
        const vpt = fabricCanvas.viewportTransform;
        let logicalCanvasWidth = fabricCanvas.width || 1000;
        let logicalCanvasHeight = fabricCanvas.height || 1200;
        
        if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
          logicalCanvasWidth = (fabricCanvas.width || 1000) / vpt[0];
          logicalCanvasHeight = (fabricCanvas.height || 1200) / vpt[3];
        }
        
        const centerX = logicalCanvasWidth / 2;
        const centerY = logicalCanvasHeight / 2;
        const leftDiff = Math.abs((productImage.left || 0) - centerX);
        const topDiff = Math.abs((productImage.top || 0) - centerY);
        
        return {
          view,
          centerX,
          centerY,
          left: productImage.left,
          top: productImage.top,
          leftDiff,
          topDiff,
          originX: productImage.originX,
          originY: productImage.originY,
        };
      }, viewName);
      
      expect(info).toBeTruthy();
      expect(info?.leftDiff).toBeLessThanOrEqual(2);
      expect(info?.topDiff).toBeLessThanOrEqual(2);
      expect(info?.originX).toBe('center');
      expect(info?.originY).toBe('center');
      
      return info;
    };
    
    await checkCentered('front');
    
// 切换到back视图
    const backButton = page.locator('button[aria-label*="Back" i], .dl-sidebar__btn:has-text("Back")').first();
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(2000); // 等待视图切换和底图加载
      await checkCentered('back');
      
// 切换回front视图
      const frontButton = page.locator('button[aria-label*="Front" i], .dl-sidebar__btn:has-text("Front")').first();
      if (await frontButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frontButton.click();
        await page.waitForTimeout(2000);
        await checkCentered('front-after-switch');
      }
    }
  });

  test('底图尺寸应该达到90%×90%目标占比（CustomInk风格：铺满画布主要区域）', async ({ page }) => {
// 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const productImageInfo = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const name = obj.name || '';
        return name.startsWith('product-image-');
      });
      
      if (!productImage) return null;
      
      const vpt = fabricCanvas.viewportTransform;
      let logicalCanvasWidth = fabricCanvas.width || 1000;
      let logicalCanvasHeight = fabricCanvas.height || 1200;
      
      if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
        logicalCanvasWidth = (fabricCanvas.width || 1000) / vpt[0];
        logicalCanvasHeight = (fabricCanvas.height || 1200) / vpt[3];
      }
      
      const scaleX = productImage.scaleX || 1;
      const scaleY = productImage.scaleY || 1;
      const actualWidth = (productImage.width || 0) * scaleX;
      const actualHeight = (productImage.height || 0) * scaleY;
      
const targetWidth = logicalCanvasWidth * 0.9; // 更新为90%
const targetHeight = logicalCanvasHeight * 0.9; // 保持90%
      
      return {
        found: true,
        logicalCanvasWidth,
        logicalCanvasHeight,
        productImageWidth: actualWidth,
        productImageHeight: actualHeight,
        targetWidth,
        targetHeight,
        widthRatio: actualWidth / targetWidth,
        heightRatio: actualHeight / targetHeight,
      };
    });
    
    expect(productImageInfo).toBeTruthy();
    expect(productImageInfo?.found).toBe(true);
    
    if (productImageInfo) {
// cover模式：至少一边应该达到或超过目标（90%）
      const widthOk = productImageInfo.widthRatio >= 1.0;
      const heightOk = productImageInfo.heightRatio >= 1.0;
      expect(widthOk || heightOk, 'cover模式：至少一边应该达到目标尺寸（90%）').toBe(true);
      
// 验证尺寸应该接近90%（cover模式下，至少有一边达到或超过90%）
      const isWidthNear90 = productImageInfo.widthRatio >= 0.95 && productImageInfo.widthRatio <= 1.05;
      const isHeightNear90 = productImageInfo.heightRatio >= 0.95 && productImageInfo.heightRatio <= 1.05;
      expect(isWidthNear90 || isHeightNear90, 'cover模式：至少一边应该接近90%目标尺寸').toBe(true);
      
// 尺寸不应该过大（不超过1.2倍）
      expect(productImageInfo.widthRatio).toBeLessThanOrEqual(1.2);
      expect(productImageInfo.heightRatio).toBeLessThanOrEqual(1.2);
    }
  });

  test('底图应该在最底层，不影响其他图层', async ({ page }) => {
// 等待canvas初始化
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
// 验证product-image对象不可选中
    const isSelectable = await page.evaluate(() => {
      const fabricCanvas = (window as any).fabricCanvas || (window as any).DesignLabCanvas?.getCanvas();
      if (!fabricCanvas) return null;
      
      const objects = fabricCanvas.getObjects();
      const productImage = objects.find((obj: any) => {
        const name = obj.name || '';
        return name.startsWith('product-image-');
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
// 验证底图在objects数组的第一个位置（最底层）
    expect(isSelectable?.index).toBe(0);
  });
});
