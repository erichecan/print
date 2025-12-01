/**
 * [2025-12-01] GCP 生产环境深度分析测试
 * 
 * 使用 Playwright 和 Chrome DevTools Protocol (CDP) 深度分析：
 * - 购物车功能
 * - Buy Now 功能
 * - 支付流程
 * 
 * 测试目标：识别功能问题、网络错误、API 调用失败等
 */

import { test, expect, Page } from '@playwright/test';
import { chromium, Browser, BrowserContext } from 'playwright';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  timestamp: number;
}

interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

interface TestAnalysis {
  testName: string;
  success: boolean;
  errors: string[];
  networkRequests: NetworkRequest[];
  consoleLogs: ConsoleLog[];
  screenshots: string[];
  videoPath?: string;
}

const analysisResults: TestAnalysis[] = [];

test.describe('GCP 生产环境深度功能分析', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  // 存储网络请求和日志
  const networkRequests: NetworkRequest[] = [];
  const consoleLogs: ConsoleLog[] = [];

  test.beforeAll(async () => {
    // 启动浏览器并启用 CDP
    browser = await chromium.launch({
      headless: false, // 显示浏览器以便观察
      channel: 'chrome', // 使用系统 Chrome
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1920, height: 1080 },
      },
    });

    page = await context.newPage();

    // 监听网络请求
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // 只记录 API 请求和相关资源
      if (url.includes('/api/') || url.includes(BACKEND_URL) || url.includes(FRONTEND_URL)) {
        const headers = request.headers();
        networkRequests.push({
          url,
          method,
          requestHeaders: headers,
          timestamp: Date.now(),
        });
      }
    });

    // 监听网络响应
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/') || url.includes(BACKEND_URL)) {
        const request = networkRequests.find((req) => req.url === url && !req.status);
        if (request) {
          request.status = status;
          request.responseHeaders = response.headers();
          
          try {
            // 尝试获取响应体（JSON）
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              request.responseBody = await response.json().catch(() => null);
            }
          } catch (e) {
            // 忽略解析错误
          }
        } else {
          // 如果没有对应的请求记录，创建新的
          networkRequests.push({
            url,
            method: response.request().method(),
            status,
            responseHeaders: response.headers(),
            timestamp: Date.now(),
          });
        }
      }
    });

    // 监听控制台日志
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type() as 'log' | 'error' | 'warn' | 'info',
        message: msg.text(),
        timestamp: Date.now(),
      });
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      consoleLogs.push({
        type: 'error',
        message: `Page Error: ${error.message}`,
        timestamp: Date.now(),
      });
    });

    // 监听请求失败
    page.on('requestfailed', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText || 'Request failed',
        timestamp: Date.now(),
      });
    });
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('分析：访问首页并加载产品列表', async () => {
    const testName = '首页加载和产品列表';
    const errors: string[] = [];
    
    console.log(`\n[${testName}] 开始测试...`);
    
    try {
      // 访问首页
      console.log(`访问 ${FRONTEND_URL}`);
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      
      // 等待页面加载
      await page.waitForTimeout(3000);
      
      // 截图
      const screenshot1 = `test-results/screenshots/homepage-${Date.now()}.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      
      // 检查是否有错误
      const errorElements = await page.locator('[role="alert"], .error, .alert-error').count();
      if (errorElements > 0) {
        errors.push(`页面发现 ${errorElements} 个错误元素`);
      }
      
      // 检查产品列表是否加载
      const productSelectors = [
        '[data-testid="product-card"]',
        '.product-card',
        '[class*="product"]',
        'article',
      ];
      
      let productCount = 0;
      for (const selector of productSelectors) {
        productCount = await page.locator(selector).count();
        if (productCount > 0) break;
      }
      
      console.log(`找到 ${productCount} 个产品卡片`);
      
      if (productCount === 0) {
        errors.push('未找到产品卡片，产品列表可能未加载');
      }
      
      // 分析网络请求
      const apiRequests = networkRequests.filter((req) => 
        req.url.includes('/api/products') || req.url.includes('/api/content')
      );
      
      console.log(`API 请求数量: ${apiRequests.length}`);
      apiRequests.forEach((req) => {
        console.log(`  ${req.method} ${req.url} - Status: ${req.status || 'N/A'}`);
        if (req.status && req.status >= 400) {
          errors.push(`API 请求失败: ${req.method} ${req.url} - ${req.status}`);
        }
        if (req.error) {
          errors.push(`请求错误: ${req.url} - ${req.error}`);
        }
      });
      
      analysisResults.push({
        testName,
        success: errors.length === 0,
        errors,
        networkRequests: apiRequests,
        consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
        screenshots: [screenshot1],
      });
      
    } catch (error: any) {
      errors.push(`测试异常: ${error.message}`);
      analysisResults.push({
        testName,
        success: false,
        errors,
        networkRequests: networkRequests.slice(),
        consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
        screenshots: [],
      });
    }
  });

  test('分析：购物车功能 - 添加商品到购物车', async () => {
    const testName = '购物车 - 添加商品';
    const errors: string[] = [];
    
    console.log(`\n[${testName}] 开始测试...`);
    
    try {
      // 访问首页
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 查找第一个产品并点击
      const productLinks = [
        'a[href*="/products/"]',
        '[data-testid="product-link"]',
        '.product-card a',
      ];
      
      let productLink = null;
      for (const selector of productLinks) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          productLink = page.locator(selector).first();
          break;
        }
      }
      
      if (!productLink) {
        errors.push('未找到产品链接');
        throw new Error('无法找到产品链接');
      }
      
      // 获取产品 URL
      const productUrl = await productLink.getAttribute('href');
      console.log(`点击产品: ${productUrl}`);
      
      // 访问产品详情页
      const fullProductUrl = productUrl?.startsWith('http') 
        ? productUrl 
        : `${FRONTEND_URL}${productUrl}`;
      
      await page.goto(fullProductUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 截图
      const screenshot1 = `test-results/screenshots/product-detail-${Date.now()}.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      
      // 查找颜色和尺寸选择器
      const colorSelector = page.locator('button[data-testid="color"], [aria-label*="color" i], [class*="color"]').first();
      const sizeSelector = page.locator('button[data-testid="size"], [aria-label*="size" i], [class*="size"]').first();
      
      // 选择颜色（如果存在）
      if (await colorSelector.count() > 0) {
        await colorSelector.click();
        await page.waitForTimeout(500);
        console.log('已选择颜色');
      }
      
      // 选择尺寸（如果存在）
      if (await sizeSelector.count() > 0) {
        await sizeSelector.click();
        await page.waitForTimeout(500);
        console.log('已选择尺寸');
      }
      
      // 查找"添加到购物车"按钮
      const addToCartSelectors = [
        'button:has-text("Add to Cart")',
        'button:has-text("加入购物车")',
        'button:has-text("添加到购物车")',
        '[data-testid="add-to-cart"]',
        'button[aria-label*="cart" i]',
      ];
      
      let addToCartButton = null;
      for (const selector of addToCartSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          addToCartButton = page.locator(selector).first();
          break;
        }
      }
      
      if (!addToCartButton) {
        errors.push('未找到"添加到购物车"按钮');
        throw new Error('无法找到添加到购物车按钮');
      }
      
      // 等待按钮可见和可用
      await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
      const isDisabled = await addToCartButton.isDisabled();
      
      if (isDisabled) {
        errors.push('"添加到购物车"按钮被禁用');
      }
      
      // 监听购物车 API 请求
      const addToCartPromise = page.waitForResponse(
        (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      // 点击添加到购物车
      console.log('点击添加到购物车按钮...');
      await addToCartButton.click();
      
      // 等待 API 响应
      const addToCartResponse = await addToCartPromise;
      
      if (!addToCartResponse) {
        errors.push('未收到添加到购物车的 API 响应（可能请求未发送或超时）');
      } else {
        const status = addToCartResponse.status();
        console.log(`添加到购物车 API 响应状态: ${status}`);
        
        if (status !== 201 && status !== 200) {
          errors.push(`添加到购物车失败: HTTP ${status}`);
          try {
            const errorBody = await addToCartResponse.json();
            errors.push(`错误详情: ${JSON.stringify(errorBody)}`);
          } catch (e) {
            // 忽略解析错误
          }
        } else {
          console.log('✅ 成功添加到购物车');
        }
      }
      
      // 等待响应后的状态更新
      await page.waitForTimeout(2000);
      
      // 截图
      const screenshot2 = `test-results/screenshots/after-add-to-cart-${Date.now()}.png`;
      await page.screenshot({ path: screenshot2, fullPage: true });
      
      // 检查是否有成功提示
      const successMessages = [
        '成功',
        'Success',
        'added to cart',
        '已添加',
      ];
      
      let hasSuccessMessage = false;
      for (const msg of successMessages) {
        const element = page.locator(`text=${msg}`).first();
        if (await element.count() > 0) {
          hasSuccessMessage = true;
          console.log(`发现成功消息: ${msg}`);
          break;
        }
      }
      
      // 分析相关的网络请求
      const cartRequests = networkRequests.filter((req) => 
        req.url.includes('/api/cart')
      );
      
      console.log(`购物车相关 API 请求: ${cartRequests.length}`);
      cartRequests.forEach((req) => {
        console.log(`  ${req.method} ${req.url} - Status: ${req.status || 'N/A'}`);
      });
      
      analysisResults.push({
        testName,
        success: errors.length === 0 && addToCartResponse?.status() === 201,
        errors,
        networkRequests: cartRequests,
        consoleLogs: consoleLogs.filter((log) => 
          log.message.toLowerCase().includes('cart') || 
          log.message.toLowerCase().includes('购物车') ||
          log.type === 'error'
        ),
        screenshots: [screenshot1, screenshot2],
      });
      
    } catch (error: any) {
      errors.push(`测试异常: ${error.message}`);
      analysisResults.push({
        testName,
        success: false,
        errors,
        networkRequests: networkRequests.filter((req) => req.url.includes('/api/cart')),
        consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
        screenshots: [],
      });
    }
  });

  test('分析：Buy Now 功能', async () => {
    const testName = 'Buy Now - 立即购买';
    const errors: string[] = [];
    
    console.log(`\n[${testName}] 开始测试...`);
    
    try {
      // 访问首页
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 查找第一个产品
      const productLinks = [
        'a[href*="/products/"]',
        '[data-testid="product-link"]',
        '.product-card a',
      ];
      
      let productLink = null;
      for (const selector of productLinks) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          productLink = page.locator(selector).first();
          break;
        }
      }
      
      if (!productLink) {
        errors.push('未找到产品链接');
        throw new Error('无法找到产品链接');
      }
      
      const productUrl = await productLink.getAttribute('href');
      const fullProductUrl = productUrl?.startsWith('http') 
        ? productUrl 
        : `${FRONTEND_URL}${productUrl}`;
      
      // 访问产品详情页
      await page.goto(fullProductUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 选择颜色和尺寸
      const colorSelector = page.locator('button[data-testid="color"], [aria-label*="color" i]').first();
      const sizeSelector = page.locator('button[data-testid="size"], [aria-label*="size" i]').first();
      
      if (await colorSelector.count() > 0) {
        await colorSelector.click();
        await page.waitForTimeout(500);
      }
      
      if (await sizeSelector.count() > 0) {
        await sizeSelector.click();
        await page.waitForTimeout(500);
      }
      
      // 查找 Buy Now 按钮
      const buyNowSelectors = [
        'button:has-text("Buy Now")',
        'button:has-text("立即购买")',
        'button:has-text("立即下单")',
        '[data-testid="buy-now"]',
        'button[aria-label*="buy now" i]',
      ];
      
      let buyNowButton = null;
      for (const selector of buyNowSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          buyNowButton = page.locator(selector).first();
          break;
        }
      }
      
      if (!buyNowButton) {
        errors.push('未找到"Buy Now"按钮');
        throw new Error('无法找到 Buy Now 按钮');
      }
      
      await buyNowButton.waitFor({ state: 'visible', timeout: 10000 });
      
      // 截图
      const screenshot1 = `test-results/screenshots/before-buy-now-${Date.now()}.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      
      // 监听添加到购物车和导航
      const addToCartPromise = page.waitForResponse(
        (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      const navigationPromise = page.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => null);
      
      // 点击 Buy Now
      console.log('点击 Buy Now 按钮...');
      await buyNowButton.click();
      
      // 等待添加到购物车
      const addToCartResponse = await addToCartPromise;
      
      if (!addToCartResponse) {
        errors.push('Buy Now 未触发添加到购物车 API 请求');
      } else {
        const status = addToCartResponse.status();
        if (status !== 201 && status !== 200) {
          errors.push(`添加到购物车失败: HTTP ${status}`);
        }
      }
      
      // 等待导航到结账页
      await page.waitForTimeout(2000);
      const navigated = await navigationPromise;
      
      if (!navigated) {
        const currentUrl = page.url();
        if (!currentUrl.includes('/checkout')) {
          errors.push(`Buy Now 后未跳转到结账页，当前 URL: ${currentUrl}`);
        }
      } else {
        console.log('✅ 成功跳转到结账页');
      }
      
      // 等待结账页加载
      if (page.url().includes('/checkout')) {
        await page.waitForTimeout(3000);
        
        // 截图
        const screenshot2 = `test-results/screenshots/checkout-page-${Date.now()}.png`;
        await page.screenshot({ path: screenshot2, fullPage: true });
      }
      
      // 分析网络请求
      const checkoutRequests = networkRequests.filter((req) => 
        req.url.includes('/api/cart') || 
        req.url.includes('/api/checkout') ||
        req.url.includes('/checkout')
      );
      
      analysisResults.push({
        testName,
        success: errors.length === 0 && page.url().includes('/checkout'),
        errors,
        networkRequests: checkoutRequests,
        consoleLogs: consoleLogs.filter((log) => 
          log.message.toLowerCase().includes('buy') || 
          log.message.toLowerCase().includes('checkout') ||
          log.type === 'error'
        ),
        screenshots: [screenshot1],
      });
      
    } catch (error: any) {
      errors.push(`测试异常: ${error.message}`);
      analysisResults.push({
        testName,
        success: false,
        errors,
        networkRequests: networkRequests.filter((req) => 
          req.url.includes('/api/cart') || req.url.includes('/api/checkout')
        ),
        consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
        screenshots: [],
      });
    }
  });

  test('分析：支付流程 - 结账页和支付表单', async () => {
    const testName = '支付流程 - 结账页';
    const errors: string[] = [];
    
    console.log(`\n[${testName}] 开始测试...`);
    
    try {
      // 先添加商品到购物车（如果购物车为空）
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 查找产品并添加到购物车
      const productLink = page.locator('a[href*="/products/"]').first();
      if (await productLink.count() > 0) {
        const productUrl = await productLink.getAttribute('href');
        const fullProductUrl = productUrl?.startsWith('http') 
          ? productUrl 
          : `${FRONTEND_URL}${productUrl}`;
        
        await page.goto(fullProductUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // 选择变体
        const colorSelector = page.locator('button[data-testid="color"], [aria-label*="color" i]').first();
        const sizeSelector = page.locator('button[data-testid="size"], [aria-label*="size" i]').first();
        
        if (await colorSelector.count() > 0) await colorSelector.click();
        if (await sizeSelector.count() > 0) await sizeSelector.click();
        
        await page.waitForTimeout(1000);
        
        // 添加到购物车
        const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("加入购物车")').first();
        if (await addToCartButton.count() > 0) {
          await page.waitForResponse(
            (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
            { timeout: 10000 }
          ).catch(() => null);
          
          await addToCartButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // 访问结账页
      const checkoutUrl = `${FRONTEND_URL}/checkout`;
      console.log(`访问结账页: ${checkoutUrl}`);
      await page.goto(checkoutUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(5000); // 给更多时间加载
      
      // 截图
      const screenshot1 = `test-results/screenshots/checkout-initial-${Date.now()}.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      
      // 检查购物车是否为空
      const emptyCartMessages = [
        '购物车为空',
        'Cart is empty',
        'No items',
        'Empty',
      ];
      
      let isCartEmpty = false;
      for (const msg of emptyCartMessages) {
        const element = page.locator(`text=${msg}`).first();
        if (await element.count() > 0) {
          isCartEmpty = true;
          errors.push(`购物车为空: ${msg}`);
          break;
        }
      }
      
      if (isCartEmpty) {
        analysisResults.push({
          testName,
          success: false,
          errors,
          networkRequests: networkRequests.filter((req) => req.url.includes('/api/cart')),
          consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
          screenshots: [screenshot1],
        });
        return;
      }
      
      // 检查是否有地址表单
      const addressFormSelectors = [
        'input[name="addressLine1"]',
        'input[name="address"]',
        '[data-testid="shipping-address"]',
        'form',
      ];
      
      let hasAddressForm = false;
      for (const selector of addressFormSelectors) {
        if (await page.locator(selector).count() > 0) {
          hasAddressForm = true;
          console.log(`找到地址表单: ${selector}`);
          break;
        }
      }
      
      if (!hasAddressForm) {
        errors.push('未找到地址输入表单');
      }
      
      // 检查是否有支付表单（Stripe Elements）
      const stripeSelectors = [
        '#card-element',
        '[data-testid="card-element"]',
        'iframe[src*="stripe"]',
        '[class*="StripeElement"]',
      ];
      
      let hasStripeForm = false;
      for (const selector of stripeSelectors) {
        if (await page.locator(selector).count() > 0) {
          hasStripeForm = true;
          console.log(`找到 Stripe 支付表单: ${selector}`);
          break;
        }
      }
      
      if (!hasStripeForm) {
        errors.push('未找到 Stripe 支付表单（可能是 Stripe 未加载或配置错误）');
      }
      
      // 检查是否有"Place Order"按钮
      const placeOrderSelectors = [
        'button:has-text("Place Order")',
        'button:has-text("下单")',
        'button:has-text("支付")',
        'button[type="submit"]',
      ];
      
      let hasPlaceOrderButton = false;
      for (const selector of placeOrderSelectors) {
        if (await page.locator(selector).count() > 0) {
          hasPlaceOrderButton = true;
          console.log(`找到下单按钮: ${selector}`);
          break;
        }
      }
      
      if (!hasPlaceOrderButton) {
        errors.push('未找到"下单"按钮');
      }
      
      // 检查是否有错误提示
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"]');
      const errorCount = await errorMessages.count();
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          errors.push(`页面错误: ${errorText}`);
        }
      }
      
      // 分析相关的 API 请求
      const checkoutApiRequests = networkRequests.filter((req) => 
        req.url.includes('/api/checkout') || 
        req.url.includes('/api/cart')
      );
      
      console.log(`结账相关 API 请求: ${checkoutApiRequests.length}`);
      checkoutApiRequests.forEach((req) => {
        console.log(`  ${req.method} ${req.url} - Status: ${req.status || 'N/A'}`);
        if (req.status && req.status >= 400) {
          errors.push(`API 请求失败: ${req.method} ${req.url} - ${req.status}`);
        }
        if (req.error) {
          errors.push(`请求错误: ${req.url} - ${req.error}`);
        }
      });
      
      // 检查 Stripe 配置
      const stripeRequests = networkRequests.filter((req) => 
        req.url.includes('stripe.com') || req.url.includes('js.stripe.com')
      );
      
      console.log(`Stripe 相关请求: ${stripeRequests.length}`);
      stripeRequests.forEach((req) => {
        console.log(`  ${req.method} ${req.url} - Status: ${req.status || 'N/A'}`);
        if (req.status && req.status >= 400) {
          errors.push(`Stripe 资源加载失败: ${req.url} - ${req.status}`);
        }
      });
      
      analysisResults.push({
        testName,
        success: errors.length === 0 && hasAddressForm && hasStripeForm && hasPlaceOrderButton,
        errors,
        networkRequests: [...checkoutApiRequests, ...stripeRequests],
        consoleLogs: consoleLogs.filter((log) => 
          log.message.toLowerCase().includes('stripe') ||
          log.message.toLowerCase().includes('payment') ||
          log.message.toLowerCase().includes('checkout') ||
          log.type === 'error'
        ),
        screenshots: [screenshot1],
      });
      
    } catch (error: any) {
      errors.push(`测试异常: ${error.message}`);
      analysisResults.push({
        testName,
        success: false,
        errors,
        networkRequests: networkRequests.filter((req) => 
          req.url.includes('/api/checkout') || req.url.includes('stripe')
        ),
        consoleLogs: consoleLogs.filter((log) => log.type === 'error'),
        screenshots: [],
      });
    }
  });

  test('生成分析报告', async () => {
    // 生成详细的分析报告
    console.log('\n' + '='.repeat(80));
    console.log('GCP 生产环境功能分析报告');
    console.log('='.repeat(80));
    
    analysisResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   状态: ${result.success ? '✅ 通过' : '❌ 失败'}`);
      
      if (result.errors.length > 0) {
        console.log(`   错误 (${result.errors.length}):`);
        result.errors.forEach((error) => {
          console.log(`     - ${error}`);
        });
      }
      
      console.log(`   API 请求: ${result.networkRequests.length}`);
      result.networkRequests.forEach((req) => {
        const status = req.status ? `HTTP ${req.status}` : 'Pending/Failed';
        console.log(`     ${req.method} ${req.url} - ${status}`);
        if (req.error) {
          console.log(`       错误: ${req.error}`);
        }
      });
      
      const errorLogs = result.consoleLogs.filter((log) => log.type === 'error');
      if (errorLogs.length > 0) {
        console.log(`   控制台错误 (${errorLogs.length}):`);
        errorLogs.slice(0, 5).forEach((log) => {
          console.log(`     - ${log.message.substring(0, 100)}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // 保存报告到文件
    const fs = require('fs');
    const reportPath = 'test-results/gcp-production-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(analysisResults, null, 2));
    console.log(`\n详细报告已保存到: ${reportPath}`);
  });
});

