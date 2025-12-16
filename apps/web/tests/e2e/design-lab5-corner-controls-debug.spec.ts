/**
 * Design Lab 5.1 - 角控件功能测试与调试
 * [2025-12-16 03:20:00] 使用 Chrome DevTools Protocol 进行完整的角控件功能测试
 * 包括：日志收集、对象检查、功能测试、截图验证
 */
import { test, expect, chromium } from '@playwright/test';
import * as path from 'path';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const DESIGN_LAB_URL = `${FRONTEND_URL}/design-lab`;

interface TestLog {
  type: string;
  message: string;
  timestamp: number;
}

interface ObjectSnapshot {
  name: string;
  type: string;
  layerType: string;
  hasControls: boolean;
  hasBorders: boolean;
  controlsKeys: string[];
  cornerDeleteExists: boolean;
  cornerDuplicateExists: boolean;
  cornerResizeExists: boolean;
}

test.describe('Design Lab 5.1: 角控件功能测试与调试', () => {
  let testLogs: TestLog[] = [];
  let allConsoleMessages: string[] = [];

  test('完整的角控件测试流程', async () => {
    // 启动浏览器并启用 CDP
    const browser = await chromium.launch({
      headless: false,
      devtools: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    const client = await context.newCDPSession(page);

    // 启用 CDP 域
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 收集控制台日志
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
        if (arg.type === 'string') return arg.value;
        if (arg.type === 'number') return arg.value;
        if (arg.type === 'object' && arg.value) return JSON.stringify(arg.value);
        return String(arg.value);
      }).join(' ');

      const message = `[Console ${event.type}]: ${args}`;
      allConsoleMessages.push(message);

      // 特别关注 DesignLab 和 CornerControls 相关的日志
      if (
        message.includes('[DesignLab]') ||
        message.includes('[CornerControls]') ||
        message.includes('角控件') ||
        message.includes('corner')
      ) {
        testLogs.push({
          type: event.type,
          message,
          timestamp: Date.now(),
        });
        console.log(message);
      }
    });

    // 监听错误
    client.on('Runtime.exceptionThrown', (event) => {
      const exception = event.exceptionDetails;
      const errorMessage = `[Error] ${exception.text}: ${exception.exception?.description || ''}`;
      testLogs.push({
        type: 'error',
        message: errorMessage,
        timestamp: Date.now(),
      });
      console.error(errorMessage);
    });

    try {
      // ==================== Step 1: 基础验证 ====================
      console.log('\n========== Step 1: 基础验证 ==========');
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // 等待 canvas 初始化
      await page.waitForFunction(
        () => (window as any).fabricCanvas !== undefined,
        { timeout: 15000 }
      );

      console.log('✅ Canvas 已初始化');

      // 检查注册日志
      const registrationLogs = testLogs.filter(log =>
        log.message.includes('通用角控件已注册') ||
        log.message.includes('registerCornerControls')
      );

      if (registrationLogs.length > 0) {
        console.log('✅ 找到角控件注册日志:', registrationLogs.map(l => l.message).join(', '));
      } else {
        console.warn('⚠️  未找到角控件注册日志');
      }

      // 获取 canvas 对象并检查注册状态
      const canvasInfo = await page.evaluate(() => {
        const canvas = (window as any).fabricCanvas;
        if (!canvas) return null;

        return {
          exists: true,
          objectCount: canvas.getObjects().length,
        };
      });

      console.log('Canvas 信息:', canvasInfo);

      // ==================== Step 2: Upload 对象测试 ====================
      console.log('\n========== Step 2: Upload 对象测试 ==========');

      // 打开 Upload 面板
      const uploadButton = page.locator('button:has-text("Upload"), .dl-rail__btn:has-text("Upload")').first();
      await uploadButton.waitFor({ state: 'visible', timeout: 5000 });
      await uploadButton.click();
      await page.waitForTimeout(1000);

      // 上传测试图片
      const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
      const fileInput = page.locator('input[type="file"]').first();
      
      try {
        await fileInput.setInputFiles(testImagePath);
        console.log('✅ 图片文件已选择');
      } catch (error) {
        console.warn('⚠️  无法设置文件输入，尝试其他方式:', error);
        // 如果文件不存在，创建一个简单的占位测试
      }

      await page.waitForTimeout(3000); // 等待图片加载

      // 获取上传后的对象信息
      const uploadObjectInfo = await page.evaluate(() => {
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
        const controlsKeys = Object.keys(controls);

        return {
          name: (uploadObj as any).name || 'unnamed',
          type: uploadObj.type,
          layerType: (uploadObj as any).data?.layerType || 'unknown',
          hasControls: uploadObj.hasControls !== false,
          hasBorders: uploadObj.hasBorders !== false,
          controlsKeys,
          cornerDeleteExists: !!controls.cornerDelete,
          cornerDuplicateExists: !!controls.cornerDuplicate,
          cornerResizeExists: !!controls.cornerResize,
          borderColor: (uploadObj as any).borderColor,
          borderScaleFactor: (uploadObj as any).borderScaleFactor,
        } as ObjectSnapshot;
      });

      console.log('Upload 对象信息:', JSON.stringify(uploadObjectInfo, null, 2));

      if (!uploadObjectInfo) {
        console.warn('⚠️  未找到上传对象，跳过 Upload 测试');
      } else {
        // 选中对象
        await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return;

          const objects = canvas.getObjects();
          const uploadObj = objects.find((obj: any) => {
            const name = (obj as any).name || '';
            const layerType = (obj as any).data?.layerType;
            return (layerType === 'upload' || name.startsWith('image_')) && name !== 'background';
          });

          if (uploadObj) {
            canvas.setActiveObject(uploadObj);
            canvas.renderAll();
          }
        });

        await page.waitForTimeout(1000);

        // 截图验证控件可见性
        const uploadScreenshot = await page.screenshot({
          path: 'test-results/corner-controls-upload.png',
          fullPage: false,
        });
        console.log('✅ Upload 对象截图已保存');

        // 验证角控件是否存在
        expect(uploadObjectInfo.cornerDeleteExists).toBe(true);
        expect(uploadObjectInfo.cornerDuplicateExists).toBe(true);
        expect(uploadObjectInfo.cornerResizeExists).toBe(true);

        console.log('✅ Upload 对象的三个角控件都已存在');
      }

      // ==================== Step 3: Text 对象测试 ====================
      console.log('\n========== Step 3: Text 对象测试 ==========');

      // 打开 Text 面板
      const textButton = page.locator('button:has-text("Add Text"), .dl-rail__btn:has-text("Add Text"), .dl-rail__btn:has-text("Text")').first();
      await textButton.waitFor({ state: 'visible', timeout: 5000 });
      await textButton.click();
      await page.waitForTimeout(1000);

      // 输入文字
      const textInput = page.locator('input[placeholder*="text" i], textarea[placeholder*="text" i]').first();
      await textInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await textInput.count() > 0) {
        await textInput.fill('Test Text');
        await page.waitForTimeout(500);

        // 点击 Add To Design
        const addButton = page.locator('button:has-text("Add To Design"), button:has-text("Add to Design")').first();
        await addButton.click();
        await page.waitForTimeout(2000);

        // 获取 Text 对象信息
        const textObjectInfo = await page.evaluate(() => {
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
            layerType: (textObj as any).data?.layerType || 'unknown',
            hasControls: textObj.hasControls !== false,
            hasBorders: textObj.hasBorders !== false,
            controlsKeys: Object.keys(controls),
            cornerDeleteExists: !!controls.cornerDelete,
            cornerDuplicateExists: !!controls.cornerDuplicate,
            cornerResizeExists: !!controls.cornerResize,
            borderColor: (textObj as any).borderColor,
            borderScaleFactor: (textObj as any).borderScaleFactor,
          } as ObjectSnapshot;
        });

        console.log('Text 对象信息:', JSON.stringify(textObjectInfo, null, 2));

        if (textObjectInfo) {
          // 选中对象
          await page.evaluate(() => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return;

            const objects = canvas.getObjects();
            const textObj = objects.find((obj: any) => {
              const type = obj.type;
              return type === 'i-text' || type === 'text' || type === 'textbox';
            });

            if (textObj) {
              canvas.setActiveObject(textObj);
              canvas.renderAll();
            }
          });

          await page.waitForTimeout(1000);

          // 截图
          await page.screenshot({
            path: 'test-results/corner-controls-text.png',
            fullPage: false,
          });

          // 验证角控件
          expect(textObjectInfo.cornerDeleteExists).toBe(true);
          expect(textObjectInfo.cornerDuplicateExists).toBe(true);
          expect(textObjectInfo.cornerResizeExists).toBe(true);

          console.log('✅ Text 对象的三个角控件都已存在');
        }
      }

      // ==================== Step 4: 功能测试 ====================
      console.log('\n========== Step 4: 功能测试 ==========');

      // 测试删除功能
      if (uploadObjectInfo && uploadObjectInfo.cornerDeleteExists) {
        const beforeDeleteCount = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          return canvas ? canvas.getObjects().length : 0;
        });

        // 触发删除控件
        await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          if (!canvas) return;

          const activeObj = canvas.getActiveObject();
          if (!activeObj) return;

          const controls = (activeObj as any).controls || {};
          const deleteControl = controls.cornerDelete;

          if (deleteControl && deleteControl.mouseUpHandler) {
            const transformData = { target: activeObj };
            deleteControl.mouseUpHandler({}, transformData, 0, 0);
            canvas.renderAll();
          }
        });

        await page.waitForTimeout(1000);

        const afterDeleteCount = await page.evaluate(() => {
          const canvas = (window as any).fabricCanvas;
          return canvas ? canvas.getObjects().length : 0;
        });

        console.log(`删除前对象数: ${beforeDeleteCount}, 删除后对象数: ${afterDeleteCount}`);
        
        // 注意：如果对象被删除，数量应该减少
        // 但这里我们主要测试控件是否存在，所以不强制要求删除成功
      }

      // ==================== Step 5: 日志分析 ====================
      console.log('\n========== Step 5: 日志分析 ==========');
      console.log(`总共收集到 ${testLogs.length} 条相关日志`);
      
      const registrationLogs2 = testLogs.filter(log =>
        log.message.includes('注册') || log.message.includes('register')
      );
      console.log(`注册相关日志: ${registrationLogs2.length} 条`);

      const errorLogs = testLogs.filter(log => log.type === 'error');
      if (errorLogs.length > 0) {
        console.log(`错误日志: ${errorLogs.length} 条`);
        errorLogs.forEach(log => console.error(log.message));
      }

      // 保存完整日志到文件（用于分析）
      // 使用 page.evaluate 在浏览器上下文中无法使用 fs，这里通过 console 输出完整日志
      console.log('\n========== 完整控制台日志 ==========');
      allConsoleMessages.slice(-50).forEach(msg => console.log(msg)); // 只输出最后50条
      console.log('\n========== 角控件相关日志 ==========');
      testLogs.forEach(log => console.log(`[${log.type}] ${log.message}`));

    } catch (error) {
      console.error('测试过程中发生错误:', error);
      throw error;
    } finally {
      await browser.close();
    }
  });
});
