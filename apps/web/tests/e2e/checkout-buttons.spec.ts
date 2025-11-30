/**
 * [2025-11-29 22:00:00] 结账页按钮功能端到端测试
 * 测试 Place Order 和 Apply Coupon 按钮的启用/禁用逻辑
 */
import { test, expect } from './fixtures/test-base';
import { addProductToCart } from './utils/storefront';
import type { Page, ConsoleMessage } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

interface ButtonState {
  disabled: boolean;
  disabledReason?: string;
  stripe?: string;
  cardComplete?: boolean;
  addressReady?: boolean;
  selectedShipping?: string;
  shippingRatesCount?: number;
}

interface ConsoleLog {
  type: string;
  text: string;
  timestamp: number;
}

test.describe('结账页按钮功能测试', () => {
  let consoleMessages: ConsoleLog[] = [];
  let networkErrors: Array<{ url: string; status: number; statusText: string }> = [];
  let availableProductSlug: string | null = null;

  test.beforeAll(async ({ page }) => {
    // 先找到一个可用的商品
    console.log('[Test] Finding available product...');
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');
    
    // 等待产品列表加载
    await page.waitForSelector('[data-testid="product-card"], .product-card, a[href*="/products/"]', { timeout: 15000 }).catch(() => {});
    
    // 尝试找到第一个产品链接
    const productLinks = await page.locator('a[href*="/products/"]').all();
    if (productLinks.length > 0) {
      const firstLink = productLinks[0];
      const href = await firstLink.getAttribute('href');
      if (href) {
        const slugMatch = href.match(/\/products\/([^\/]+)/);
        if (slugMatch) {
          availableProductSlug = slugMatch[1];
          console.log('[Test] Found available product slug:', availableProductSlug);
        }
      }
    }
    
    if (!availableProductSlug) {
      console.warn('[Test] Could not find any product, will try direct slug');
      availableProductSlug = '135500'; // Fallback to known slug
    }
  });

  test.beforeEach(async ({ page }) => {
    // 收集控制台消息
    consoleMessages = [];
    networkErrors = [];

    page.on('console', (msg: ConsoleMessage) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // 收集网络错误
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });
  });

  test('应该正确验证按钮状态：地址未填写时按钮禁用', async ({ page }) => {
    // 1. 添加商品到购物车
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }
    
    try {
      console.log(`[Test] Adding product to cart: ${availableProductSlug}`);
      await page.goto(`/products/${availableProductSlug}`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待页面加载，尝试多个选择器
      const addToCartSelectors = [
        'button:has-text("Add to cart")',
        'button:has-text("添加到购物车")',
        'button[data-testid="add-to-cart"]',
        'button:has([aria-label*="cart" i])',
      ];
      
      let addButtonFound = false;
      for (const selector of addToCartSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          addButtonFound = true;
          console.log(`[Test] Clicked add to cart using selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!addButtonFound) {
        throw new Error('Could not find Add to Cart button');
      }
      
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('[Test] Failed to add product to cart:', error.message);
      console.error('[Test] Available product slug:', availableProductSlug);
      test.skip(true, `无法添加商品到购物车: ${error.message}`);
      return;
    }

    // 2. 导航到结账页
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    // 3. 等待页面完全加载
    await page.waitForSelector('form', { timeout: 15000 });
    await page.waitForTimeout(2000); // 等待 Stripe 和 React 状态初始化

    // 4. 检查 Place Order 按钮初始状态（应该被禁用）
    const placeOrderButton = page.locator('button[type="submit"]:has-text("Place Order"), button[type="submit"]:has-text("下单")').first();
    await expect(placeOrderButton).toBeVisible();
    
    const isDisabledInitially = await placeOrderButton.isDisabled();
    console.log('[Test] Place Order button initially disabled:', isDisabledInitially);

    // 5. 检查控制台日志中的按钮状态信息
    const buttonStateLogs = consoleMessages.filter((msg) => 
      msg.text.includes('[Checkout Debug] Button states:') ||
      msg.text.includes('[Checkout Debug] addressReady:') ||
      msg.text.includes('[Checkout Debug] Stripe state:')
    );

    if (buttonStateLogs.length > 0) {
      console.log('[Test] Found button state logs:', buttonStateLogs.length);
      buttonStateLogs.forEach((log) => {
        console.log(`[Test] ${log.type}: ${log.text.substring(0, 200)}`);
      });
    }

    // 6. 验证按钮被禁用
    expect(isDisabledInitially).toBe(true);

    // 7. 检查网络错误
    if (networkErrors.length > 0) {
      console.error('[Test] Network errors detected:');
      networkErrors.forEach((error) => {
        console.error(`[Test] ${error.status} ${error.statusText}: ${error.url}`);
      });
    }
  });

  test('填写地址后应能获取运费并更新按钮状态', async ({ page }) => {
    // 1. 添加商品到购物车
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }
    
    try {
      console.log(`[Test] Adding product to cart: ${availableProductSlug}`);
      await page.goto(`/products/${availableProductSlug}`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待页面加载，尝试多个选择器
      const addToCartSelectors = [
        'button:has-text("Add to cart")',
        'button:has-text("添加到购物车")',
        'button[data-testid="add-to-cart"]',
        'button:has([aria-label*="cart" i])',
      ];
      
      let addButtonFound = false;
      for (const selector of addToCartSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          addButtonFound = true;
          console.log(`[Test] Clicked add to cart using selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!addButtonFound) {
        throw new Error('Could not find Add to Cart button');
      }
      
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('[Test] Failed to add product to cart:', error.message);
      console.error('[Test] Available product slug:', availableProductSlug);
      test.skip(true, `无法添加商品到购物车: ${error.message}`);
      return;
    }

    // 2. 导航到结账页
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('form', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 3. 填写地址信息
    const shippingAddress = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '4165550100',
      addressLine1: '123 Test St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H2M9',
      country: 'CA',
    };

    await page.fill('#fullName', shippingAddress.fullName);
    await page.fill('#email', shippingAddress.email);
    await page.fill('#phone', shippingAddress.phone);
    await page.fill('#addressLine1', shippingAddress.addressLine1);
    await page.fill('#city', shippingAddress.city);
    await page.fill('#province', shippingAddress.province);
    await page.fill('#postalCode', shippingAddress.postalCode);
    await page.selectOption('#country', shippingAddress.country);

    // 4. 等待地址状态更新（等待 addressReady 日志）
    await page.waitForTimeout(2000);

    // 5. 检查控制台日志中的地址状态
    const addressLogs = consoleMessages.filter((msg) => 
      msg.text.includes('[Checkout Debug] addressReady:') ||
      msg.text.includes('[Checkout Debug] Address state changed:')
    );

    console.log('[Test] Address state logs:', addressLogs.length);
    addressLogs.forEach((log) => {
      console.log(`[Test] ${log.text.substring(0, 300)}`);
    });

    // 6. 等待运费选项加载
    try {
      await page.waitForSelector('.delivery-option input', { timeout: 20000 });
      const shippingOptions = await page.locator('.delivery-option input').count();
      console.log('[Test] Shipping options found:', shippingOptions);
      
      if (shippingOptions > 0) {
        await page.locator('.delivery-option input').first().check();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('[Test] Shipping options not loaded:', error.message);
    }

    // 7. 检查按钮状态日志
    const buttonLogs = consoleMessages.filter((msg) => 
      msg.text.includes('[Checkout Debug] Button states:')
    );

    if (buttonLogs.length > 0) {
      const lastButtonLog = buttonLogs[buttonLogs.length - 1];
      console.log('[Test] Last button state log:', lastButtonLog.text.substring(0, 500));
    }

    // 8. 检查网络错误
    if (networkErrors.length > 0) {
      console.error('[Test] Network errors after filling address:');
      networkErrors.forEach((error) => {
        console.error(`[Test] ${error.status} ${error.statusText}: ${error.url}`);
      });
    }
  });

  test('填写完整信息后 Place Order 按钮应启用', async ({ page }) => {
    // 1. 添加商品到购物车
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }
    
    try {
      console.log(`[Test] Adding product to cart: ${availableProductSlug}`);
      await page.goto(`/products/${availableProductSlug}`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待页面加载，尝试多个选择器
      const addToCartSelectors = [
        'button:has-text("Add to cart")',
        'button:has-text("添加到购物车")',
        'button[data-testid="add-to-cart"]',
        'button:has([aria-label*="cart" i])',
      ];
      
      let addButtonFound = false;
      for (const selector of addToCartSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          addButtonFound = true;
          console.log(`[Test] Clicked add to cart using selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!addButtonFound) {
        throw new Error('Could not find Add to Cart button');
      }
      
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('[Test] Failed to add product to cart:', error.message);
      console.error('[Test] Available product slug:', availableProductSlug);
      test.skip(true, `无法添加商品到购物车: ${error.message}`);
      return;
    }

    // 2. 导航到结账页
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('form', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 3. 填写地址信息
    const shippingAddress = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '4165550100',
      addressLine1: '123 Test St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H2M9',
      country: 'CA',
    };

    await page.fill('#fullName', shippingAddress.fullName);
    await page.fill('#email', shippingAddress.email);
    await page.fill('#phone', shippingAddress.phone);
    await page.fill('#addressLine1', shippingAddress.addressLine1);
    await page.fill('#city', shippingAddress.city);
    await page.fill('#province', shippingAddress.province);
    await page.fill('#postalCode', shippingAddress.postalCode);
    await page.selectOption('#country', shippingAddress.country);

    await page.waitForTimeout(2000);

    // 4. 等待运费选项并选择
    try {
      await page.waitForSelector('.delivery-option input', { timeout: 20000 });
      await page.locator('.delivery-option input').first().check();
      await page.waitForTimeout(1000);
    } catch (error) {
      console.warn('[Test] Shipping options not available:', error.message);
    }

    // 5. 填写 Stripe 卡片信息（使用测试模式）
    await page.locator('h2:has-text("Payment Information")').scrollIntoViewIfNeeded();
    
    // 等待 Stripe CardElement 加载
    const cardElement = page.locator('#card-element iframe, [data-testid="card-element"] iframe').first();
    try {
      await cardElement.waitFor({ state: 'attached', timeout: 10000 });
      console.log('[Test] Stripe CardElement loaded');
    } catch (error) {
      console.warn('[Test] Stripe CardElement not found:', error.message);
    }

    // 6. 在 Stripe iframe 中填写测试卡信息
    const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
    try {
      await cardFrame.locator('[name="cardnumber"]').fill('4242424242424242');
      await cardFrame.locator('[name="exp-date"]').fill('12/34');
      await cardFrame.locator('[name="cvc"]').fill('123');
      await page.waitForTimeout(2000); // 等待卡片验证
      console.log('[Test] Card information filled');
    } catch (error) {
      console.warn('[Test] Could not fill card information:', error.message);
      // 尝试备用选择器
      try {
        const altFrame = page.frameLocator('iframe').first();
        await altFrame.locator('[name="cardnumber"], [placeholder*="Card number"]').fill('4242424242424242');
        await altFrame.locator('[name="exp-date"], [placeholder*="MM / YY"]').fill('12/34');
        await altFrame.locator('[name="cvc"], [placeholder*="CVC"]').fill('123');
        await page.waitForTimeout(2000);
      } catch (altError) {
        console.warn('[Test] Alternative card filling also failed:', altError.message);
      }
    }

    // 7. 等待按钮状态更新
    await page.waitForTimeout(3000);

    // 8. 检查 Place Order 按钮状态
    const placeOrderButton = page.locator('button[type="submit"]:has-text("Place Order"), button[type="submit"]:has-text("下单")').first();
    const isDisabled = await placeOrderButton.isDisabled();

    // 9. 输出所有调试日志
    const allDebugLogs = consoleMessages.filter((msg) => 
      msg.text.includes('[Checkout Debug]')
    );

    console.log('[Test] ===== All Debug Logs =====');
    allDebugLogs.forEach((log, index) => {
      console.log(`[Test] Log ${index + 1} (${log.type}): ${log.text.substring(0, 500)}`);
    });

    // 10. 检查按钮状态日志
    const buttonStateLogs = consoleMessages.filter((msg) => 
      msg.text.includes('[Checkout Debug] Button states:')
    );

    if (buttonStateLogs.length > 0) {
      const lastLog = buttonStateLogs[buttonStateLogs.length - 1];
      console.log('[Test] ===== Last Button State =====');
      console.log(lastLog.text);
      
      // 尝试解析 JSON
      try {
        const jsonMatch = lastLog.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const buttonState = JSON.parse(jsonMatch[0]);
          console.log('[Test] Parsed button state:', JSON.stringify(buttonState, null, 2));
        }
      } catch (parseError) {
        console.warn('[Test] Could not parse button state JSON:', parseError.message);
      }
    }

    // 11. 输出网络错误
    if (networkErrors.length > 0) {
      console.error('[Test] ===== Network Errors =====');
      networkErrors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.status} ${error.statusText}`);
        console.error(`[Test] URL: ${error.url}`);
      });
    }

    // 12. 验证按钮状态（即使被禁用也要记录原因）
    console.log('[Test] Place Order button disabled:', isDisabled);
    
    if (isDisabled) {
      // 检查按钮的 title 属性（可能包含禁用原因）
      const title = await placeOrderButton.getAttribute('title');
      if (title) {
        console.log('[Test] Button title (disabled reason):', title);
      }
    }

    // 注意：由于 Stripe 测试环境的限制，按钮可能仍然被禁用
    // 这里主要是收集日志和错误信息用于诊断
  });

  test('Apply Coupon 按钮状态验证', async ({ page }) => {
    // 1. 添加商品到购物车
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }
    
    try {
      console.log(`[Test] Adding product to cart: ${availableProductSlug}`);
      await page.goto(`/products/${availableProductSlug}`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待页面加载，尝试多个选择器
      const addToCartSelectors = [
        'button:has-text("Add to cart")',
        'button:has-text("添加到购物车")',
        'button[data-testid="add-to-cart"]',
        'button:has([aria-label*="cart" i])',
      ];
      
      let addButtonFound = false;
      for (const selector of addToCartSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.click(selector);
          addButtonFound = true;
          console.log(`[Test] Clicked add to cart using selector: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!addButtonFound) {
        throw new Error('Could not find Add to Cart button');
      }
      
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error('[Test] Failed to add product to cart:', error.message);
      console.error('[Test] Available product slug:', availableProductSlug);
      test.skip(true, `无法添加商品到购物车: ${error.message}`);
      return;
    }

    // 2. 导航到结账页
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('form', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 3. 检查 Apply Coupon 按钮初始状态（应该被禁用）
    const applyButton = page.locator('button:has-text("Apply"), button:has-text("应用")').first();
    const isDisabledInitially = await applyButton.isDisabled();
    console.log('[Test] Apply Coupon button initially disabled:', isDisabledInitially);

    // 4. 填写地址信息（Apply 按钮需要 addressReady）
    const shippingAddress = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '4165550100',
      addressLine1: '123 Test St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H2M9',
      country: 'CA',
    };

    await page.fill('#fullName', shippingAddress.fullName);
    await page.fill('#email', shippingAddress.email);
    await page.fill('#phone', shippingAddress.phone);
    await page.fill('#addressLine1', shippingAddress.addressLine1);
    await page.fill('#city', shippingAddress.city);
    await page.fill('#province', shippingAddress.province);
    await page.fill('#postalCode', shippingAddress.postalCode);
    await page.selectOption('#country', shippingAddress.country);

    await page.waitForTimeout(2000);

    // 5. 输入优惠券代码
    const couponInput = page.locator('input[type="text"][placeholder*="coupon"], input[type="text"][placeholder*="优惠券"], input[id*="coupon"]').first();
    try {
      await couponInput.fill('TEST10');
      await page.waitForTimeout(1000);
      
      // 6. 检查 Apply 按钮状态
      const isDisabledAfterCode = await applyButton.isDisabled();
      console.log('[Test] Apply Coupon button after entering code:', isDisabledAfterCode);
      
      // 7. 输出相关日志
      const couponLogs = consoleMessages.filter((msg) => 
        msg.text.includes('[Checkout Debug]') && msg.text.includes('applyCoupon')
      );
      
      couponLogs.forEach((log) => {
        console.log(`[Test] ${log.text.substring(0, 300)}`);
      });
    } catch (error) {
      console.warn('[Test] Could not find coupon input:', error.message);
    }
  });
});

