/**
 * [2025-11-24 10:36:02] 搜索与商品详情端到端测试
 */
import { test, expect } from './fixtures/test-base';

test.describe('搜索与详情页', () => {
  test('站点搜索可定位商品并成功添加到购物车', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search query').fill('Classic Crew Tee');
    await page.getByRole('button', { name: 'Search products' }).click();

    await expect(page).toHaveURL(/products\?search=/);
    const targetCard = page.locator('.product-card-new').filter({ hasText: 'Classic Crew Tee' });
    await expect(targetCard).toBeVisible();
    await targetCard.locator('a').first().click();

    await expect(page.getByRole('heading', { name: 'Classic Crew Tee' })).toBeVisible();
    await expect(page.locator('button:has-text("Add to cart")')).toBeEnabled();
    await page.locator('button:has-text("Add to cart")').click();

    await page.goto('/cart');
    await expect(page.locator('.cart-card__design-name')).toContainText('Classic Crew Tee');
  });
});

