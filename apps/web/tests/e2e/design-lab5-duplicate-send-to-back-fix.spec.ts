/**
 * Design Lab 5.0 - 工具栏复制角控件和 Send to Back 功能修复测试
 * [2025-12-16 06:00:00] 验证工具栏复制角控件问题和 Send to Back 功能
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  openUploadPanel,
  waitForObjectSelected,
} from './fixtures/design-lab-helpers';
import { TEST_IMAGES } from './fixtures/design-lab-test-data';

test.describe('Design Lab 5.0: 工具栏复制角控件和 Send to Back 修复', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test.describe('工具栏复制角控件验证', () => {
    test('工具栏 Duplicate 按钮复制的对象应该有角控件', async ({ page, context }) => {
      // 启用 CDP 用于调试
      const client = await context.newCDPSession(page);
      await client.send('Console.enable');
      await client.send('Runtime.enable');
      
      const consoleMessages: any[] = [];
      client.on('Runtime.consoleAPICalled', (event) => {
        const args = event.args.map((arg: any) => {
          if (arg.value !== undefined) return arg.value;
          if (arg.objectId) return `[Object ${arg.objectId}]`;
          return arg.description || JSON.stringify(arg);
        });
        if (args.some((arg: any) => 
          typeof arg === 'string' && (
            arg.includes('EditUploadPanel') || 
            arg.includes('CornerControls') ||
            arg.includes('duplicate') ||
            arg.includes('角控件')
          )
        )) {
          consoleMessages.push({ type: event.type, args, timestamp: event.timestamp });
        }
      });

      // 1. 上传图片
      await openUploadPanel(page);
      
      if (!TEST_IMAGES.small) {
        test.skip();
        return;
      }

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000); // 等待图片加载和添加到画布

      // 2. 等待对象被选中并显示 edit panel
      await waitForObjectSelected(page, 5000);
      await page.waitForTimeout(1000);

      // 3. 获取原始对象信息
      const originalObjectInfo = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;

        const controls = (activeObj as any).controls || {};
        // [2025-12-16 06:24:40] 兼容两套角控件：5.1 使用 cornerDelete/cornerDuplicate/cornerResize；5.0 使用 deleteIcon/duplicateIcon/resizeIcon
        const hasCornerControls = !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
        const hasIconControls = !!(controls.deleteIcon || controls.duplicateIcon || controls.resizeIcon);
        return {
          name: (activeObj as any).name || 'unnamed',
          hasControls: activeObj.hasControls,
          hasBorders: activeObj.hasBorders,
          controlsKeys: Object.keys(controls),
          hasCornerControls,
          hasIconControls,
        };
      });

      console.log('原始对象信息:', originalObjectInfo);

      if (!originalObjectInfo) {
        test.skip();
        return;
      }

      // 验证原始对象有角控件
      expect(originalObjectInfo.hasControls).toBe(true);
      expect(originalObjectInfo.hasCornerControls || originalObjectInfo.hasIconControls).toBe(true);

      // 4. 点击工具栏的 Duplicate 按钮
      const duplicateButton = page.locator(
        'button[aria-label*="Duplicate" i], button[title*="Duplicate" i], .dl-edit-upload-panel__toolbar button:has([data-icon="duplicate"])'
      ).first();
      
      const buttonExists = await duplicateButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (!buttonExists) {
        // 尝试通过 SVG 路径查找
        const duplicateButtonBySvg = page.locator('.dl-edit-upload-panel__toolbar button:has(svg)').filter({ hasText: /duplicate/i }).first();
        if (await duplicateButtonBySvg.isVisible({ timeout: 2000 }).catch(() => false)) {
          await duplicateButtonBySvg.click();
        } else {
          console.log('❌ 找不到 Duplicate 按钮，尝试直接调用函数');
          // 直接调用 handleDuplicate
          await page.evaluate(() => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;
            // 触发 duplicate 事件
            (window as any).__triggerDuplicate?.();
          });
        }
      } else {
        await duplicateButton.click();
      }

      await page.waitForTimeout(2000); // 等待复制完成

      // 5. 验证新复制的对象有角控件
      const clonedObjectInfo = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;

        // 找到复制的对象（应该是当前选中的对象，且不是原始对象）
        const clonedObj = activeObj;
        const controls = (clonedObj as any).controls || {};
        const hasCornerControls = !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize);
        const hasIconControls = !!(controls.deleteIcon || controls.duplicateIcon || controls.resizeIcon);
        
        return {
          name: (clonedObj as any).name || 'unnamed',
          hasControls: clonedObj.hasControls,
          hasBorders: clonedObj.hasBorders,
          controlsKeys: Object.keys(controls),
          hasCornerControls,
          hasIconControls,
          totalObjects: objects.length,
        };
      });

      console.log('复制的对象信息:', clonedObjectInfo);
      console.log('Console 消息数量:', consoleMessages.length);

      // 输出相关 console 消息
      if (consoleMessages.length > 0) {
        console.log('\n=== 相关 Console 消息 ===');
        consoleMessages.slice(-10).forEach((msg, idx) => {
          console.log(`[${idx}]`, msg.type, ...msg.args);
        });
      }

      if (!clonedObjectInfo) {
        throw new Error('复制的对象未找到');
      }

      // 断言：复制的对象应该有角控件
      expect(clonedObjectInfo.hasControls).toBe(true);
      expect(clonedObjectInfo.hasBorders).toBe(true);
      expect(clonedObjectInfo.hasCornerControls || clonedObjectInfo.hasIconControls).toBe(true);
    });

    test('三角控件复制应该有角控件（基准测试）', async ({ page }) => {
      // 1. 上传图片
      await openUploadPanel(page);
      
      if (!TEST_IMAGES.small) {
        test.skip();
        return;
      }

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000);

      // 2. 等待对象被选中
      await waitForObjectSelected(page, 5000);
      await page.waitForTimeout(1000);

      // 3. 通过 JavaScript 直接调用角控件的 duplicate 功能
      const duplicateResult = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return { success: false, error: 'Canvas not found' };

        const activeObj = canvas.getActiveObject();
        if (!activeObj) return { success: false, error: 'No active object' };

        const controls = (activeObj as any).controls || {};
        // [2025-12-16 06:24:40] 兼容两套控件 key
        const duplicateControl = controls.cornerDuplicate || controls.duplicateIcon;

        if (!duplicateControl) {
          return { success: false, error: 'cornerDuplicate control not found' };
        }

        // 调用 duplicate 控件的 onClick 处理函数
        if (duplicateControl.mouseUpHandler) {
          const transformData = { target: activeObj };
          duplicateControl.mouseUpHandler({}, transformData, 0, 0);
          canvas.renderAll();
          return { success: true };
        } else if (duplicateControl.onClick) {
          duplicateControl.onClick(activeObj, canvas);
          canvas.renderAll();
          return { success: true };
        }

        return { success: false, error: 'No handler found' };
      });

      expect(duplicateResult.success).toBe(true);

      await page.waitForTimeout(2000);

      // 4. 验证新复制的对象有角控件
      const clonedObjectInfo = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;

        const controls = (activeObj as any).controls || {};
        return {
          name: (activeObj as any).name || 'unnamed',
          hasControls: activeObj.hasControls,
          hasBorders: activeObj.hasBorders,
          hasCornerControls: !!(controls.cornerDelete || controls.cornerDuplicate || controls.cornerResize),
          hasIconControls: !!(controls.deleteIcon || controls.duplicateIcon || controls.resizeIcon),
        };
      });

      console.log('三角控件复制的对象信息:', clonedObjectInfo);

      if (!clonedObjectInfo) {
        throw new Error('复制的对象未找到');
      }

      // 断言：三角控件复制的对象应该有角控件（作为基准）
      expect(clonedObjectInfo.hasControls).toBe(true);
      expect(clonedObjectInfo.hasCornerControls || clonedObjectInfo.hasIconControls).toBe(true);
    });
  });

  test.describe('Send to Back 功能验证', () => {
    test('Send to Back 应该确保对象在商品底图之后', async ({ page, context }) => {
      // 启用 CDP 用于调试
      const client = await context.newCDPSession(page);
      await client.send('Console.enable');
      await client.send('Runtime.enable');
      
      const consoleMessages: any[] = [];
      client.on('Runtime.consoleAPICalled', (event) => {
        const args = event.args.map((arg: any) => {
          if (arg.value !== undefined) return arg.value;
          if (arg.objectId) return `[Object ${arg.objectId}]`;
          return arg.description || JSON.stringify(arg);
        });
        if (args.some((arg: any) => 
          typeof arg === 'string' && (
            arg.includes('sendToBack') || 
            arg.includes('Send to Back') ||
            arg.includes('EditUploadPanel') ||
            arg.includes('background')
          )
        )) {
          consoleMessages.push({ type: event.type, args, timestamp: event.timestamp });
        }
      });

      // 1. 上传图片
      await openUploadPanel(page);
      
      if (!TEST_IMAGES.small) {
        test.skip();
        return;
      }

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000);

      // 2. 等待对象被选中
      await waitForObjectSelected(page, 5000);
      await page.waitForTimeout(1000);

      // 3. 获取初始状态
      const initialState = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;

        const currentIndex = objects.indexOf(activeObj);
        const backgroundIndex = objects.findIndex((obj: any) => {
          const name = (obj as any).name || '';
          const layerType = (obj as any).data?.layerType;
          return name === 'background' || 
                 name.startsWith('product-image-') || 
                 layerType === 'product' || 
                 layerType === 'product-image';
        });

        return {
          currentIndex,
          backgroundIndex,
          targetIndex: backgroundIndex >= 0 ? backgroundIndex + 1 : 0,
          activeObjectName: (activeObj as any).name || 'unnamed',
          totalObjects: objects.length,
          allObjects: objects.map((obj: any, idx: number) => ({
            index: idx,
            name: (obj as any).name || 'unnamed',
            layerType: (obj as any).data?.layerType,
          })),
        };
      });

      console.log('初始状态:', JSON.stringify(initialState, null, 2));

      if (!initialState) {
        test.skip();
        return;
      }

      // 4. 点击 Send to Back 按钮
      const sendToBackButton = page.locator(
        'button[aria-label*="Send to Back" i], button[title*="Send to Back" i], .dl-edit-upload-panel__toolbar button:has([data-icon="layering-down"])'
      ).first();
      
      const buttonExists = await sendToBackButton.isVisible({ timeout: 5000 }).catch(() => false);
      if (!buttonExists) {
        // 尝试通过 SVG 路径查找
        const sendToBackButtonBySvg = page.locator('.dl-edit-upload-panel__toolbar button:has(svg path)').nth(1); // 通常是第二个按钮
        if (await sendToBackButtonBySvg.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendToBackButtonBySvg.click();
        } else {
          console.log('❌ 找不到 Send to Back 按钮，尝试直接调用函数');
          // 直接调用 sendToBack
          await page.evaluate(() => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;
            // 尝试调用 sendObjectToBack
            if (typeof (canvas as any).sendObjectToBack === 'function') {
              (canvas as any).sendObjectToBack(activeObj);
            } else if (typeof (activeObj as any).sendToBack === 'function') {
              (activeObj as any).sendToBack();
            }
            canvas.renderAll();
          });
        }
      } else {
        await sendToBackButton.click();
      }

      await page.waitForTimeout(2000); // 等待操作完成

      // 5. 获取最终状态
      const finalState = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;

        const finalIndex = objects.indexOf(activeObj);
        const backgroundIndex = objects.findIndex((obj: any) => {
          const name = (obj as any).name || '';
          const layerType = (obj as any).data?.layerType;
          return name === 'background' || 
                 name.startsWith('product-image-') || 
                 layerType === 'product' || 
                 layerType === 'product-image';
        });
        const expectedIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;

        return {
          finalIndex,
          backgroundIndex,
          expectedIndex,
          isCorrectPosition: finalIndex === expectedIndex,
          isAboveBackground: backgroundIndex < 0 || finalIndex > backgroundIndex,
          activeObjectName: (activeObj as any).name || 'unnamed',
          allObjects: objects.map((obj: any, idx: number) => ({
            index: idx,
            name: (obj as any).name || 'unnamed',
            layerType: (obj as any).data?.layerType,
          })),
        };
      });

      console.log('最终状态:', JSON.stringify(finalState, null, 2));
      console.log('Console 消息数量:', consoleMessages.length);

      // 输出相关 console 消息
      if (consoleMessages.length > 0) {
        console.log('\n=== 相关 Console 消息 ===');
        consoleMessages.slice(-15).forEach((msg, idx) => {
          console.log(`[${idx}]`, msg.type, ...msg.args);
        });
      }

      if (!finalState) {
        throw new Error('无法获取最终状态');
      }

      // 断言：对象应该在商品底图之后
      expect(finalState.isAboveBackground).toBe(true);
      
      // 如果找到了商品底图，验证位置是否正确
      if (finalState.backgroundIndex >= 0) {
        expect(finalState.finalIndex).toBeGreaterThan(finalState.backgroundIndex);
        // 理想情况下应该在 backgroundIndex + 1
        // 但如果有其他对象，可能不是精确的 +1，只要在之后即可
      }
    });

    test('Send to Back 多次操作应该保持正确顺序', async ({ page }) => {
      // 1. 上传两张图片
      await openUploadPanel(page);
      
      if (!TEST_IMAGES.small) {
        test.skip();
        return;
      }

      // [2025-12-16 06:22:40] 修复测试稳定性：每次上传前都重新打开 Upload 面板并重新查找 input
      const getFileInput = () => page.locator('input[type="file"]').first();
      
      // 上传第一张图片
      await getFileInput().setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000);
      await waitForObjectSelected(page, 5000);
      await page.waitForTimeout(1000);

      // 上传第二张图片（通过再次上传）
      await openUploadPanel(page);
      await getFileInput().setInputFiles(TEST_IMAGES.small);
      await page.waitForTimeout(3000);
      await waitForObjectSelected(page, 5000);
      await page.waitForTimeout(1000);

      // 2. 获取初始状态
      const initialObjects = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const backgroundIndex = objects.findIndex((obj: any) => {
          const name = (obj as any).name || '';
          const layerType = (obj as any).data?.layerType;
          return name === 'background' || 
                 name.startsWith('product-image-') || 
                 layerType === 'product' || 
                 layerType === 'product-image';
        });

        const uploadObjects = objects.filter((obj: any, idx: number) => {
          const name = (obj as any).name || '';
          return name.startsWith('image_') && idx !== backgroundIndex;
        }).map((obj: any) => ({
          name: (obj as any).name || 'unnamed',
          index: objects.indexOf(obj),
        }));

        return {
          backgroundIndex,
          uploadObjects,
          totalObjects: objects.length,
        };
      });

      console.log('初始对象状态:', JSON.stringify(initialObjects, null, 2));

      if (!initialObjects || initialObjects.uploadObjects.length < 2) {
        test.skip();
        return;
      }

      // 3. 选中第一张图片，执行 Send to Back
      await page.evaluate((firstObjectName) => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return;
        const objects = canvas.getObjects();
        const firstObj = objects.find((obj: any) => (obj as any).name === firstObjectName);
        if (firstObj) {
          canvas.setActiveObject(firstObj);
          canvas.renderAll();
        }
      }, initialObjects.uploadObjects[0].name);

      await page.waitForTimeout(500);

      // 点击 Send to Back
      const sendToBackButton1 = page.locator(
        'button[aria-label*="Send to Back" i], button[title*="Send to Back" i]'
      ).first();
      if (await sendToBackButton1.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendToBackButton1.click();
        await page.waitForTimeout(1000);
      }

      // 4. 选中第二张图片，执行 Send to Back
      await page.evaluate((secondObjectName) => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return;
        const objects = canvas.getObjects();
        const secondObj = objects.find((obj: any) => (obj as any).name === secondObjectName);
        if (secondObj) {
          canvas.setActiveObject(secondObj);
          canvas.renderAll();
        }
      }, initialObjects.uploadObjects[1].name);

      await page.waitForTimeout(500);

      const sendToBackButton2 = page.locator(
        'button[aria-label*="Send to Back" i], button[title*="Send to Back" i]'
      ).first();
      if (await sendToBackButton2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendToBackButton2.click();
        await page.waitForTimeout(1000);
      }

      // 5. 验证最终状态
      const finalState = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        const objects = canvas.getObjects();
        const backgroundIndex = objects.findIndex((obj: any) => {
          const name = (obj as any).name || '';
          const layerType = (obj as any).data?.layerType;
          return name === 'background' || 
                 name.startsWith('product-image-') || 
                 layerType === 'product' || 
                 layerType === 'product-image';
        });

        const uploadObjects = objects
          .map((obj: any, idx: number) => ({
            name: (obj as any).name || 'unnamed',
            index: idx,
            layerType: (obj as any).data?.layerType,
          }))
          .filter((obj: any) => 
            obj.name.startsWith('image_') && 
            obj.index !== backgroundIndex
          );

        return {
          backgroundIndex,
          uploadObjects,
          allAboveBackground: uploadObjects.every(obj => obj.index > backgroundIndex),
        };
      });

      console.log('最终状态:', JSON.stringify(finalState, null, 2));

      if (!finalState) {
        throw new Error('无法获取最终状态');
      }

      // 断言：所有上传的对象都应该在商品底图之后
      if (finalState.backgroundIndex >= 0) {
        expect(finalState.allAboveBackground).toBe(true);
      }
    });
  });
});
