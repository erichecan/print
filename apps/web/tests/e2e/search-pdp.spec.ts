/**
 * [2025-11-24 10:36:02] 搜索与商品详情端到端测试
 */
import { test, expect } from './fixtures/test-base';

test.describe('搜索与详情页', () => {
  test('站点搜索可定位商品并成功添加到购物车', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:55:00] 等待页面加载
    
    // [2025-11-28 16:55:00] 等待搜索框出现
    const searchInput = page.getByLabel('Search query').or(page.locator('input[name*="search"]')).first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('Classic Crew Tee');
    
    const searchButton = page.getByRole('button', { name: 'Search products' }).or(
      page.locator('button[type="submit"]')
    ).first();
    await searchButton.click();

    await expect(page).toHaveURL(/products\?search=/, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    
    // [2025-11-28 16:55:00] 等待商品卡片出现，使用更宽松的选择器
    const targetCard = page.locator('.product-card-new, .product-card').filter({ hasText: /Classic Crew Tee/i }).first();
    
    // 先等待商品列表加载
    await page.waitForResponse(
      (response) => response.url().includes('/api/products') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {});
    
    await targetCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(targetCard).toBeVisible({ timeout: 10000 });
    await targetCard.locator('a').first().click();

    await expect(page.getByRole('heading', { name: 'Classic Crew Tee' })).toBeVisible();
    await expect(page.locator('button:has-text("Add to cart")')).toBeEnabled();
    await page.locator('button:has-text("Add to cart")').click();

    await page.goto('/cart');
    await expect(page.locator('.cart-card__design-name')).toContainText('Classic Crew Tee');
  });
});

