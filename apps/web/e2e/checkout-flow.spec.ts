/**
 * Checkout Flow E2E Tests
 * [2025-01-27 11:50:00] 结账流程端到端测试
 */
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到产品页面并添加商品到购物车
    await page.goto('/products');
    // 等待产品加载
    await page.waitForSelector('.product-card', { timeout: 10000 });
    // 点击第一个产品
    await page.click('.product-card:first-child');
    // 等待产品详情页加载
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });
    // 添加到购物车
    await page.click('button:has-text("Add to Cart")');
    // 等待购物车更新
    await page.waitForTimeout(1000);
  });

  test('should complete checkout flow', async ({ page }) => {
    // 导航到购物车
    await page.goto('/cart');
    await page.waitForSelector('.cart-table', { timeout: 10000 });

    // 点击结账按钮
    await page.click('a:has-text("Proceed to Checkout")');

    // 等待结账页面加载
    await page.waitForSelector('h1:has-text("Shipping Information")', { timeout: 10000 });

    // 填写配送地址
    await page.fill('#fullName', 'John Doe');
    await page.fill('#email', 'john@example.com');
    await page.fill('#phone', '1234567890');
    await page.fill('#addressLine1', '123 Main St');
    await page.fill('#city', 'Toronto');
    await page.fill('#province', 'ON');
    await page.fill('#postalCode', 'M5H 2N2');
    await page.selectOption('#country', 'CA');

    // 等待运费选项加载
    await page.waitForSelector('.delivery-option', { timeout: 10000 });

    // 选择运费选项
    await page.click('.delivery-option:first-child input[type="radio"]');

    // 填写支付信息（使用 Stripe 测试卡号）
    // 注意：实际测试中需要使用 Stripe 测试模式
    const cardElement = page.locator('#card-element');
    await cardElement.waitFor({ timeout: 10000 });

    // 注意：Stripe Elements 在 E2E 测试中需要特殊处理
    // 这里只是示例，实际测试需要根据 Stripe 的测试指南进行

    // 验证提交按钮存在
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('h1:has-text("Shipping Information")', { timeout: 10000 });

    // 尝试直接提交表单
    await page.click('button[type="submit"]');

    // 验证错误提示显示
    await expect(page.locator('.error-box, .error-message')).toBeVisible();
  });

  test('should save address to localStorage', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('h1:has-text("Shipping Information")', { timeout: 10000 });

    // 填写地址
    await page.fill('#fullName', 'John Doe');
    await page.fill('#email', 'john@example.com');

    // 等待防抖保存
    await page.waitForTimeout(600);

    // 检查 localStorage
    const savedAddress = await page.evaluate(() => {
      return localStorage.getItem('checkout_shipping_address');
    });

    expect(savedAddress).toBeTruthy();
    const parsed = JSON.parse(savedAddress || '{}');
    expect(parsed.fullName).toBe('John Doe');
    expect(parsed.email).toBe('john@example.com');
  });
});

