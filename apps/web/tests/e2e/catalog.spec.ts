/**
 * [2025-11-24 10:35:09] 商品目录端到端测试：验证列表展示、排序与分页
 */
import { test, expect } from './fixtures/test-base';

test.describe('商品目录', () => {
  test('支持排序与分页', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:55:00] 等待页面加载
    
    // [2025-11-28 16:55:00] 等待商品卡片出现，使用更宽松的等待策略
    const productCard = page.locator('.product-card-new, .product-card').first();
    await productCard.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
    
    // 如果商品卡片不可见，尝试等待 API 响应
    const hasProducts = await productCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasProducts) {
      // 等待商品 API 响应
      await page.waitForResponse(
        (response) => response.url().includes('/api/products') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => {});
      // 再次等待商品卡片
      await productCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    }
    
    await expect(productCard).toBeVisible({ timeout: 10000 });

    await page.selectOption('select[name="sort"]', 'price_desc');
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(page.locator('.product-card-new__title').first()).toBeVisible();

    const paginationNext = page.getByRole('link', { name: 'Next →' });
    await expect(paginationNext).toBeVisible();
    await paginationNext.click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('.product-card-new').first()).toBeVisible();
    await expect(page.locator('.breadcrumb-nav')).toContainText('All Products');
  });

  test('Clear All 按钮可重置筛选', async ({ page }) => {
    await page.goto('/products?collection=t-shirts&sort=name_desc&page=2');
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:55:00] 等待页面加载
    
    // [2025-11-28 16:55:00] 等待页面标题出现
    await page.waitForSelector('.plp-new__title', { timeout: 15000 }).catch(() => {});
    await expect(page.locator('.plp-new__title')).toContainText('T-shirts', { timeout: 10000 });
    
    // [2025-11-28 16:55:00] 查找 Clear All 按钮，使用更宽松的选择器
    const clearAllButton = page.getByRole('button', { name: /clear all/i })
      .or(page.locator('button:has-text("Clear All")'))
      .or(page.locator('button:has-text("清除所有")'))
      .first();
    
    await clearAllButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await clearAllButton.click();
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.locator('.plp-new__title')).toContainText('T-shirts');
    await expect(page.locator('.product-card-new').first()).toBeVisible();
  });
});

