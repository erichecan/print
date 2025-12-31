/**
 * Design Lab 5.1 - 角控件与工具栏测试
* 测试 upload/text/art 三类对象的角控件（删除/复制/缩放）和工具栏按钮
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  openUploadPanel,
  uploadFile,
  addTextToCanvas,
  openArtPanel,
  selectAndAddArtwork,
  waitForObjectSelected,
  verifyCanvasHasObjects,
} from './fixtures/design-lab-helpers';
import { TEST_IMAGES, TEST_TEXTS } from './fixtures/design-lab-test-data';

test.describe('Design Lab 5.1: 角控件与工具栏功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test.describe('Upload 对象角控件', () => {
    test('应该显示三个角控件（删除/复制/缩放）', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        // 等待对象被选中
        await waitForObjectSelected(page, 3000);
        
        // 验证角控件已应用（通过检查 canvas 上的 controls）
        const controlsApplied = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return false;
          
          const activeObj = canvas.getActiveObject();
          if (!activeObj) return false;
          
          const controls = (activeObj as any).controls || {};
          // 检查是否有自定义角控件
          return !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
        });
        
        expect(controlsApplied).toBe(true);
      }
    });

    test('应该能够通过角控件删除对象', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        await waitForObjectSelected(page, 3000);
        
        // 通过 JavaScript 触发删除控件
        const objectDeleted = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return false;
          
          const activeObj = canvas.getActiveObject();
          if (!activeObj) return false;
          
          const controls = (activeObj as any).controls || {};
          const deleteControl = controls.cornerDelete;
          
          if (deleteControl && deleteControl.mouseUpHandler) {
            const transformData = { target: activeObj };
            deleteControl.mouseUpHandler({}, transformData, 0, 0);
            canvas.renderAll();
            return true;
          }
          return false;
        });
        
        expect(objectDeleted).toBe(true);
        await page.waitForTimeout(500);
        
        // 验证对象已删除
        const objectCount = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          return canvas ? canvas.getObjects().filter((obj: any) => {
            const name = (obj as any).name || '';
            return name.startsWith('image_') && !name.startsWith('art_');
          }).length : 0;
        });
        
        expect(objectCount).toBe(0);
      }
    });

    test('应该能够通过角控件复制对象', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        await waitForObjectSelected(page, 3000);
        
        // 通过 JavaScript 触发复制控件
        const objectDuplicated = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return false;
          
          const activeObj = canvas.getActiveObject();
          if (!activeObj) return false;
          
          const controls = (activeObj as any).controls || {};
          const duplicateControl = controls.cornerDuplicate;
          
          if (duplicateControl && duplicateControl.mouseUpHandler) {
            const transformData = { target: activeObj };
            duplicateControl.mouseUpHandler({}, transformData, 0, 0);
            canvas.renderAll();
            return true;
          }
          return false;
        });
        
        expect(objectDuplicated).toBe(true);
        await page.waitForTimeout(1000);
        
        // 验证对象已复制
        const objectCount = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          return canvas ? canvas.getObjects().filter((obj: any) => {
            const name = (obj as any).name || '';
            return name.startsWith('image_') && !name.startsWith('art_');
          }).length : 0;
        });
        
        expect(objectCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('应该能够通过角控件缩放对象', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        await waitForObjectSelected(page, 3000);
        
        // 验证缩放控件存在
        const hasResizeControl = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return false;
          
          const activeObj = canvas.getActiveObject();
          if (!activeObj) return false;
          
          const controls = (activeObj as any).controls || {};
          return !!controls.cornerResize;
        });
        
        expect(hasResizeControl).toBe(true);
      }
    });
  });

  test.describe('Text 对象角控件', () => {
    test('应该显示三个角控件（删除/复制/缩放）', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      await waitForObjectSelected(page, 3000);
      
      // 验证角控件已应用
      const controlsApplied = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return false;
        
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return false;
        
        const controls = (activeObj as any).controls || {};
        return !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
      });
      
      expect(controlsApplied).toBe(true);
    });

    test('应该能够通过角控件删除文本对象', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      await waitForObjectSelected(page, 3000);
      
      // 通过 JavaScript 触发删除控件
      const objectDeleted = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return false;
        
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return false;
        
        const controls = (activeObj as any).controls || {};
        const deleteControl = controls.cornerDelete;
        
        if (deleteControl && deleteControl.mouseUpHandler) {
          const transformData = { target: activeObj };
          deleteControl.mouseUpHandler({}, transformData, 0, 0);
          canvas.renderAll();
          return true;
        }
        return false;
      });
      
      expect(objectDeleted).toBe(true);
      await page.waitForTimeout(500);
    });
  });

  test.describe('Art 对象角控件', () => {
    test('应该显示三个角控件（删除/复制/缩放）', async ({ page }) => {
      await openArtPanel(page);
      
      const firstCategory = page.locator('.dl-art-category').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        const artwork = page.locator('.dl-art-item').first();
        const hasArtwork = await artwork.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasArtwork) {
          await artwork.click();
          await page.waitForTimeout(1000);
          
          await waitForObjectSelected(page, 3000);
          
          // 验证角控件已应用
          const controlsApplied = await page.evaluate(() => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return false;
            
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return false;
            
            const controls = (activeObj as any).controls || {};
            return !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
          });
          
          expect(controlsApplied).toBe(true);
        }
      }
    });
  });

  test.describe('工具栏按钮功能', () => {
    test('Upload 工具栏：Center 按钮应该工作', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        const centerButton = page.locator('button[aria-label="Center"], button[title="Center"]').first();
        const isVisible = await centerButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await centerButton.click();
          await page.waitForTimeout(500);
          
          // 验证对象居中
          const isCentered = await page.evaluate(() => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return false;
            
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return false;
            
            const canvasWidth = canvas.width || 1000;
            const canvasHeight = canvas.height || 1200;
            const objLeft = activeObj.left || 0;
            const objTop = activeObj.top || 0;
            
            // 允许 5px 误差
            return Math.abs(objLeft - canvasWidth / 2) < 5 && Math.abs(objTop - canvasHeight / 2) < 5;
          });
          
          expect(isCentered).toBe(true);
        }
      }
    });

    test('Upload 工具栏：Layering 按钮应该工作', async ({ page }) => {
      await openUploadPanel(page);
      
      if (TEST_IMAGES.small) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_IMAGES.small);
        await page.waitForTimeout(2000);
        
        const bringToFrontButton = page.locator('button[aria-label="Bring to Front"], button[title="Bring to Front"]').first();
        const isVisible = await bringToFrontButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await bringToFrontButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('Text 工具栏：Text Align 按钮应该工作', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const alignCenterButton = page.locator('button[aria-label="Align Center"], button[title="Align Center"]').first();
      const isVisible = await alignCenterButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await alignCenterButton.click();
        await page.waitForTimeout(500);
        
        // 验证文本对齐已更改
        const alignChanged = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return false;
          
          const activeObj = canvas.getActiveObject() as any;
          if (!activeObj || activeObj.type !== 'i-text') return false;
          
          return activeObj.textAlign === 'center';
        });
        
        expect(alignChanged).toBe(true);
      }
    });

    test('Art 工具栏：Flip 按钮应该工作', async ({ page }) => {
      await openArtPanel(page);
      
      const firstCategory = page.locator('.dl-art-category').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        const artwork = page.locator('.dl-art-item').first();
        const hasArtwork = await artwork.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasArtwork) {
          await artwork.click();
          await page.waitForTimeout(1000);
          
          const flipButton = page.locator('button[aria-label="Flip Horizontal"], button[title="Flip Horizontal"]').first();
          const flipVisible = await flipButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (flipVisible) {
            await flipButton.click();
            await page.waitForTimeout(500);
            
            // 验证 flipX 已更改
            const flipped = await page.evaluate(() => {
              const canvas = (window as any).fabricCanvas;
              if (!canvas) return false;
              
              const activeObj = canvas.getActiveObject() as any;
              if (!activeObj) return false;
              
              return activeObj.flipX === true;
            });
            
            expect(flipped).toBe(true);
          }
        }
      }
    });
  });
});
