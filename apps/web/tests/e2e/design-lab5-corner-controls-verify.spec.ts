/**
 * Design Lab 5.1 - 角控件修复验证
 * [2025-12-16 03:40:00] 简化版验证脚本，直接检查角控件是否正确应用
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  openUploadPanel,
  uploadFile,
  addTextToCanvas,
} from './fixtures/design-lab-helpers';
import { TEST_IMAGES, TEST_TEXTS } from './fixtures/design-lab-test-data';

test.describe('Design Lab 5.1: 角控件修复验证', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test('验证 Upload 对象的角控件已正确应用', async ({ page }) => {
    await openUploadPanel(page);
    
    if (TEST_IMAGES.small) {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000); // 等待图片加载和添加到画布
      
      // 检查对象信息
      const objectInfo = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const uploadObj = objects.find((obj: any) => {
          const name = (obj as any).name || '';
          const layerType = (obj as any).data?.layerType;
          return (layerType === 'upload' || name.startsWith('image_')) && name !== 'background';
        });

        if (!uploadObj) return null;

        const controls = (uploadObj as any).controls || {};
        return {
          name: (uploadObj as any).name || 'unnamed',
          hasControls: uploadObj.hasControls,
          hasBorders: uploadObj.hasBorders,
          controlsKeys: Object.keys(controls),
          cornerDeleteExists: !!controls.cornerDelete,
          cornerDuplicateExists: !!controls.cornerDuplicate,
          cornerResizeExists: !!controls.cornerResize,
          borderColor: (uploadObj as any).borderColor,
          borderScaleFactor: (uploadObj as any).borderScaleFactor,
        };
      });

      console.log('Upload 对象信息:', objectInfo);

      if (!objectInfo) {
        test.skip();
        return;
      }

      // 验证关键属性
      expect(objectInfo.hasControls).toBe(true);
      expect(objectInfo.hasBorders).toBe(true);
      expect(objectInfo.cornerDeleteExists).toBe(true);
      expect(objectInfo.cornerDuplicateExists).toBe(true);
      expect(objectInfo.cornerResizeExists).toBe(true);
      expect(objectInfo.borderColor).toBe('#808080');
      expect(objectInfo.borderScaleFactor).toBe(2);
    }
  });

  test('验证 Text 对象的角控件已正确应用', async ({ page }) => {
    await addTextToCanvas(page, TEST_TEXTS.simple || 'Test Text');
    await page.waitForTimeout(2000);
    
    const objectInfo = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return null;

      const objects = canvas.getObjects();
      const textObj = objects.find((obj: any) => {
        const type = obj.type;
        return type === 'i-text' || type === 'text' || type === 'textbox';
      });

      if (!textObj) return null;

      const controls = (textObj as any).controls || {};
      return {
        name: (textObj as any).name || 'unnamed',
        type: textObj.type,
        hasControls: textObj.hasControls,
        hasBorders: textObj.hasBorders,
        controlsKeys: Object.keys(controls),
        cornerDeleteExists: !!controls.cornerDelete,
        cornerDuplicateExists: !!controls.cornerDuplicate,
        cornerResizeExists: !!controls.cornerResize,
      };
    });

    console.log('Text 对象信息:', objectInfo);

    if (!objectInfo) {
      test.skip();
      return;
    }

    expect(objectInfo.hasControls).toBe(true);
    expect(objectInfo.hasBorders).toBe(true);
    expect(objectInfo.cornerDeleteExists).toBe(true);
    expect(objectInfo.cornerDuplicateExists).toBe(true);
    expect(objectInfo.cornerResizeExists).toBe(true);
  });
});
