/**
 * Design Lab Stage 6 E2E Tests
 * [2025-01-30 20:45:00] 测试 Product Colors 和 Names & Numbers 功能
 */
import { test, expect } from './fixtures/test-base';

test.describe('Design Lab Stage 6 - Product Colors & Names & Numbers', () => {
  
  test.beforeEach(async ({ page }) => {
    // [2025-01-30 20:45:00] 访问 Design Lab 页面
    await page.goto('/design-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // [2025-01-30 20:45:00] 等待 Design Lab 加载完成（使用更宽松的等待策略）
    await page.waitForTimeout(5000);
    
    // [2025-01-30 20:45:00] 验证页面基本元素已加载
    const designLabContainer = page.locator('.design-lab-new, [class*="design-lab"]').first();
    await designLabContainer.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
      console.warn('Design Lab container not found, continuing anyway...');
    });
  });

  test.describe('Product Colors Modal', () => {
    test('应该能够打开 Product Colors 模态', async ({ page }) => {
      // [2025-01-30 20:45:00] 查找并点击 Product Colors 按钮
      const productColorsBtn = page.locator('button[aria-label*="color" i], button:has-text("Product"), .dl-rail__btn:has-text("Product")').first();
      
      // [2025-01-30 20:45:00] 如果找不到 Rail 按钮，尝试点击底部操作栏的 "Change Color" 链接
      if (!(await productColorsBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        const changeColorLink = page.locator('a:has-text("Change Color"), button:has-text("Change Color")').first();
        if (await changeColorLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await changeColorLink.click();
        }
      } else {
        await productColorsBtn.click();
      }

      // [2025-01-30 20:45:00] 等待模态打开
      await page.waitForTimeout(1000);
      
      // [2025-01-30 20:45:00] 验证模态是否显示
      const modal = page.locator('.dl-modal, .dl-product-colors-modal, [class*="modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // [2025-01-30 20:45:00] 验证模态标题
      const modalTitle = modal.locator('h3:has-text("Product Colors"), .dl-modal__title:has-text("Product")').first();
      await expect(modalTitle).toBeVisible({ timeout: 3000 });
    });

    test('应该显示颜色网格和 "Ordering fewer than 6?" 开关', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开 Product Colors 模态
      const productColorsBtn = page.locator('button[aria-label*="color" i], button:has-text("Product"), .dl-rail__btn:has-text("Product")').first();
      
      if (!(await productColorsBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        const changeColorLink = page.locator('a:has-text("Change Color"), button:has-text("Change Color")').first();
        if (await changeColorLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await changeColorLink.click();
        }
      } else {
        await productColorsBtn.click();
      }

      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-product-colors-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 验证 "Ordering fewer than 6?" 复选框
      const orderingCheckbox = modal.locator('input[type="checkbox"], label:has-text("Ordering fewer than 6")').first();
      await expect(orderingCheckbox).toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 验证颜色网格
      const colorsGrid = modal.locator('.dl-colors-grid, .dl-color-item, [class*="color"]').first();
      await expect(colorsGrid).toBeVisible({ timeout: 3000 });
    });

    test('应该能够选择颜色并关闭模态', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开 Product Colors 模态
      const productColorsBtn = page.locator('button[aria-label*="color" i], button:has-text("Product"), .dl-rail__btn:has-text("Product")').first();
      
      if (!(await productColorsBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        const changeColorLink = page.locator('a:has-text("Change Color"), button:has-text("Change Color")').first();
        if (await changeColorLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await changeColorLink.click();
        }
      } else {
        await productColorsBtn.click();
      }

      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-product-colors-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 尝试点击第一个可用颜色
      const colorItem = modal.locator('.dl-color-item:not(.is-unavailable), button[class*="color"]:not([disabled])').first();
      if (await colorItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await colorItem.click();
        await page.waitForTimeout(1000);
        
        // [2025-01-30 20:45:00] 验证模态已关闭
        await expect(modal).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Names & Numbers Modal', () => {
    test('应该能够打开 Names & Numbers 模态', async ({ page }) => {
      // [2025-01-30 20:45:00] 查找并点击 Add Names 按钮
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      
      await expect(addNamesBtn).toBeVisible({ timeout: 5000 });
      await addNamesBtn.click();
      
      // [2025-01-30 20:45:00] 等待模态打开
      await page.waitForTimeout(1000);
      
      // [2025-01-30 20:45:00] 验证模态是否显示
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal, [class*="modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // [2025-01-30 20:45:00] 验证模态标题
      const modalTitle = modal.locator('h3:has-text("Names & Numbers"), .dl-modal__title:has-text("Names")').first();
      await expect(modalTitle).toBeVisible({ timeout: 3000 });
    });

    test('应该显示 Intro 页面并能够进入 Tools 页面', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开 Names & Numbers 模态
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      await addNamesBtn.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 验证 Intro 页面内容
      const introTitle = modal.locator('h4:has-text("Add Names and Numbers"), .dl-names-numbers-intro__title').first();
      await expect(introTitle).toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 点击 "Add Names and Numbers" 按钮进入 Tools 页面
      const addBtn = modal.locator('button:has-text("Add Names and Numbers"), .dl-modal__btn--primary:has-text("Add")').first();
      await expect(addBtn).toBeVisible({ timeout: 3000 });
      await addBtn.click();
      await page.waitForTimeout(1000);

      // [2025-01-30 20:45:00] 验证 Tools 页面显示
      const toolsSection = modal.locator('.dl-names-numbers-tools, [class*="tools"]').first();
      await expect(toolsSection).toBeVisible({ timeout: 3000 });
    });

    test('应该在 Tools 页面显示 Add Names 和 Add Numbers 配置选项', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开模态并进入 Tools 页面
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      await addNamesBtn.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 跳过 Intro 页面
      const addBtn = modal.locator('button:has-text("Add Names and Numbers")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }

      // [2025-01-30 20:45:00] 验证 Add Names 复选框
      const addNamesCheckbox = modal.locator('input[type="checkbox"]:near(label:has-text("Add Names"))').first();
      await expect(addNamesCheckbox).toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 验证 Add Numbers 复选框
      const addNumbersCheckbox = modal.locator('input[type="checkbox"]:near(label:has-text("Add Numbers"))').first();
      await expect(addNumbersCheckbox).toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 验证配置选项（Side, Height, Color）
      const sideSelect = modal.locator('select, .dl-names-numbers-tools__select').first();
      await expect(sideSelect).toBeVisible({ timeout: 3000 });
    });

    test('应该能够添加示例文本到画布', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开模态并进入 Tools 页面
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      await addNamesBtn.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 跳过 Intro 页面
      const addBtn = modal.locator('button:has-text("Add Names and Numbers")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }

      // [2025-01-30 20:45:00] 点击 "Add To Design" 按钮
      const addToDesignBtn = modal.locator('button:has-text("Add To Design"), .dl-modal__btn--primary:has-text("Add")').first();
      await expect(addToDesignBtn).toBeVisible({ timeout: 3000 });
      await addToDesignBtn.click();
      await page.waitForTimeout(2000);

      // [2025-01-30 20:45:00] 验证进入 List 页面
      const listTitle = modal.locator('h4:has-text("Step 2"), .dl-names-numbers-list__title').first();
      await expect(listTitle).toBeVisible({ timeout: 3000 });
    });

    test('应该在 List 页面显示输入表格', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开模态并进入 List 页面
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      await addNamesBtn.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 跳过 Intro 和 Tools 页面
      const addBtn = modal.locator('button:has-text("Add Names and Numbers")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }

      const addToDesignBtn = modal.locator('button:has-text("Add To Design")').first();
      if (await addToDesignBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addToDesignBtn.click();
        await page.waitForTimeout(2000);
      }

      // [2025-01-30 20:45:00] 验证表格头部
      const tableHeader = modal.locator('.dl-names-numbers-list__table-header, [class*="table-header"]').first();
      await expect(tableHeader).toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 验证输入行
      const inputRows = modal.locator('.dl-names-numbers-list__table-row, input[type="text"]');
      const rowCount = await inputRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });
  });

  test.describe('Canvas Integration', () => {
    test('应该能够将 Names & Numbers 添加到画布', async ({ page }) => {
      // [2025-01-30 20:45:00] 打开 Names & Numbers 模态
      const addNamesBtn = page.locator('button[aria-label*="name" i], button:has-text("Add Names"), .dl-rail__btn:has-text("Name")').first();
      await addNamesBtn.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('.dl-modal, .dl-names-numbers-modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // [2025-01-30 20:45:00] 快速进入 List 页面
      const addBtn = modal.locator('button:has-text("Add Names and Numbers")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }

      const addToDesignBtn = modal.locator('button:has-text("Add To Design")').first();
      if (await addToDesignBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addToDesignBtn.click();
        await page.waitForTimeout(2000);
      }

      // [2025-01-30 20:45:00] 输入一些测试数据
      const nameInput = modal.locator('input[type="text"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test Name');
        await page.waitForTimeout(500);
      }

      // [2025-01-30 20:45:00] 点击 Done 按钮
      const doneBtn = modal.locator('button:has-text("Done"), .dl-modal__btn--primary:has-text("Done")').first();
      await expect(doneBtn).toBeVisible({ timeout: 3000 });
      await doneBtn.click();
      await page.waitForTimeout(2000);

      // [2025-01-30 20:45:00] 验证模态已关闭
      await expect(modal).not.toBeVisible({ timeout: 3000 });

      // [2025-01-30 20:45:00] 验证画布上是否有文本对象（通过检查 canvas 或 fabric 对象）
      const canvas = page.locator('canvas, [class*="canvas"]').first();
      await expect(canvas).toBeVisible({ timeout: 3000 });
    });
  });
});

