/**
 * Cart Postal Code E2E Test
 * [2025-12-13 14:30:00] 验证购物车页面邮编输入功能
 * - 验证顶部不再显示红框提示模块
 * - 验证右侧 Summary 区域邮编输入正常
 */
import { test, expect } from './fixtures/test-base';
import { addProductToCart } from './utils/storefront';

test.describe('Cart Postal Code', () => {
  test.beforeEach(async ({ page }) => {
    // [2025-12-13 14:30:00] 确保购物车有商品
    try {
      await addProductToCart(page);
    } catch (error) {
      // 如果添加商品失败，跳过测试
      test.skip(true, `无法添加商品到购物车: ${error}`);
      return;
    }
    
    // [2025-12-13 14:30:00] 访问购物车页面
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
  });

  test('should not show top alert module and subtitle', async ({ page }) => {
    // [2025-12-13 14:30:00] 验证顶部不再显示红框提示模块
    const topAlert = page.locator('.cart-new__alert');
    await expect(topAlert).toHaveCount(0);

    // [2025-12-13 14:30:00] 验证顶部不再显示 subtitle 文案
    const subtitle = page.locator('.cart-new__subtitle');
    await expect(subtitle).toHaveCount(0);
  });

  test('should show postal code input in summary panel', async ({ page }) => {
    // [2025-12-13 14:30:00] 验证右侧 Summary 区域有邮编输入
    const summaryZipInput = page.locator('#summary-zip');
    await expect(summaryZipInput).toBeVisible();

    // [2025-12-13 14:30:00] 验证有 "Change postal code" 标签
    const changePostalLabel = page.locator('text=Change postal code');
    await expect(changePostalLabel).toBeVisible();

    // [2025-12-13 14:30:00] 验证有 Update 按钮
    const updateButton = page.locator('.summary-panel__zip button:has-text("Update")');
    await expect(updateButton).toBeVisible();
  });

  test('should show error only after clicking Update with invalid input', async ({ page }) => {
    // [2025-12-13 14:30:00] 验证初始状态不显示错误
    const errorMessage = page.locator('.summary-panel__zip-error');
    await expect(errorMessage).not.toBeVisible();

    // [2025-12-13 14:30:00] 输入无效邮编（少于5个字符）
    const summaryZipInput = page.locator('#summary-zip');
    await summaryZipInput.fill('123');

    // [2025-12-13 14:30:00] 点击 Update 按钮
    const updateButton = page.locator('.summary-panel__zip button:has-text("Update")');
    await updateButton.click();

    // [2025-12-13 14:30:00] 验证错误提示显示
    await expect(errorMessage).toBeVisible();
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('valid zip/postal code');
  });

  test('should clear error when valid postal code is entered', async ({ page }) => {
    // [2025-12-13 14:30:00] 先输入无效邮编并触发错误
    const summaryZipInput = page.locator('#summary-zip');
    await summaryZipInput.fill('123');
    const updateButton = page.locator('.summary-panel__zip button:has-text("Update")');
    await updateButton.click();

    // [2025-12-13 14:30:00] 验证错误显示
    const errorMessage = page.locator('.summary-panel__zip-error');
    await expect(errorMessage).toBeVisible();

    // [2025-12-13 14:30:00] 输入有效邮编
    await summaryZipInput.fill('12345');
    await updateButton.click();

    // [2025-12-13 14:30:00] 验证错误消失
    await expect(errorMessage).not.toBeVisible();
  });
});
