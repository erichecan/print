/**
 * [2025-11-24 10:35:09] 商品目录端到端测试：验证列表展示、排序与分页
 */
import { test, expect } from './fixtures/test-base';

test.describe('商品目录', () => {
  test('支持排序与分页', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('.product-card-new').first()).toBeVisible();

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
    await expect(page.locator('.plp-new__title')).toContainText('T-shirts');
    await page.getByRole('button', { name: 'Clear All' }).click();
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.locator('.plp-new__title')).toContainText('T-shirts');
    await expect(page.locator('.product-card-new').first()).toBeVisible();
  });
});

