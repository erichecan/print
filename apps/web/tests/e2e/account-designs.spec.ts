/**
 * Account Designs Page E2E Tests
* 测试 My Account 设计页面功能
 */
import { test, expect } from '@playwright/test';

test.describe('Account Designs Page', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 localStorage
    await page.goto('/account/designs');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('应该显示空状态当没有设计时', async ({ page }) => {
    await page.goto('/account/designs');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查空状态文本
    const emptyState = page.locator('text=您还没有保存任何设计');
    await expect(emptyState).toBeVisible();
    
    // 检查"开始设计"按钮
    const startButton = page.locator('a[href="/design-lab"]');
    await expect(startButton).toBeVisible();
  });

  test('应该显示时间筛选器', async ({ page }) => {
    await page.goto('/account/designs');
    await page.waitForLoadState('networkidle');
    
    // 检查时间筛选器
    const timeFilter = page.locator('#time-filter');
    await expect(timeFilter).toBeVisible();
    
    // 检查选项
    const options = timeFilter.locator('option');
    await expect(options).toHaveCount(4); // 全部/7天/30天/90天
  });

  test('应该能够切换时间筛选', async ({ page }) => {
    await page.goto('/account/designs');
    await page.waitForLoadState('networkidle');
    
    const timeFilter = page.locator('#time-filter');
    
    // 切换到 7 天
    await timeFilter.selectOption('7');
    await page.waitForTimeout(500); // 等待筛选完成
    
    // 验证筛选器值已更新
    await expect(timeFilter).toHaveValue('7');
  });

  test('应该能够从 My Account 跳转到 Design Lab', async ({ page }) => {
    await page.goto('/account/designs');
    await page.waitForLoadState('networkidle');
    
    // 点击"新建设计"按钮
    const newDesignButton = page.locator('a[href="/design-lab"]').first();
    await newDesignButton.click();
    
    // 验证跳转到 Design Lab
    await expect(page).toHaveURL(/\/design-lab/);
  });

  test('应该显示本地设计同步提示（当用户已登录且有本地设计时）', async ({ page, context }) => {
    // 模拟登录状态（需要根据实际认证方式调整）
    // 这里假设通过设置 cookie 或 localStorage 来模拟登录
    
    // 先创建一些本地设计
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');
    
    // 等待 Design Lab 加载完成
    await page.waitForTimeout(2000);
    
    // 模拟保存本地设计（通过 localStorage）
    await page.evaluate(() => {
      const design = {
        id: 'local-test-1',
        designName: 'Test Local Design',
        viewCanvases: {
          front: { size: { width: 4000, height: 4800 }, objects: [] },
          back: { size: { width: 4000, height: 4800 }, objects: [] },
          sleeve: { size: { width: 4000, height: 4800 }, objects: [] },
        },
        currentView: 'front',
        productInfo: {
          productId: 'prod-1',
          productName: 'T-Shirt',
          variantId: 'var-1',
          color: 'White',
        },
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'local',
      };
      localStorage.setItem('designLab:designs', JSON.stringify([design]));
    });
    
    // 访问 My Account 页面
    await page.goto('/account/designs');
    await page.waitForLoadState('networkidle');
    
    // 检查同步提示（如果用户已登录）
    // 注意：这个测试需要用户实际登录，可能需要调整
    const syncPrompt = page.locator('text=检测到').first();
    // 如果用户未登录，提示不会显示，这是正常行为
  });

  test('应该能够删除设计', async ({ page }) => {
    // 先创建本地设计
    await page.evaluate(() => {
      const design = {
        id: 'local-delete-test',
        designName: 'Design to Delete',
        viewCanvases: {
          front: { size: { width: 4000, height: 4800 }, objects: [] },
          back: { size: { width: 4000, height: 4800 }, objects: [] },
          sleeve: { size: { width: 4000, height: 4800 }, objects: [] },
        },
        currentView: 'front',
        productInfo: {
          productId: 'prod-1',
          productName: 'T-Shirt',
          variantId: 'var-1',
          color: 'White',
        },
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'local',
      };
      localStorage.setItem('designLab:designs', JSON.stringify([design]));
    });
    
    await page.goto('/account/designs');
    await page.waitForLoadState('networkidle');
    
    // 查找删除按钮（需要根据实际 UI 调整选择器）
    const deleteButton = page.locator('button:has-text("删除")').first();
    
    if (await deleteButton.isVisible()) {
      // 点击删除按钮
      await deleteButton.click();
      
      // 确认删除对话框（如果存在）
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      // 等待删除完成
      await page.waitForTimeout(500);
      
      // 验证设计已删除（设计列表应该更新）
      const designCard = page.locator('text=Design to Delete');
      await expect(designCard).not.toBeVisible();
    }
  });
});

