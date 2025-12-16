/**
 * Design Lab 5.0 - Add Text 功能闭环测试
 * [2025-12-16 07:10:00] 验证 Add Text：创建文本对象、进入 Edit Text、角控件可用、send to back 不会到商品底图下面
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  addTextToCanvas,
} from './fixtures/design-lab-helpers';

test.describe('Design Lab 5.0: Add Text', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test('添加文字后：应创建文本对象并带角控件', async ({ page }) => {
    await addTextToCanvas(page, 'Hello');

    // 确认进入 Edit Text（5.0 里由客户端切换标题）
    const editTitle = page.locator('.dl-tool-panel__title:has-text("Edit Text")').first();
    await expect(editTitle).toBeVisible({ timeout: 5000 });

    const textObjectInfo = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return null;

      const activeObj = canvas.getActiveObject();
      if (!activeObj) return null;

      const controls = (activeObj as any).controls || {};
      const hasCornerControls = !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
      const hasIconControls = !!(controls.deleteIcon || controls.duplicateIcon || controls.resizeIcon);

      return {
        type: activeObj.type,
        name: (activeObj as any).name || 'unnamed',
        text: (activeObj as any).text || '',
        hasControls: activeObj.hasControls,
        hasBorders: activeObj.hasBorders,
        hasCornerControls,
        hasIconControls,
        controlsKeys: Object.keys(controls),
      };
    });

    expect(textObjectInfo).not.toBeNull();
    expect(textObjectInfo!.type === 'i-text' || textObjectInfo!.type === 'textbox' || textObjectInfo!.type === 'text').toBe(true);
    expect(textObjectInfo!.name.startsWith('text_')).toBe(true);
    expect(textObjectInfo!.hasControls).toBe(true);
    expect(textObjectInfo!.hasBorders).toBe(true);
    expect(textObjectInfo!.hasCornerControls || textObjectInfo!.hasIconControls).toBe(true);
  });

  test('Edit Text 的 Duplicate：复制对象应继续带角控件', async ({ page }) => {
    await addTextToCanvas(page, 'Hello');

    // 点击 Edit Text 工具栏 Duplicate
    const duplicateButton = page.locator('button[aria-label="Duplicate"], button[title="Duplicate"]').first();
    await expect(duplicateButton).toBeVisible({ timeout: 5000 });
    await duplicateButton.click();

    await page.waitForTimeout(1200);

    const clonedInfo = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return null;

      const activeObj = canvas.getActiveObject();
      if (!activeObj) return null;

      const controls = (activeObj as any).controls || {};
      const hasCornerControls = !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
      const hasIconControls = !!(controls.deleteIcon || controls.duplicateIcon || controls.resizeIcon);

      return {
        type: activeObj.type,
        name: (activeObj as any).name || 'unnamed',
        hasControls: activeObj.hasControls,
        hasBorders: activeObj.hasBorders,
        hasCornerControls,
        hasIconControls,
        objectsCount: canvas.getObjects().length,
      };
    });

    expect(clonedInfo).not.toBeNull();
    expect(clonedInfo!.objectsCount).toBeGreaterThan(1);
    expect(clonedInfo!.name.startsWith('text_')).toBe(true);
    expect(clonedInfo!.hasCornerControls || clonedInfo!.hasIconControls).toBe(true);
  });

  test('Send to Back：文本应始终在商品底图之上', async ({ page }) => {
    await addTextToCanvas(page, 'Hello');

    // 点击 Send to Back
    const sendToBackButton = page.locator('button[aria-label="Send to Back"], button[title="Send to Back"]').first();
    await expect(sendToBackButton).toBeVisible({ timeout: 5000 });
    await sendToBackButton.click();

    await page.waitForTimeout(800);

    const orderInfo = await page.evaluate(() => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return null;

      const objects = canvas.getObjects();
      const activeObj = canvas.getActiveObject();
      if (!activeObj) return null;

      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return (
          name === 'background' ||
          name === 'product-image-base' ||
          name.startsWith('product-image-') ||
          layerType === 'product' ||
          layerType === 'product-image'
        );
      });

      const activeIndex = objects.indexOf(activeObj);
      return {
        backgroundIndex,
        activeIndex,
        isAboveBackground: backgroundIndex < 0 ? true : activeIndex > backgroundIndex,
        objects: objects.map((o: any, i: number) => ({
          i,
          name: (o as any).name || 'unnamed',
          type: o.type,
          layerType: (o as any).data?.layerType,
        })),
      };
    });

    expect(orderInfo).not.toBeNull();
    expect(orderInfo!.isAboveBackground).toBe(true);
  });
});
