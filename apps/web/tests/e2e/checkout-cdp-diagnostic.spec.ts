/**
 * [2025-01-29 23:20:00] CDP Playwright 闭环诊断测试
 * 使用 Chrome DevTools Protocol (CDP) 进行深度诊断
 * 重点测试：添加购物车、Buy Now、Place Order 按钮、Coupon Apply
 */
import { test, expect } from './fixtures/test-base';
import type { Page } from '@playwright/test';
import {
  fillCheckoutAddress,
  fillStripeCard,
  waitForStripeLoad,
  getButtonState,
  selectFirstShippingOption,
  getDefaultTestAddress,
  applyCoupon,
  type ConsoleLog,
  type NetworkRequest,
  type ButtonState,
} from './helpers/checkout-helpers';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

// CDP 捕获的数据结构
interface CDPConsoleLog {
  type: string;
  text: string;
  timestamp: number;
  level?: string;
}

interface CDPNetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  postData?: string;
  timestamp: number;
}

interface CDPNetworkResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
}

interface CDPException {
  message: string;
  stack?: string;
  timestamp: number;
}

test.describe('CDP 闭环诊断测试', () => {
  let availableProductSlug: string | null = null;
  let cdpConsoleLogs: CDPConsoleLog[] = [];
  let cdpNetworkRequests: Map<string, CDPNetworkRequest> = new Map();
  let cdpNetworkResponses: Map<string, CDPNetworkResponse> = new Map();
  let cdpExceptions: CDPException[] = [];
  let cdpSession: any = null;

  test.beforeAll(async ({ browser, api }) => {
    // 找到可用的商品
    console.log('[CDP Test] Finding available product via API...');
    
    try {
      const response = await api.get('/products?limit=20');
      if (response.ok()) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const productWithStock = data.data.find((p: any) => {
            if (p.variants && Array.isArray(p.variants)) {
              return p.variants.some((v: any) => v.stockQuantity > 0);
            }
            return p.stockQuantity > 0;
          }) || data.data[0];
          
          availableProductSlug = productWithStock.slug || productWithStock.id;
          console.log('[CDP Test] Found available product:', availableProductSlug);
        }
      }
    } catch (error: any) {
      console.warn('[CDP Test] API request error:', error.message);
    }
    
    if (!availableProductSlug) {
      availableProductSlug = 'classic-crew-tee'; // Fallback
    }
  });

  test.beforeEach(async ({ page, context }) => {
    // 设置 CDP Session
    console.log('[CDP Test] Setting up CDP Session...');
    
    try {
      cdpSession = await context.newCDPSession(page);
      
      // 启用 Runtime 域
      await cdpSession.send('Runtime.enable');
      
      // 启用 Network 域
      await cdpSession.send('Network.enable');
      
      // 清空之前的数据
      cdpConsoleLogs = [];
      cdpNetworkRequests.clear();
      cdpNetworkResponses.clear();
      cdpExceptions = [];
      
      // 监听控制台日志
      cdpSession.on('Runtime.consoleAPICalled', (params: any) => {
        cdpConsoleLogs.push({
          type: params.type || 'log',
          text: params.args.map((arg: any) => {
            if (arg.type === 'string') return arg.value;
            if (arg.type === 'object' && arg.value) {
              try {
                return JSON.stringify(arg.value);
              } catch {
                return String(arg.value);
              }
            }
            return String(arg.value || '');
          }).join(' '),
          timestamp: Date.now(),
          level: params.type,
        });
      });
      
      // 监听 JavaScript 异常
      cdpSession.on('Runtime.exceptionThrown', (params: any) => {
        const exception = params.exceptionDetails;
        cdpExceptions.push({
          message: exception.exception?.description || exception.text || 'Unknown error',
          stack: exception.stackTrace?.callFrames?.map((f: any) => 
            `${f.functionName}@${f.url}:${f.lineNumber}:${f.columnNumber}`
          ).join('\n'),
          timestamp: Date.now(),
        });
      });
      
      // 监听网络请求
      cdpSession.on('Network.requestWillBeSent', (params: any) => {
        const request: CDPNetworkRequest = {
          requestId: params.requestId,
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          postData: params.request.postData,
          timestamp: params.timestamp,
        };
        cdpNetworkRequests.set(params.requestId, request);
      });
      
      // 监听网络响应
      cdpSession.on('Network.responseReceived', async (params: any) => {
        try {
          const responseBody = await cdpSession.send('Network.getResponseBody', {
            requestId: params.requestId,
          }).catch(() => null);
          
          let body: any = null;
          if (responseBody?.body) {
            try {
              body = JSON.parse(responseBody.body);
            } catch {
              body = responseBody.body;
            }
          }
          
          const response: CDPNetworkResponse = {
            requestId: params.requestId,
            status: params.response.status,
            statusText: params.response.statusText,
            headers: params.response.headers,
            body,
            timestamp: params.timestamp,
          };
          cdpNetworkResponses.set(params.requestId, response);
        } catch (error) {
          // 忽略响应体获取错误
        }
      });
      
      console.log('[CDP Test] CDP Session enabled');
    } catch (error: any) {
      console.warn('[CDP Test] Failed to setup CDP Session:', error.message);
    }
  });

  test('测试添加购物车功能', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, 'No product available for testing');
      return;
    }

    console.log('[CDP Test] ===== 测试添加购物车功能 =====');
    console.log(`[CDP Test] Product slug: ${availableProductSlug}`);

    // 1. 访问商品详情页
    const productUrl = `${FRONTEND_URL}/products/${availableProductSlug}`;
    console.log(`[CDP Test] Navigating to: ${productUrl}`);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');

    // 2. 等待商品加载
    await page.waitForTimeout(2000);

    // 3. 选择颜色和尺寸（如果可用）
    try {
      const colorSelect = page.locator('select[name*="color"], select[id*="color"]').first();
      if (await colorSelect.count() > 0) {
        const colorOptions = await colorSelect.locator('option').all();
        if (colorOptions.length > 1) {
          await colorSelect.selectOption({ index: 1 });
          console.log('[CDP Test] Selected color option');
        }
      }
    } catch (error) {
      console.warn('[CDP Test] Color selection not available or failed');
    }

    try {
      const sizeSelect = page.locator('select[name*="size"], select[id*="size"]').first();
      if (await sizeSelect.count() > 0) {
        const sizeOptions = await sizeSelect.locator('option').all();
        if (sizeOptions.length > 1) {
          await sizeSelect.selectOption({ index: 1 });
          console.log('[CDP Test] Selected size option');
        }
      }
    } catch (error) {
      console.warn('[CDP Test] Size selection not available or failed');
    }

    await page.waitForTimeout(1000);

    // 4. 查找并点击 Add to Cart 按钮
    const addToCartButton = page.locator(
      'button:has-text("Add to cart"), button:has-text("添加到购物车"), button:has-text("Add to Cart")'
    ).first();

    const buttonExists = await addToCartButton.count() > 0;
    if (!buttonExists) {
      console.error('[CDP Test] Add to Cart button not found');
      const pageContent = await page.content();
      console.error('[CDP Test] Page content snippet:', pageContent.substring(0, 2000));
      throw new Error('Add to Cart button not found');
    }

    await expect(addToCartButton).toBeVisible({ timeout: 10000 });

    // 5. 监听添加到购物车的 API 请求
    const addToCartRequestPromise = page.waitForResponse(
      (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    // 6. 点击按钮
    console.log('[CDP Test] Clicking Add to Cart button...');
    await addToCartButton.click();

    // 7. 等待 API 响应
    const addToCartResponse = await addToCartRequestPromise;
    if (addToCartResponse) {
      const status = addToCartResponse.status();
      const responseBody = await addToCartResponse.json().catch(() => null);
      console.log('[CDP Test] Add to Cart API Response:', {
        status,
        body: responseBody,
      });
      expect(status).toBe(201);
    } else {
      console.warn('[CDP Test] Add to Cart API response not received');
    }

    // 8. 检查控制台日志
    const checkoutDebugLogs = cdpConsoleLogs.filter(log => 
      log.text.includes('[Checkout Debug]') || log.text.includes('添加购物车')
    );
    console.log('[CDP Test] Checkout Debug Logs:', checkoutDebugLogs);

    // 9. 检查网络请求
    const cartApiRequests = Array.from(cdpNetworkRequests.values()).filter(req =>
      req.url.includes('/api/cart/items')
    );
    console.log('[CDP Test] Cart API Requests:', cartApiRequests);

    // 10. 检查 JavaScript 错误
    if (cdpExceptions.length > 0) {
      console.warn('[CDP Test] JavaScript Exceptions:', cdpExceptions);
    }

    // 11. 验证成功提示（如果存在）
    try {
      const successMessage = page.locator('text=/成功|success|added/i').first();
      const isVisible = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        console.log('[CDP Test] Success message displayed');
      }
    } catch (error) {
      // 忽略
    }

    console.log('[CDP Test] ===== 添加购物车测试完成 =====');
  });

  test('测试 Buy Now 功能', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, 'No product available for testing');
      return;
    }

    console.log('[CDP Test] ===== 测试 Buy Now 功能 =====');
    console.log(`[CDP Test] Product slug: ${availableProductSlug}`);

    // 1. 访问商品详情页
    const productUrl = `${FRONTEND_URL}/products/${availableProductSlug}`;
    console.log(`[CDP Test] Navigating to: ${productUrl}`);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. 选择颜色和尺寸
    try {
      const colorSelect = page.locator('select[name*="color"], select[id*="color"]').first();
      if (await colorSelect.count() > 0) {
        const colorOptions = await colorSelect.locator('option').all();
        if (colorOptions.length > 1) {
          await colorSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    try {
      const sizeSelect = page.locator('select[name*="size"], select[id*="size"]').first();
      if (await sizeSelect.count() > 0) {
        const sizeOptions = await sizeSelect.locator('option').all();
        if (sizeOptions.length > 1) {
          await sizeSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    await page.waitForTimeout(1000);

    // 3. 查找 Buy Now 按钮
    const buyNowButton = page.locator(
      'button:has-text("Buy Now"), button:has-text("立即购买"), button:has-text("立即下单")'
    ).first();

    const buttonExists = await buyNowButton.count() > 0;
    if (!buttonExists) {
      console.error('[CDP Test] Buy Now button not found');
      throw new Error('Buy Now button not found');
    }

    await expect(buyNowButton).toBeVisible({ timeout: 10000 });

    // 4. 监听添加到购物车的 API 请求
    const addToCartRequestPromise = page.waitForResponse(
      (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    // 5. 监听页面导航
    const navigationPromise = page.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => null);

    // 6. 点击 Buy Now 按钮
    console.log('[CDP Test] Clicking Buy Now button...');
    await buyNowButton.click();

    // 7. 等待添加到购物车
    const addToCartResponse = await addToCartRequestPromise;
    if (addToCartResponse) {
      const status = addToCartResponse.status();
      console.log('[CDP Test] Add to Cart API Response status:', status);
      expect(status).toBe(201);
    }

    // 8. 等待跳转到结账页（应该在成功提示后约 500ms）
    await page.waitForTimeout(1000);
    const navigated = await navigationPromise;
    
    if (navigated) {
      console.log('[CDP Test] Successfully navigated to checkout page');
      expect(page.url()).toContain('/checkout');
    } else {
      const currentUrl = page.url();
      console.warn(`[CDP Test] Navigation timeout. Current URL: ${currentUrl}`);
      // 检查是否已经在结账页
      if (currentUrl.includes('/checkout')) {
        console.log('[CDP Test] Already on checkout page');
      } else {
        throw new Error('Failed to navigate to checkout page');
      }
    }

    // 9. 检查控制台日志
    const buyNowLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('Buy Now') || log.text.includes('立即购买') || log.text.includes('添加购物车成功')
    );
    console.log('[CDP Test] Buy Now related logs:', buyNowLogs);

    // 10. 检查网络请求
    const cartApiRequests = Array.from(cdpNetworkRequests.values()).filter(req =>
      req.url.includes('/api/cart/items')
    );
    console.log('[CDP Test] Cart API Requests:', cartApiRequests);

    console.log('[CDP Test] ===== Buy Now 测试完成 =====');
  });

  test('诊断 Place Order 按钮问题', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, 'No product available for testing');
      return;
    }

    console.log('[CDP Test] ===== 诊断 Place Order 按钮问题 =====');

    // 1. 添加商品到购物车并进入结账页
    console.log('[CDP Test] Adding product to cart, slug:', availableProductSlug);
    
    // 先访问商品页并添加到购物车
    const productUrl = `${FRONTEND_URL}/products/${availableProductSlug}`;
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 选择颜色和尺寸
    try {
      const colorSelect = page.locator('select[name*="color"], select[id*="color"]').first();
      if (await colorSelect.count() > 0) {
        const colorOptions = await colorSelect.locator('option').all();
        if (colorOptions.length > 1) {
          await colorSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    try {
      const sizeSelect = page.locator('select[name*="size"], select[id*="size"]').first();
      if (await sizeSelect.count() > 0) {
        const sizeOptions = await sizeSelect.locator('option').all();
        if (sizeOptions.length > 1) {
          await sizeSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    await page.waitForTimeout(1000);

    // 添加到购物车
    const addToCartButton = page.locator(
      'button:has-text("Add to cart"), button:has-text("添加到购物车")'
    ).first();

    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
    }

    // 2. 进入结账页
    console.log('[CDP Test] Navigating to checkout page...');
    await page.goto(`${FRONTEND_URL}/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 等待 React 和 Stripe 初始化

    // 检查是否被重定向到购物车（购物车为空）
    const currentUrl = page.url();
    if (currentUrl.includes('/cart') || currentUrl.includes('/products')) {
      console.log(`[CDP Test] Redirected to: ${currentUrl} (cart might be empty)`);
      console.log('[CDP Test] ===== 诊断结果 =====');
      console.log('[CDP Test] 购物车为空，无法进入结账页');
      console.log('[CDP Test] 建议：确保数据库中有商品数据，并且商品有库存');
      test.skip(true, 'Cart is empty, cannot proceed to checkout');
      return;
    }

    // 3. 等待表单加载
    try {
      await page.waitForSelector('form', { timeout: 15000 });
      console.log('[CDP Test] Checkout form loaded');
    } catch (error) {
      console.error('[CDP Test] Checkout form not found');
      throw error;
    }

    // 4. 获取 Place Order 按钮
    const placeOrderButton = page.locator(
      'button[type="submit"]:has-text("Place Order"), button[type="submit"]:has-text("下单")'
    ).first();

    const buttonExists = await placeOrderButton.count() > 0;
    if (!buttonExists) {
      console.error('[CDP Test] Place Order button not found');
      throw new Error('Place Order button not found');
    }

    await expect(placeOrderButton).toBeVisible({ timeout: 10000 });

    // 5. 检查初始状态
    console.log('[CDP Test] ===== 初始状态检查 =====');
    let buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[CDP Test] Initial button state:', buttonState);

    // 检查 Stripe 是否加载
    const stripeLoaded = await page.evaluate(() => {
      return typeof (window as any).Stripe !== 'undefined';
    });
    console.log('[CDP Test] Stripe loaded:', stripeLoaded);

    // 检查控制台日志中的调试信息
    const initialDebugLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('[Checkout Debug]')
    );
    console.log('[CDP Test] Initial debug logs:', initialDebugLogs.slice(-10));

    // 6. 填写地址
    console.log('[CDP Test] ===== 填写地址 =====');
    const testAddress = getDefaultTestAddress();
    await fillCheckoutAddress(page, testAddress);
    await page.waitForTimeout(2000);

    // 检查地址填写后的按钮状态
    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[CDP Test] Button state after address:', buttonState);

    // 检查 addressReady 状态
    const addressReadyLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('[Checkout Debug] addressReady:')
    );
    console.log('[CDP Test] Address ready logs:', addressReadyLogs.slice(-5));

    // 7. 选择运费选项
    console.log('[CDP Test] ===== 选择运费选项 =====');
    const shippingSelected = await selectFirstShippingOption(page, 20000);
    console.log('[CDP Test] Shipping selected:', shippingSelected);
    await page.waitForTimeout(2000);

    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[CDP Test] Button state after shipping:', buttonState);

    // 8. 填写卡片信息
    console.log('[CDP Test] ===== 填写卡片信息 =====');
    try {
      await waitForStripeLoad(page, 15000);
      await fillStripeCard(page);
      await page.waitForTimeout(3000); // 等待卡片验证
    } catch (error: any) {
      console.warn('[CDP Test] Failed to fill card:', error.message);
    }

    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[CDP Test] Button state after card:', buttonState);

    // 9. 收集所有调试日志
    const allDebugLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('[Checkout Debug]')
    );
    console.log('[CDP Test] ===== 所有调试日志 =====');
    allDebugLogs.forEach(log => {
      console.log(`[CDP Test] ${log.type}: ${log.text}`);
    });

    // 10. 检查所有禁用条件的状态
    console.log('[CDP Test] ===== 禁用条件检查 =====');
    
    // 通过 CDP 检查 window.Stripe
    const stripeStatus = await cdpSession?.send('Runtime.evaluate', {
      expression: 'typeof window.Stripe !== "undefined"',
    }).catch(() => ({ result: { value: false } }));
    console.log('[CDP Test] Stripe status (via CDP):', stripeStatus?.result?.value);

    // 检查网络请求
    const checkoutApiRequests = Array.from(cdpNetworkRequests.values()).filter(req =>
      req.url.includes('/api/checkout') || req.url.includes('/api/shipping')
    );
    console.log('[CDP Test] Checkout API requests:', checkoutApiRequests);

    // 11. 最终诊断
    console.log('[CDP Test] ===== 最终诊断结果 =====');
    console.log('[CDP Test] Button disabled:', buttonState.disabled);
    console.log('[CDP Test] Disabled reason:', buttonState.disabledReason || buttonState.title);
    console.log('[CDP Test] JavaScript exceptions:', cdpExceptions.length);
    if (cdpExceptions.length > 0) {
      cdpExceptions.forEach(ex => {
        console.log('[CDP Test] Exception:', ex.message);
      });
    }

    // 12. 生成诊断报告
    const diagnosticReport = {
      buttonState,
      stripeLoaded,
      addressReady: addressReadyLogs.some(log => log.text.includes('true')),
      cardComplete: allDebugLogs.some(log => 
        log.text.includes('cardComplete:') && log.text.includes('true')
      ),
      shippingSelected,
      exceptions: cdpExceptions,
      debugLogs: allDebugLogs.length,
    };
    console.log('[CDP Test] Diagnostic report:', JSON.stringify(diagnosticReport, null, 2));

    console.log('[CDP Test] ===== Place Order 按钮诊断完成 =====');
  });

  test('诊断 Coupon Apply 按钮问题', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, 'No product available for testing');
      return;
    }

    console.log('[CDP Test] ===== 诊断 Coupon Apply 按钮问题 =====');

    // 1. 准备结账环境
    console.log('[CDP Test] Setting up checkout environment...');
    
    // 添加商品到购物车
    const productUrl = `${FRONTEND_URL}/products/${availableProductSlug}`;
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 选择颜色和尺寸
    try {
      const colorSelect = page.locator('select[name*="color"], select[id*="color"]').first();
      if (await colorSelect.count() > 0) {
        const colorOptions = await colorSelect.locator('option').all();
        if (colorOptions.length > 1) {
          await colorSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    try {
      const sizeSelect = page.locator('select[name*="size"], select[id*="size"]').first();
      if (await sizeSelect.count() > 0) {
        const sizeOptions = await sizeSelect.locator('option').all();
        if (sizeOptions.length > 1) {
          await sizeSelect.selectOption({ index: 1 });
        }
      }
    } catch (error) {
      // 忽略
    }

    await page.waitForTimeout(1000);

    // 添加到购物车
    const addToCartButton = page.locator(
      'button:has-text("Add to cart"), button:has-text("添加到购物车")'
    ).first();

    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
    }

    // 进入结账页
    await page.goto(`${FRONTEND_URL}/checkout`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 检查是否被重定向
    const currentUrl = page.url();
    if (currentUrl.includes('/cart') || currentUrl.includes('/products')) {
      console.log(`[CDP Test] Redirected to: ${currentUrl} (cart might be empty)`);
      test.skip(true, 'Cart is empty, cannot proceed to checkout');
      return;
    }

    // 2. 填写完整地址（确保 addressReady 为 true）
    console.log('[CDP Test] ===== 填写地址 =====');
    const testAddress = getDefaultTestAddress();
    await fillCheckoutAddress(page, testAddress);
    await page.waitForTimeout(3000); // 等待地址验证

    // 3. 验证地址状态
    console.log('[CDP Test] ===== 验证地址状态 =====');
    const addressReadyLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('[Checkout Debug] addressReady:')
    );
    console.log('[CDP Test] Address ready logs:', addressReadyLogs.slice(-5));

    const addressReady = addressReadyLogs.some(log => log.text.includes('true'));
    console.log('[CDP Test] Address ready:', addressReady);

    // 4. 查找优惠券输入框和 Apply 按钮
    console.log('[CDP Test] ===== 查找优惠券元素 =====');
    const couponInput = page.locator(
      'input[type="text"][placeholder*="coupon"], input[type="text"][placeholder*="优惠券"], input[id*="coupon"]'
    ).first();

    const applyButton = page.locator('button:has-text("Apply"), button:has-text("应用")').first();

    const inputExists = await couponInput.count() > 0;
    const buttonExists = await applyButton.count() > 0;

    if (!inputExists || !buttonExists) {
      console.warn('[CDP Test] Coupon input or button not found');
      console.log('[CDP Test] Input exists:', inputExists);
      console.log('[CDP Test] Button exists:', buttonExists);
    }

    // 5. 检查 Apply 按钮初始状态
    console.log('[CDP Test] ===== 检查 Apply 按钮初始状态 =====');
    if (buttonExists) {
      const initialButtonState = await getButtonState(page, 'button:has-text("Apply")');
      console.log('[CDP Test] Initial Apply button state:', initialButtonState);
    }

    // 6. 输入优惠券代码
    console.log('[CDP Test] ===== 输入优惠券代码 =====');
    if (inputExists) {
      // 使用测试优惠券代码（如果有的话）
      const testCouponCode = process.env.TEST_COUPON_CODE || 'TEST10';
      await couponInput.fill(testCouponCode);
      await page.waitForTimeout(1000);

      // 检查按钮状态变化
      if (buttonExists) {
        const buttonStateAfterInput = await getButtonState(page, 'button:has-text("Apply")');
        console.log('[CDP Test] Apply button state after input:', buttonStateAfterInput);
      }
    }

    // 7. 监听优惠券验证 API 请求
    const couponValidatePromise = page.waitForResponse(
      (response) => response.url().includes('/api/coupons/validate'),
      { timeout: 10000 }
    ).catch(() => null);

    // 8. 点击 Apply 按钮
    console.log('[CDP Test] ===== 点击 Apply 按钮 =====');
    if (buttonExists) {
      const buttonStateBeforeClick = await getButtonState(page, 'button:has-text("Apply")');
      console.log('[CDP Test] Button state before click:', buttonStateBeforeClick);

      if (!buttonStateBeforeClick.disabled) {
        await applyButton.click();
        await page.waitForTimeout(2000);

        // 等待 API 响应
        const couponResponse = await couponValidatePromise;
        if (couponResponse) {
          const status = couponResponse.status();
          const responseBody = await couponResponse.json().catch(() => null);
          console.log('[CDP Test] Coupon validation API response:', {
            status,
            body: responseBody,
          });
        }
      } else {
        console.warn('[CDP Test] Apply button is disabled, cannot click');
        console.warn('[CDP Test] Disabled reason:', buttonStateBeforeClick.disabledReason || buttonStateBeforeClick.title);
      }
    }

    // 9. 检查控制台日志
    console.log('[CDP Test] ===== 检查控制台日志 =====');
    const couponDebugLogs = cdpConsoleLogs.filter(log =>
      log.text.includes('[Checkout Debug]') && (
        log.text.includes('coupon') || 
        log.text.includes('Coupon') ||
        log.text.includes('优惠券')
      )
    );
    console.log('[CDP Test] Coupon debug logs:', couponDebugLogs);

    // 10. 检查网络请求
    console.log('[CDP Test] ===== 检查网络请求 =====');
    const couponApiRequests = Array.from(cdpNetworkRequests.values()).filter(req =>
      req.url.includes('/api/coupons')
    );
    console.log('[CDP Test] Coupon API requests:', couponApiRequests);

    const couponApiResponses = Array.from(cdpNetworkResponses.values()).filter(resp => {
      const request = Array.from(cdpNetworkRequests.values()).find(req => req.requestId === resp.requestId);
      return request && request.url.includes('/api/coupons');
    });
    console.log('[CDP Test] Coupon API responses:', couponApiResponses);

    // 11. 检查错误消息
    console.log('[CDP Test] ===== 检查错误消息 =====');
    const errorMessage = page.locator('.coupon-error-message').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('[CDP Test] Coupon error message:', errorText);
    }

    // 12. 检查成功应用（如果成功）
    const appliedCoupon = page.locator('.coupon-applied, .coupon-info').first();
    const isApplied = await appliedCoupon.isVisible().catch(() => false);
    console.log('[CDP Test] Coupon applied:', isApplied);

    // 13. 最终诊断
    console.log('[CDP Test] ===== 最终诊断结果 =====');
    const diagnosticReport = {
      addressReady,
      inputExists,
      buttonExists,
      buttonState: buttonExists ? await getButtonState(page, 'button:has-text("Apply")') : null,
      couponApiRequests: couponApiRequests.length,
      couponApiResponses: couponApiResponses.length,
      hasError,
      isApplied,
      exceptions: cdpExceptions,
      debugLogs: couponDebugLogs.length,
    };
    console.log('[CDP Test] Diagnostic report:', JSON.stringify(diagnosticReport, null, 2));

    console.log('[CDP Test] ===== Coupon Apply 按钮诊断完成 =====');
  });
});

