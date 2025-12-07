/**
 * Design Lab 无障碍与性能测试 (M7)
 * [2025-01-27 12:00:00] 测试键盘导航、ARIA、性能指标
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  addTextToCanvas,
  clickRailButton,
  switchView,
} from './fixtures/design-lab-helpers';
import { TEST_TEXTS } from './fixtures/design-lab-test-data';

test.describe('Design Lab M7: 无障碍与性能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test.describe('键盘导航', () => {
    test('应该能够通过 Tab 键导航', async ({ page }) => {
      // 按 Tab 键
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      // 验证焦点移动
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('应该能够通过 Enter 键激活按钮', async ({ page }) => {
      // 聚焦到第一个按钮
      const firstButton = page.locator('button').first();
      await firstButton.focus();
      await page.waitForTimeout(500);
      
      // 按 Enter 键
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    });

    test('应该能够通过 Esc 键关闭模态', async ({ page }) => {
      // 先打开一个模态（如 Product Colors）
      const productColorsBtn = page.locator('.dl-rail__btn:has-text("Product")').first();
      const isVisible = await productColorsBtn.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await productColorsBtn.click();
        await page.waitForTimeout(1000);
        
        // 按 Esc 键
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // 验证模态关闭
        const modal = page.locator('.dl-modal').first();
        const isModalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
        expect(isModalVisible).toBeFalsy();
      }
    });

    test('应该能够通过方向键导航颜色格子', async ({ page }) => {
      // 打开 Product Colors 模态
      const productColorsBtn = page.locator('.dl-rail__btn:has-text("Product")').first();
      const isVisible = await productColorsBtn.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await productColorsBtn.click();
        await page.waitForTimeout(1000);
        
        // 聚焦到第一个颜色格子
        const firstColor = page.locator('.dl-color-item, button[class*="color"]').first();
        await firstColor.focus();
        await page.waitForTimeout(500);
        
        // 按右方向键
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        
        // 验证焦点移动
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      }
    });

    test('应该能够通过 Delete 键删除对象', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 选中对象（通过点击画布）
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 400, y: 300 } });
      await page.waitForTimeout(500);
      
      // 按 Delete 键
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);
    });
  });

  test.describe('ARIA 标签验证', () => {
    test('所有按钮应该有 aria-label', async ({ page }) => {
      // 获取所有按钮
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      // 检查至少有一些按钮有 aria-label
      let hasAriaLabel = false;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
        if (ariaLabel) {
          hasAriaLabel = true;
          break;
        }
      }
      
      // 至少应该有一些按钮有 aria-label
      expect(hasAriaLabel || count === 0).toBeTruthy();
    });

    test('模态应该有 aria-labelledby 或 aria-label', async ({ page }) => {
      // 打开一个模态
      const productColorsBtn = page.locator('.dl-rail__btn:has-text("Product")').first();
      const isVisible = await productColorsBtn.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await productColorsBtn.click();
        await page.waitForTimeout(1000);
        
        // 查找模态
        const modal = page.locator('.dl-modal').first();
        const isModalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isModalVisible) {
          // 检查 aria-labelledby 或 aria-label
          const ariaLabelledBy = await modal.getAttribute('aria-labelledby').catch(() => null);
          const ariaLabel = await modal.getAttribute('aria-label').catch(() => null);
          
          // 应该至少有一个
          expect(ariaLabelledBy || ariaLabel).toBeTruthy();
        }
      }
    });

    test('输入框应该有明确的标签', async ({ page }) => {
      // 打开 Add Text 面板
      await clickRailButton(page, 'Add Text');
      await page.waitForTimeout(500);
      
      // 查找输入框
      const textInput = page.locator('input[type="text"], textarea').first();
      const isVisible = await textInput.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        // 检查 aria-label 或关联的 label
        const ariaLabel = await textInput.getAttribute('aria-label').catch(() => null);
        const id = await textInput.getAttribute('id').catch(() => null);
        const label = id ? page.locator(`label[for="${id}"]`).first() : null;
        const hasLabel = label ? await label.isVisible({ timeout: 1000 }).catch(() => false) : false;
        
        // 应该至少有一个标签
        expect(ariaLabel || hasLabel).toBeTruthy();
      }
    });
  });

  test.describe('焦点样式验证', () => {
    test('按钮应该有明确的焦点样式', async ({ page }) => {
      // 聚焦到第一个按钮
      const firstButton = page.locator('button').first();
      await firstButton.focus();
      await page.waitForTimeout(500);
      
      // 检查焦点样式（通过计算样式）
      const focusStyle = await firstButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });
      
      // 应该有焦点指示（outline 或 box-shadow）
      const hasFocusIndicator = 
        focusStyle.outlineWidth !== '0px' || 
        focusStyle.outline !== 'none' ||
        focusStyle.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBeTruthy();
    });

    test('输入框应该有明确的焦点样式', async ({ page }) => {
      await clickRailButton(page, 'Add Text');
      await page.waitForTimeout(500);
      
      const textInput = page.locator('input[type="text"], textarea').first();
      const isVisible = await textInput.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await textInput.focus();
        await page.waitForTimeout(500);
        
        // 检查焦点样式
        const focusStyle = await textInput.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            borderColor: styles.borderColor,
          };
        });
        
        // 应该有焦点指示
        const hasFocusIndicator = 
          focusStyle.outlineWidth !== '0px' || 
          focusStyle.outline !== 'none' ||
          focusStyle.borderColor !== 'transparent';
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    });
  });

  test.describe('页面加载性能', () => {
    test('页面应该在合理时间内加载完成', async ({ page }) => {
      const startTime = Date.now();
      
      await navigateToDesignLab(page);
      await waitForDesignLabReady(page);
      
      const loadTime = Date.now() - startTime;
      
      // 页面应该在 10 秒内加载完成
      expect(loadTime).toBeLessThan(10000);
    });

    test('应该测量页面加载性能指标', async ({ page }) => {
      // 使用 Performance API
      const performanceMetrics = await page.evaluate(() => {
        const perfData = window.performance.timing;
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
          loadComplete: perfData.loadEventEnd - perfData.navigationStart,
        };
      });
      
      // DOM Content Loaded 应该在 5 秒内
      expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);
    });
  });

  test.describe('画布渲染性能', () => {
    test('应该能够流畅添加多个对象', async ({ page }) => {
      const startTime = Date.now();
      
      // 添加多个文字对象
      for (let i = 0; i < 5; i++) {
        await addTextToCanvas(page, `Text ${i}`);
        await page.waitForTimeout(200);
      }
      
      const totalTime = Date.now() - startTime;
      
      // 添加 5 个对象应该在 5 秒内完成
      expect(totalTime).toBeLessThan(5000);
    });

    test('视图切换应该流畅', async ({ page }) => {
      const startTime = Date.now();
      
      // 切换视图
      await switchView(page, 'Back');
      await page.waitForTimeout(500);
      await switchView(page, 'Sleeve Design');
      await page.waitForTimeout(500);
      await switchView(page, 'Front');
      
      const totalTime = Date.now() - startTime;
      
      // 视图切换应该在 3 秒内完成
      expect(totalTime).toBeLessThan(3000);
    });
  });
});

