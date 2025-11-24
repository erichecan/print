/**
 * [2025-11-24 10:37:18] 购物车与优惠券端到端测试
 */
import { test, expect } from './fixtures/test-base';
import { addProductToCart } from './utils/storefront';

test.describe('购物车与优惠券', () => {
  test('更新数量并应用优惠券', async ({ page }) => {
    await addProductToCart(page);

    await page.goto('/cart');
    await expect(page.locator('.cart-card')).toHaveCount(1);

    const qtyInput = page.locator('.cart-card__qty input').first();
    await qtyInput.fill('2');
    await qtyInput.blur();
    await expect(page.locator('.cart-card__qty input').first()).toHaveValue('2');

    const postalInput = page.locator('#cart-zip');
    await postalInput.fill('M5V2T6');
    await page.locator('.cart-new__alert-form button:has-text("Update")').click();
    await expect(page.locator('.cart-new__alert')).not.toHaveClass(/has-error/);

    const couponCode = process.env.E2E_COUPON_FIXED || 'SAVE10CAD';
    await page.getByRole('button', { name: 'Add discount code' }).click();
    await page.fill('#summary-coupon', couponCode);
    await page.locator('.summary-panel__coupon button:has-text("Apply")').click();

    await expect(page.locator('.summary-panel__row').filter({ hasText: `Coupon (${couponCode})` })).toBeVisible();
    await expect(page.locator('.summary-panel__row').filter({ hasText: 'Total' }).locator('span').last()).toContainText('$');
  });
});

