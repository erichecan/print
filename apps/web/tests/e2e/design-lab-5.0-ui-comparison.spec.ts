/**
 * Design Lab 5.0 UI Comparison Test
* 对比 5.0 版本与 4.0 版本的 UI 结构
 */
import { test, expect } from '@playwright/test';

test.describe('Design Lab 5.0 UI Comparison', () => {
  test.beforeEach(async ({ page }) => {
    // 访问 5.0 版本页面
    await page.goto('http://localhost:3000/design-lab');
    await page.waitForLoadState('networkidle');
  });

  test('Rail (第一列) 应该显示图标和标签', async ({ page }) => {
    // 检查 Rail 按钮结构
    const rail = page.locator('[data-testid="rail"]');
    await expect(rail).toBeVisible();

    // 检查 Upload 按钮
    const uploadBtn = rail.locator('button').filter({ hasText: 'Upload' });
    await expect(uploadBtn).toBeVisible();
    
    // 检查是否有图标
    const uploadIcon = uploadBtn.locator('.dl-rail__btn-icon');
    await expect(uploadIcon).toBeVisible();
    
    // 检查是否有标签
    const uploadLabel = uploadBtn.locator('.dl-rail__btn-label');
    await expect(uploadLabel).toBeVisible();
    await expect(uploadLabel).toHaveText('Upload');

    // 检查 Add Text 按钮
    const textBtn = rail.locator('button').filter({ hasText: 'Add Text' });
    await expect(textBtn).toBeVisible();
    const textIcon = textBtn.locator('.dl-rail__btn-icon');
    await expect(textIcon).toBeVisible();
    const textLabel = textBtn.locator('.dl-rail__btn-label');
    await expect(textLabel).toBeVisible();

    // 检查 Add Art 按钮
    const artBtn = rail.locator('button').filter({ hasText: 'Add Art' });
    await expect(artBtn).toBeVisible();
    const artIcon = artBtn.locator('.dl-rail__btn-icon');
    await expect(artIcon).toBeVisible();
    const artLabel = artBtn.locator('.dl-rail__btn-label');
    await expect(artLabel).toBeVisible();
  });

  test('Sidebar (第四列) 应该显示完整的按钮结构', async ({ page }) => {
    // 检查 Sidebar
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // 检查 Front 按钮
    const frontBtn = sidebar.locator('button').filter({ hasText: 'Front' });
    await expect(frontBtn).toBeVisible();
    
    // 检查是否有缩略图
    const frontThumbnail = frontBtn.locator('.dl-sidebar__thumbnail');
    await expect(frontThumbnail).toBeVisible();
    
    // 检查是否有标签
    const frontLabel = frontBtn.locator('.dl-sidebar__label');
    await expect(frontLabel).toBeVisible();
    await expect(frontLabel).toHaveText('Front');

    // 检查 Back 按钮
    const backBtn = sidebar.locator('button').filter({ hasText: 'Back' });
    await expect(backBtn).toBeVisible();
    const backThumbnail = backBtn.locator('.dl-sidebar__thumbnail');
    await expect(backThumbnail).toBeVisible();

    // 检查 Sleeve Design 按钮
    const sleeveBtn = sidebar.locator('button').filter({ hasText: 'Sleeve Design' });
    await expect(sleeveBtn).toBeVisible();

    // 检查 Zoom 按钮
    const zoomBtn = sidebar.locator('button').filter({ hasText: 'Zoom' });
    await expect(zoomBtn).toBeVisible();
    const zoomIcon = zoomBtn.locator('.dl-sidebar__icon');
    await expect(zoomIcon).toBeVisible();
  });

  test('截图对比：完整页面结构', async ({ page }) => {
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 截图保存
    await page.screenshot({ 
      path: 'test-results/design-lab-5.0-ui-comparison.png',
      fullPage: true 
    });
  });
});
