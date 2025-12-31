/**
* 结账页面综合诊断测试
 * 使用 Chrome DevTools Protocol (CDP) 和 Playwright 进行闭环测试
 * 重点测试：添加购物车、Buy Now、Place Order 按钮、Coupon Apply
 */
import { test, expect } from './fixtures/test-base';
import { addProductToCart } from './utils/storefront';
import type { Page, ConsoleMessage } from '@playwright/test';
import {
  fillCheckoutAddress,
  fillStripeCard,
  waitForStripeLoad,
  getButtonState,
  captureConsoleLogs,
  captureNetworkRequests,
  filterDebugLogs,
  selectFirstShippingOption,
  getDefaultTestAddress,
  waitForAddressReady,
  applyCoupon,
  type ConsoleLog,
  type NetworkRequest,
  type ButtonState,
} from './helpers/checkout-helpers';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

test.describe('结账页面综合诊断测试', () => {
  let availableProductSlug: string | null = null;
  let consoleLogs: ConsoleLog[] = [];
  let networkRequests: NetworkRequest[] = [];
  let cdpSession: any = null;

  test.beforeAll(async ({ browser, api }) => {
    // 找到可用的商品 - 先通过 API 获取，再验证页面可访问
    console.log('[Test] Finding available product via API...');
    
    try {
      // 通过 API 获取商品列表
      const response = await api.get('/products?limit=20');
      if (response.ok()) {
        const data = await response.json();
        console.log('[Test] API response status:', response.status());
        console.log('[Test] API response data keys:', Object.keys(data));
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          // 找到第一个有库存的商品
          const productWithStock = data.data.find((p: any) => {
            if (p.variants && Array.isArray(p.variants)) {
              return p.variants.some((v: any) => v.stockQuantity > 0);
            }
            return p.stockQuantity > 0;
          }) || data.data[0];
          
          availableProductSlug = productWithStock.slug || productWithStock.id;
          console.log('[Test] Found available product via API:', {
            slug: availableProductSlug,
            name: productWithStock.name,
            id: productWithStock.id,
          });
        } else {
          console.warn('[Test] API returned no products');
        }
      } else {
        console.warn('[Test] API request failed:', response.status());
      }
    } catch (error: any) {
      console.warn('[Test] API request error:', error.message);
    }
    
    // 如果 API 失败，尝试通过页面导航
    if (!availableProductSlug) {
      console.log('[Test] Trying to find product via page navigation...');
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        await page.goto(`${FRONTEND_URL}/products`);
        await page.waitForLoadState('domcontentloaded');
        
        // 等待 API 响应
        await page.waitForResponse(
          (response) => response.url().includes('/api/products') && response.status() === 200,
          { timeout: 15000 }
        ).catch(() => {});
        
        // 等待客户端渲染完成 - 等待商品卡片出现
        await page.waitForTimeout(3000); // 等待 React 渲染
        
        // 等待商品 API 响应
        try {
          await page.waitForResponse(
            (response) => response.url().includes('/api/products') && response.status() === 200,
            { timeout: 20000 }
          );
        } catch (e) {
          console.warn('[Test] Product API response timeout');
        }
        
        await page.waitForTimeout(2000); // 额外等待渲染
        
        // 尝试多种选择器查找商品链接
        const productSelectors = [
          'a[href*="/products/"]',
          '.product-card a',
          '.product-card-new a',
          '[class*="product-card"] a',
          'article a',
          '[class*="product"] a[href*="/products/"]',
        ];
        
        let productLink = null;
        for (const selector of productSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
            const links = await page.locator(selector).all();
            if (links.length > 0) {
              productLink = links[0];
              console.log(`[Test] Found product link using selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        
        if (productLink) {
          const href = await productLink.getAttribute('href');
          if (href) {
            const slugMatch = href.match(/\/products\/([^\/]+)/);
            if (slugMatch) {
              availableProductSlug = slugMatch[1];
              console.log('[Test] Found available product slug via page:', availableProductSlug);
            }
          }
        }
      } catch (error) {
        console.warn('[Test] Error finding product via page:', error);
      } finally {
        await context.close();
      }
    }
    
    if (!availableProductSlug) {
      console.warn('[Test] Could not find any product, will try fallback slugs');
      // 尝试几个常见的 slug
      availableProductSlug = 'classic-crew-tee'; // Fallback
    }
  });

  test.beforeEach(async ({ page }) => {
    // 重置日志收集
    consoleLogs = [];
    networkRequests = [];

    // 设置控制台日志监听
    page.on('console', (msg: ConsoleMessage) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // 设置网络请求监听
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        networkRequests.push({
          url,
          method: request.method(),
          timestamp: Date.now(),
        });
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const request = networkRequests.find((r) => r.url === url && !r.status);
        if (request) {
          request.status = response.status();
          request.statusText = response.statusText();
          try {
            request.responseBody = await response.json().catch(() => null);
          } catch {
            request.responseBody = null;
          }
        }
      }
    });

    // 设置 CDP Session（如果支持）
    try {
      const context = page.context();
      cdpSession = await context.newCDPSession(page);
      
      // 启用 Runtime 和 Network 域
      await cdpSession.send('Runtime.enable');
      await cdpSession.send('Network.enable');
      
      // 监听控制台 API 调用
      cdpSession.on('Runtime.consoleAPICalled', (params: any) => {
        consoleLogs.push({
          type: params.type || 'log',
          text: params.args?.map((arg: any) => arg.value || JSON.stringify(arg)).join(' ') || '',
          timestamp: Date.now(),
        });
      });
      
      // 监听异常
      cdpSession.on('Runtime.exceptionThrown', (params: any) => {
        const exception = params.exceptionDetails;
        consoleLogs.push({
          type: 'error',
          text: `Exception: ${exception.text} - ${exception.exception?.description || ''}`,
          timestamp: Date.now(),
        });
      });
      
      console.log('[Test] CDP Session enabled');
    } catch (error) {
      console.warn('[Test] CDP Session not available:', error);
      cdpSession = null;
    }
  });

  test.afterEach(async () => {
    // 清理 CDP Session
    if (cdpSession) {
      try {
        await cdpSession.detach();
      } catch (error) {
        // Ignore
      }
    }
  });

  test('测试添加购物车功能', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }

    console.log(`[Test] ===== 测试添加购物车功能 =====`);
    console.log(`[Test] Product slug: ${availableProductSlug}`);

    // 1. 访问商品详情页
    console.log(`[Test] Navigating to product page: /products/${availableProductSlug}`);
    await page.goto(`/products/${availableProductSlug}`, { waitUntil: 'domcontentloaded' });
    
    // 检查页面是否加载成功（不是 404）
    const pageTitle = await page.title().catch(() => '');
    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      throw new Error(`Product page not found: ${availableProductSlug}`);
    }
    
    // 等待商品数据加载
    await page.waitForResponse(
      (response) => response.url().includes(`/api/products`) && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {});

    // 2. 等待商品数据加载完成
    await page.waitForResponse(
      (response) => response.url().includes(`/api/products`) && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {});
    
    await page.waitForTimeout(2000); // 等待 React 渲染
    
    // 3. 选择颜色和尺寸（如果需要）
    try {
      // 尝试选择颜色
      const colorButtons = page.locator('button[class*="color"], [data-color], input[type="radio"][name*="color"]').first();
      const colorVisible = await colorButtons.isVisible({ timeout: 3000 }).catch(() => false);
      if (colorVisible) {
        await colorButtons.click();
        await page.waitForTimeout(500);
        console.log('[Test] Selected color');
      }
      
      // 尝试选择尺寸
      const sizeButtons = page.locator('button[class*="size"], [data-size], select[name*="size"], input[type="radio"][name*="size"]').first();
      const sizeVisible = await sizeButtons.isVisible({ timeout: 3000 }).catch(() => false);
      if (sizeVisible) {
        // 如果是 select，使用 selectOption
        const isSelect = await sizeButtons.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
        if (isSelect) {
          await sizeButtons.selectOption({ index: 1 }).catch(() => {});
        } else {
          await sizeButtons.click();
        }
        await page.waitForTimeout(500);
        console.log('[Test] Selected size');
      }
    } catch (error) {
      console.warn('[Test] Could not select color/size, continuing:', error);
    }
    
    // 4. 等待并查找 Add to Cart 按钮
    const addToCartSelectors = [
      'button:has-text("Add to cart")',
      'button:has-text("添加到购物车")',
      'button:has-text("Add to Cart")',
      'button[data-testid="add-to-cart"]',
      'button:has([aria-label*="cart" i])',
      '.product-actions-mobile button:has-text("Add to cart")',
      '.product-actions-mobile button:has-text("添加到购物车")',
    ];
    
    let addButtonFound = false;
    let addButton = null;
    
    for (const selector of addToCartSelectors) {
      try {
        addButton = page.locator(selector).first();
        await addButton.waitFor({ state: 'visible', timeout: 5000 });
        const isDisabled = await addButton.isDisabled();
        if (!isDisabled) {
          addButtonFound = true;
          console.log(`[Test] Found Add to Cart button using selector: ${selector}`);
          break;
        } else {
          console.log(`[Test] Add to Cart button found but disabled: ${selector}`);
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!addButtonFound || !addButton) {
      // 输出页面内容用于调试（如果页面仍然打开）
      try {
        const pageContent = await page.content();
        console.error('[Test] Page content snippet:', pageContent.substring(0, 1000));
      } catch (e) {
        console.error('[Test] Page already closed, cannot get content');
      }
      
      // 输出所有可见的按钮用于调试
      try {
        const allButtons = await page.locator('button').all();
        console.error(`[Test] Found ${allButtons.length} buttons on page`);
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const text = await allButtons[i].textContent().catch(() => '');
          const isDisabled = await allButtons[i].isDisabled().catch(() => false);
          console.error(`[Test] Button ${i}: "${text}" (disabled: ${isDisabled})`);
        }
      } catch (e) {
        console.error('[Test] Could not list buttons');
      }
      
      throw new Error('Could not find enabled Add to Cart button');
    }

    // 3. 检查按钮初始状态
    const initialDisabled = await addButton.isDisabled();
    console.log(`[Test] Add to Cart button initially disabled: ${initialDisabled}`);

    // 4. 监听网络请求（添加购物车 API）
    const addToCartRequestPromise = page.waitForResponse(
      (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    // 5. 点击 Add to Cart 按钮
    console.log('[Test] Clicking Add to Cart button...');
    await addButton.click();
    
    // 6. 等待 API 响应
    const response = await addToCartRequestPromise;
    if (response) {
      const status = response.status();
      const body = await response.json().catch(() => null);
      console.log(`[Test] Add to Cart API response: ${status}`);
      console.log(`[Test] Response body:`, JSON.stringify(body, null, 2));
      
      expect(status).toBe(200);
    } else {
      console.warn('[Test] No API response received for Add to Cart');
    }

    // 7. 等待购物车状态更新
    await page.waitForTimeout(2000);

    // 8. 检查控制台日志
    const addToCartLogs = consoleLogs.filter((log) =>
      log.text.toLowerCase().includes('add') && log.text.toLowerCase().includes('cart')
    );
    console.log(`[Test] Found ${addToCartLogs.length} Add to Cart related logs`);
    addToCartLogs.forEach((log, index) => {
      console.log(`[Test] Log ${index + 1} (${log.type}): ${log.text.substring(0, 200)}`);
    });

    // 9. 检查网络请求
    const cartRequests = networkRequests.filter((req) => req.url.includes('/api/cart'));
    console.log(`[Test] Found ${cartRequests.length} cart-related network requests`);
    cartRequests.forEach((req, index) => {
      console.log(`[Test] Request ${index + 1}: ${req.method} ${req.url} - ${req.status || 'pending'}`);
    });

    // 10. 验证成功提示（如果有）
    const successMessage = page.locator('text=/成功|success|added/i').first();
    const hasSuccessMessage = await successMessage.isVisible().catch(() => false);
    console.log(`[Test] Success message visible: ${hasSuccessMessage}`);

    // 11. 检查错误
    const errors = consoleLogs.filter((log) => log.type === 'error');
    if (errors.length > 0) {
      console.error(`[Test] Found ${errors.length} errors:`);
      errors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.text.substring(0, 300)}`);
      });
    }

    console.log('[Test] ===== 添加购物车测试完成 =====');
  });

  test('测试 Buy Now 功能', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }

    console.log(`[Test] ===== 测试 Buy Now 功能 =====`);
    console.log(`[Test] Product slug: ${availableProductSlug}`);

    // 1. 访问商品详情页
    console.log(`[Test] Navigating to product page: /products/${availableProductSlug}`);
    await page.goto(`/products/${availableProductSlug}`, { waitUntil: 'domcontentloaded' });
    
    // 检查页面是否加载成功（不是 404）
    const pageTitle = await page.title().catch(() => '');
    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      throw new Error(`Product page not found: ${availableProductSlug}`);
    }
    
    await page.waitForResponse(
      (response) => response.url().includes(`/api/products`) && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {});

    // 2. 等待商品数据加载完成
    await page.waitForResponse(
      (response) => response.url().includes(`/api/products`) && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {});
    
    await page.waitForTimeout(2000); // 等待 React 渲染
    
    // 3. 选择颜色和尺寸（如果需要）
    try {
      const colorButtons = page.locator('button[class*="color"], [data-color], input[type="radio"][name*="color"]').first();
      const colorVisible = await colorButtons.isVisible({ timeout: 3000 }).catch(() => false);
      if (colorVisible) {
        await colorButtons.click();
        await page.waitForTimeout(500);
      }
      
      const sizeButtons = page.locator('button[class*="size"], [data-size], select[name*="size"], input[type="radio"][name*="size"]').first();
      const sizeVisible = await sizeButtons.isVisible({ timeout: 3000 }).catch(() => false);
      if (sizeVisible) {
        const isSelect = await sizeButtons.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
        if (isSelect) {
          await sizeButtons.selectOption({ index: 1 }).catch(() => {});
        } else {
          await sizeButtons.click();
        }
        await page.waitForTimeout(500);
      }
    } catch (error) {
      console.warn('[Test] Could not select color/size, continuing:', error);
    }
    
    // 4. 查找 Buy Now 按钮
    const buyNowSelectors = [
      'button:has-text("Buy Now")',
      'button:has-text("立即购买")',
      'button:has-text("Buy now")',
      '.product-actions-mobile button:has-text("Buy Now")',
      '.product-actions-mobile button:has-text("立即购买")',
    ];
    
    let buyNowButton = null;
    for (const selector of buyNowSelectors) {
      try {
        buyNowButton = page.locator(selector).first();
        await buyNowButton.waitFor({ state: 'visible', timeout: 5000 });
        const isDisabled = await buyNowButton.isDisabled();
        if (!isDisabled) {
          console.log(`[Test] Found Buy Now button using selector: ${selector}`);
          break;
        } else {
          console.log(`[Test] Buy Now button found but disabled: ${selector}`);
          buyNowButton = null;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!buyNowButton) {
      throw new Error('Could not find enabled Buy Now button');
    }

    // 3. 监听导航到结账页
    const checkoutNavigationPromise = page.waitForURL('**/checkout', { timeout: 10000 }).catch(() => null);

    // 4. 监听添加购物车 API
    const addToCartRequestPromise = page.waitForResponse(
      (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    // 5. 点击 Buy Now 按钮
    console.log('[Test] Clicking Buy Now button...');
    await buyNowButton.click();

    // 6. 等待添加到购物车
    const addResponse = await addToCartRequestPromise;
    if (addResponse) {
      const status = addResponse.status();
      console.log(`[Test] Add to Cart API response: ${status}`);
      expect(status).toBe(200);
    }

    // 7. 等待跳转到结账页
    const navigated = await checkoutNavigationPromise;
    if (navigated) {
      console.log('[Test] Successfully navigated to checkout page');
      expect(page.url()).toContain('/checkout');
    } else {
      console.warn('[Test] Did not navigate to checkout page within timeout');
    }

    // 8. 检查控制台日志
    const buyNowLogs = consoleLogs.filter((log) =>
      log.text.toLowerCase().includes('buy') && log.text.toLowerCase().includes('now')
    );
    console.log(`[Test] Found ${buyNowLogs.length} Buy Now related logs`);
    buyNowLogs.forEach((log, index) => {
      console.log(`[Test] Log ${index + 1} (${log.type}): ${log.text.substring(0, 200)}`);
    });

    // 9. 检查错误
    const errors = consoleLogs.filter((log) => log.type === 'error');
    if (errors.length > 0) {
      console.error(`[Test] Found ${errors.length} errors:`);
      errors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.text.substring(0, 300)}`);
      });
    }

    console.log('[Test] ===== Buy Now 测试完成 =====');
  });

  test('诊断 Place Order 按钮问题', async ({ page }) => {
    console.log(`[Test] ===== 诊断 Place Order 按钮问题 =====`);

    // 1. 尝试添加商品到购物车
    let cartHasItems = false;
    if (availableProductSlug) {
      try {
        console.log(`[Test] Adding product to cart, slug: ${availableProductSlug}`);
        await addProductToCart(page, availableProductSlug);
        console.log('[Test] Product added to cart successfully');
        await page.waitForTimeout(2000);
        cartHasItems = true;
      } catch (error: any) {
        console.warn('[Test] Failed to add product to cart:', error.message);
        console.log('[Test] Will check if cart already has items...');
      }
    } else {
      console.log('[Test] No product slug available, checking existing cart...');
    }

    // 2. 导航到结账页
    console.log('[Test] Navigating to checkout page...');
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    
    // 检查是否被重定向（购物车为空）
    const currentUrl = page.url();
    if (currentUrl.includes('/cart') || currentUrl.includes('/products')) {
      console.log(`[Test] Redirected to: ${currentUrl} (cart might be empty)`);
      console.log('[Test] ===== 诊断结果 =====');
      console.log('[Test] 购物车为空，无法进入结账页');
      console.log('[Test] 建议：确保数据库中有商品数据，并且商品有库存');
      test.skip(true, '购物车为空，无法进入结账页');
      return;
    }

    // 等待表单加载
    try {
      await page.waitForSelector('form', { timeout: 15000 });
      console.log('[Test] Checkout form loaded');
    } catch (error) {
      console.error('[Test] Checkout form not found');
      // 输出页面内容用于调试
      const pageContent = await page.content();
      console.error('[Test] Page content snippet:', pageContent.substring(0, 2000));
      throw error;
    }
    
    await page.waitForTimeout(3000); // 等待 React 和 Stripe 初始化

    // 3. 获取 Place Order 按钮
    const placeOrderButton = page.locator('button[type="submit"]:has-text("Place Order"), button[type="submit"]:has-text("下单")').first();
    
    // 检查按钮是否存在
    const buttonExists = await placeOrderButton.count() > 0;
    if (!buttonExists) {
      console.error('[Test] Place Order button not found on page');
      // 输出所有按钮用于调试
      const allButtons = await page.locator('button').all();
      console.error(`[Test] Found ${allButtons.length} buttons on page`);
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent().catch(() => '');
        const type = await allButtons[i].getAttribute('type').catch(() => '');
        console.error(`[Test] Button ${i}: type="${type}", text="${text}"`);
      }
      throw new Error('Place Order button not found');
    }
    
    await expect(placeOrderButton).toBeVisible({ timeout: 10000 });

    // 4. 检查初始状态
    console.log('[Test] ===== 初始状态检查 =====');
    let buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[Test] Initial button state:', JSON.stringify(buttonState, null, 2));

    // 5. 检查调试日志
    const debugLogs = filterDebugLogs(consoleLogs);
    console.log(`[Test] Found ${debugLogs.length} debug logs`);
    debugLogs.forEach((log, index) => {
      if (log.text.includes('Button states:') || log.text.includes('addressReady:') || log.text.includes('Stripe state:')) {
        console.log(`[Test] Debug log ${index + 1}: ${log.text.substring(0, 500)}`);
      }
    });

    // 6. 填写地址
    console.log('[Test] ===== 填写地址 =====');
    const testAddress = getDefaultTestAddress();
    await fillCheckoutAddress(page, testAddress);
    await page.waitForTimeout(2000);

    // 检查地址状态
    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[Test] Button state after filling address:', JSON.stringify(buttonState, null, 2));

    // 检查 addressReady 日志
    const addressReadyLogs = debugLogs.filter((log) => log.text.includes('addressReady:'));
    if (addressReadyLogs.length > 0) {
      const lastLog = addressReadyLogs[addressReadyLogs.length - 1];
      console.log('[Test] Last addressReady log:', lastLog.text.substring(0, 500));
    }

    // 7. 选择运费选项
    console.log('[Test] ===== 选择运费选项 =====');
    const shippingSelected = await selectFirstShippingOption(page);
    console.log(`[Test] Shipping option selected: ${shippingSelected}`);
    await page.waitForTimeout(2000);

    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[Test] Button state after selecting shipping:', JSON.stringify(buttonState, null, 2));

    // 8. 填写 Stripe 卡片信息
    console.log('[Test] ===== 填写卡片信息 =====');
    try {
      await fillStripeCard(page);
      await page.waitForTimeout(3000); // 等待卡片验证
    } catch (error: any) {
      console.warn('[Test] Failed to fill card:', error.message);
    }

    buttonState = await getButtonState(page, 'button[type="submit"]:has-text("Place Order")');
    console.log('[Test] Button state after filling card:', JSON.stringify(buttonState, null, 2));

    // 9. 检查所有调试日志
    console.log('[Test] ===== 所有调试日志 =====');
    const allDebugLogs = filterDebugLogs(consoleLogs);
    allDebugLogs.forEach((log, index) => {
      console.log(`[Test] Debug ${index + 1} (${log.type}): ${log.text.substring(0, 400)}`);
    });

    // 10. 检查按钮状态日志
    const buttonStateLogs = debugLogs.filter((log) => log.text.includes('Button states:'));
    if (buttonStateLogs.length > 0) {
      const lastLog = buttonStateLogs[buttonStateLogs.length - 1];
      console.log('[Test] ===== 最后按钮状态日志 =====');
      console.log(lastLog.text);
      
      // 尝试解析 JSON
      try {
        const jsonMatch = lastLog.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedState = JSON.parse(jsonMatch[0]);
          console.log('[Test] Parsed button state:', JSON.stringify(parsedState, null, 2));
        }
      } catch (parseError) {
        console.warn('[Test] Could not parse button state JSON');
      }
    }

    // 11. 检查网络错误
    const networkErrors = networkRequests.filter((req) => req.status && req.status >= 400);
    if (networkErrors.length > 0) {
      console.error('[Test] ===== 网络错误 =====');
      networkErrors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.status} ${error.statusText}`);
        console.error(`[Test] URL: ${error.url}`);
        if (error.responseBody) {
          console.error(`[Test] Response:`, JSON.stringify(error.responseBody, null, 2));
        }
      });
    }

    // 12. 检查 JavaScript 错误
    const jsErrors = consoleLogs.filter((log) => log.type === 'error');
    if (jsErrors.length > 0) {
      console.error('[Test] ===== JavaScript 错误 =====');
      jsErrors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.text.substring(0, 500)}`);
      });
    }

    // 13. 最终诊断
    console.log('[Test] ===== 最终诊断 =====');
    console.log(`[Test] Button disabled: ${buttonState.disabled}`);
    console.log(`[Test] Disabled reason: ${buttonState.disabledReason || 'N/A'}`);
    console.log(`[Test] Button text: ${buttonState.text || 'N/A'}`);

    // 输出诊断建议
    if (buttonState.disabled) {
      console.log('[Test] ===== 诊断建议 =====');
      if (buttonState.disabledReason) {
        console.log(`[Test] 按钮被禁用的原因: ${buttonState.disabledReason}`);
      } else {
        console.log('[Test] 按钮被禁用，但未找到明确的禁用原因。请检查：');
        console.log('[Test] 1. Stripe 是否已加载');
        console.log('[Test] 2. addressReady 是否为 true');
        console.log('[Test] 3. cardComplete 是否为 true');
        console.log('[Test] 4. selectedShipping 是否已选择');
        console.log('[Test] 5. shippingRates 是否已加载');
      }
    }

    console.log('[Test] ===== Place Order 按钮诊断完成 =====');
  });

  test('诊断 Coupon Apply 按钮问题', async ({ page }) => {
    if (!availableProductSlug) {
      test.skip(true, '没有可用的商品 slug');
      return;
    }

    console.log(`[Test] ===== 诊断 Coupon Apply 按钮问题 =====`);

    // 1. 添加商品到购物车 - 使用辅助函数，它会自动查找商品
    try {
      // 如果 availableProductSlug 存在，使用它；否则让函数使用默认值
      const productSlug = availableProductSlug || undefined;
      console.log(`[Test] Adding product to cart, slug: ${productSlug || 'default'}`);
      await addProductToCart(page, productSlug);
      console.log('[Test] Product added to cart successfully');
      await page.waitForTimeout(2000); // 等待购物车更新
    } catch (error: any) {
      console.error('[Test] Failed to add product to cart:', error.message);
      // 不跳过测试，继续尝试进入结账页（可能购物车中已有商品）
      console.log('[Test] Continuing to checkout page anyway...');
    }

    // 2. 导航到结账页
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('form', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 3. 检查 Apply 按钮初始状态
    console.log('[Test] ===== 初始状态检查 =====');
    const applyButton = page.locator('button:has-text("Apply"), button:has-text("应用")').first();
    let buttonState = await getButtonState(page, 'button:has-text("Apply")');
    console.log('[Test] Initial Apply button state:', JSON.stringify(buttonState, null, 2));

    // 4. 填写地址（Apply 按钮需要 addressReady）
    console.log('[Test] ===== 填写地址 =====');
    const testAddress = getDefaultTestAddress();
    await fillCheckoutAddress(page, testAddress);
    await page.waitForTimeout(2000);

    // 检查 addressReady
    const addressReady = await waitForAddressReady(page, consoleLogs);
    console.log(`[Test] addressReady: ${addressReady}`);

    // 5. 检查 Apply 按钮状态（地址填写后）
    buttonState = await getButtonState(page, 'button:has-text("Apply")');
    console.log('[Test] Apply button state after filling address:', JSON.stringify(buttonState, null, 2));

    // 6. 输入优惠券代码
    console.log('[Test] ===== 输入优惠券代码 =====');
    const couponCode = process.env.E2E_COUPON_CODE || 'TEST10';
    const couponInput = page.locator(
      'input[type="text"][placeholder*="coupon"], input[type="text"][placeholder*="优惠券"], input[id*="coupon"]'
    ).first();
    
    try {
      await couponInput.fill(couponCode);
      await page.waitForTimeout(1000);
      console.log(`[Test] Coupon code entered: ${couponCode}`);
    } catch (error: any) {
      console.warn('[Test] Could not find coupon input:', error.message);
    }

    // 7. 检查 Apply 按钮状态（输入优惠券后）
    buttonState = await getButtonState(page, 'button:has-text("Apply")');
    console.log('[Test] Apply button state after entering coupon:', JSON.stringify(buttonState, null, 2));

    // 8. 监听优惠券验证 API
    const couponApiPromise = page.waitForResponse(
      (response) => response.url().includes('/api/coupons/validate') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    // 9. 尝试应用优惠券
    console.log('[Test] ===== 尝试应用优惠券 =====');
    const applyResult = await applyCoupon(page, couponCode);
    console.log('[Test] Apply result:', JSON.stringify(applyResult, null, 2));

    // 10. 检查 API 响应
    const apiResponse = await couponApiPromise;
    if (apiResponse) {
      const status = apiResponse.status();
      const body = await apiResponse.json().catch(() => null);
      console.log(`[Test] Coupon API response: ${status}`);
      console.log(`[Test] Response body:`, JSON.stringify(body, null, 2));
    } else {
      console.warn('[Test] No API response received for coupon validation');
    }

    // 11. 检查调试日志
    const debugLogs = filterDebugLogs(consoleLogs);
    const couponLogs = debugLogs.filter((log) =>
      log.text.toLowerCase().includes('coupon') || log.text.toLowerCase().includes('apply')
    );
    console.log(`[Test] Found ${couponLogs.length} coupon-related debug logs`);
    couponLogs.forEach((log, index) => {
      console.log(`[Test] Coupon log ${index + 1} (${log.type}): ${log.text.substring(0, 400)}`);
    });

    // 12. 检查网络请求
    const couponRequests = networkRequests.filter((req) => req.url.includes('/api/coupons'));
    console.log(`[Test] Found ${couponRequests.length} coupon-related network requests`);
    couponRequests.forEach((req, index) => {
      console.log(`[Test] Request ${index + 1}: ${req.method} ${req.url} - ${req.status || 'pending'}`);
      if (req.responseBody) {
        console.log(`[Test] Response:`, JSON.stringify(req.responseBody, null, 2));
      }
    });

    // 13. 检查错误
    const errors = consoleLogs.filter((log) => log.type === 'error');
    if (errors.length > 0) {
      console.error(`[Test] Found ${errors.length} errors:`);
      errors.forEach((error, index) => {
        console.error(`[Test] Error ${index + 1}: ${error.text.substring(0, 500)}`);
      });
    }

    // 14. 最终诊断
    console.log('[Test] ===== 最终诊断 =====');
    console.log(`[Test] Apply button disabled: ${buttonState.disabled}`);
    console.log(`[Test] Disabled reason: ${buttonState.disabledReason || 'N/A'}`);
    console.log(`[Test] Apply result: ${applyResult.success ? 'Success' : 'Failed'}`);
    if (applyResult.error) {
      console.log(`[Test] Apply error: ${applyResult.error}`);
    }

    // 输出诊断建议
    if (buttonState.disabled || !applyResult.success) {
      console.log('[Test] ===== 诊断建议 =====');
      if (buttonState.disabled) {
        console.log('[Test] Apply 按钮被禁用，可能的原因：');
        console.log('[Test] 1. addressReady 为 false（需要填写完整地址）');
        console.log('[Test] 2. couponCode 为空');
        console.log('[Test] 3. applyingCoupon 为 true（正在处理中）');
      }
      if (applyResult.error) {
        console.log(`[Test] 应用优惠券失败: ${applyResult.error}`);
      }
    }

    console.log('[Test] ===== Coupon Apply 按钮诊断完成 =====');
  });
});

