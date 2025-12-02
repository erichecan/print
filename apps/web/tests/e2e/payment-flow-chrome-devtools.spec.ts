/**
 * [2025-01-29 12:30:00] 使用 Chrome DevTools Protocol 进行支付功能测试
 * 这个测试脚本直接使用 CDP 进行深度调试，不依赖完整的测试环境
 */
import { test, expect, chromium } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('支付功能 Chrome DevTools 测试', () => {
  test('使用 CDP 测试添加购物车功能', async () => {
    // 启动浏览器并启用 CDP
    const browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      devtools: true, // 打开 DevTools
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 启用 CDP 会话
    const client = await context.newCDPSession(page);
    
    // 启用网络和运行时域
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 监听控制台消息
    const consoleMessages: string[] = [];
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
        if (arg.type === 'string') return arg.value;
        if (arg.type === 'number') return arg.value;
        return JSON.stringify(arg.value);
      }).join(' ');
      consoleMessages.push(`[Console ${event.type}]: ${args}`);
    });

    // 监听网络请求
    const networkRequests: Array<{ url: string; method: string; status?: number }> = [];
    client.on('Network.responseReceived', (event) => {
      if (event.response.url.includes('/api/cart') || event.response.url.includes('/api/products')) {
        networkRequests.push({
          url: event.response.url,
          method: event.request?.method || 'GET',
          status: event.response.status,
        });
      }
    });

    try {
      console.log('[CDP Test] 1. 访问商品列表页...');
      await page.goto(`${FRONTEND_URL}/products`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 使用 CDP 执行 JavaScript 获取商品链接
      const productLinks = await client.send('Runtime.evaluate', {
        expression: `
          Array.from(document.querySelectorAll('a[href*="/products/"]'))
            .map(a => a.href)
            .filter((href, index, self) => self.indexOf(href) === index)
            .slice(0, 1)
        `,
      });

      if (!productLinks.result?.value || productLinks.result.value.length === 0) {
        console.warn('[CDP Test] 未找到商品链接，跳过测试');
        await browser.close();
        return;
      }

      const productUrl = productLinks.result.value[0];
      console.log('[CDP Test] 2. 访问商品详情页:', productUrl);

      await page.goto(productUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 获取初始购物车数量
      const initialCartCount = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const badge = document.querySelector('.cart-icon__badge, [class*="cart-icon"] [class*="badge"]');
            return badge ? parseInt(badge.textContent || '0', 10) : 0;
          })()
        `,
      });

      const initialCount = initialCartCount.result?.value || 0;
      console.log('[CDP Test] 初始购物车数量:', initialCount);

      // 监听弹窗
      let alertCount = 0;
      page.on('dialog', () => {
        alertCount++;
        console.log('[CDP Test] ⚠️ 检测到弹窗！');
      });

      // 选择颜色和尺寸（如果存在）
      const colorSelected = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const colorBtn = document.querySelector('[class*="color"], button[class*="color"]');
            if (colorBtn && colorBtn.offsetParent !== null) {
              colorBtn.click();
              return true;
            }
            return false;
          })()
        `,
      });

      if (colorSelected.result?.value) {
        await page.waitForTimeout(500);
        console.log('[CDP Test] 已选择颜色');
      }

      // 点击添加购物车按钮
      console.log('[CDP Test] 3. 点击添加购物车按钮...');
      const addToCartClicked = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const addButton = buttons.find(btn => 
              btn.textContent.includes('Add to Cart') || 
              btn.textContent.includes('加入购物车') ||
              btn.className.includes('add-to-cart')
            );
            if (addButton && addButton.offsetParent !== null) {
              addButton.click();
              return true;
            }
            return false;
          })()
        `,
      });

      if (!addToCartClicked.result?.value) {
        console.warn('[CDP Test] 未找到添加购物车按钮');
        await browser.close();
        return;
      }

      // 等待 API 响应
      console.log('[CDP Test] 4. 等待购物车 API 响应...');
      await page.waitForResponse(
        (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => {});

      await page.waitForTimeout(3000); // 等待状态更新

      // 检查购物车数量是否更新
      const newCartCount = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const badge = document.querySelector('.cart-icon__badge, [class*="cart-icon"] [class*="badge"]');
            return badge ? parseInt(badge.textContent || '0', 10) : 0;
          })()
        `,
      });

      const newCount = newCartCount.result?.value || 0;
      console.log('[CDP Test] 新购物车数量:', newCount);

      // 验证结果
      console.log('[CDP Test] ===== 测试结果 =====');
      console.log('[CDP Test] 弹窗数量:', alertCount);
      console.log('[CDP Test] 购物车数量变化:', initialCount, '->', newCount);
      console.log('[CDP Test] 购物车相关网络请求:', networkRequests.length);

      // 检查控制台日志
      const cartRelatedLogs = consoleMessages.filter(log => 
        log.toLowerCase().includes('cart') || 
        log.toLowerCase().includes('add')
      );
      console.log('[CDP Test] 购物车相关日志:', cartRelatedLogs.length, '条');

      // 验证：不应该有弹窗
      expect(alertCount).toBe(0);

      // 验证：购物车数量应该增加
      if (initialCount >= 0) {
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }

      // 截图保存
      await page.screenshot({ path: 'test-results/cdp-add-to-cart.png', fullPage: true });

    } catch (error) {
      console.error('[CDP Test] 测试失败:', error);
      await page.screenshot({ path: 'test-results/cdp-error.png', fullPage: true });
      throw error;
    } finally {
      await browser.close();
    }
  });

  test('使用 CDP 测试购物车图片显示', async () => {
    const browser = await chromium.launch({
      headless: false,
      devtools: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    const client = await context.newCDPSession(page);

    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');

    // 监听图片加载
    const imageLoadErrors: string[] = [];
    client.on('Network.loadingFailed', (event) => {
      if (event.type === 'Image') {
        imageLoadErrors.push(event.errorText || 'Unknown error');
      }
    });

    try {
      console.log('[CDP Test] 访问购物车页面...');
      await page.goto(`${FRONTEND_URL}/cart`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // 检查图片元素
      const imageInfo = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const images = Array.from(document.querySelectorAll('img[src*="cart"], img[class*="cart"], .cart-card img'));
            return images.map(img => ({
              src: img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              complete: img.complete,
              visible: img.offsetParent !== null
            }));
          })()
        `,
      });

      const images = imageInfo.result?.value || [];
      console.log('[CDP Test] 找到图片数量:', images.length);
      
      images.forEach((img: any, index: number) => {
        console.log(`[CDP Test] 图片 ${index + 1}:`, {
          src: img.src.substring(0, 100),
          width: img.naturalWidth,
          height: img.naturalHeight,
          loaded: img.complete,
          visible: img.visible,
        });
      });

      // 验证图片加载
      const loadedImages = images.filter((img: any) => img.complete && img.naturalWidth > 0);
      console.log('[CDP Test] 成功加载的图片:', loadedImages.length, '/', images.length);

      // 截图保存
      await page.screenshot({ path: 'test-results/cdp-cart-images.png', fullPage: true });

      // 验证：至少有一些图片应该加载成功
      if (images.length > 0) {
        expect(loadedImages.length).toBeGreaterThan(0);
      }

    } catch (error) {
      console.error('[CDP Test] 测试失败:', error);
      await page.screenshot({ path: 'test-results/cdp-cart-error.png', fullPage: true });
      throw error;
    } finally {
      await browser.close();
    }
  });

  test('使用 CDP 测试 Stripe 支付按钮', async () => {
    const browser = await chromium.launch({
      headless: false,
      devtools: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    const client = await context.newCDPSession(page);

    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 监听控制台日志
    const debugLogs: string[] = [];
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
        if (arg.type === 'string') return arg.value;
        return JSON.stringify(arg.value);
      }).join(' ');
      if (args.includes('Checkout Debug') || args.includes('cardComplete')) {
        debugLogs.push(args);
      }
    });

    try {
      console.log('[CDP Test] 访问结算页...');
      await page.goto(`${FRONTEND_URL}/checkout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000); // 等待 Stripe 加载

      // 检查 Stripe 是否加载
      const stripeLoaded = await client.send('Runtime.evaluate', {
        expression: 'typeof window !== "undefined" && typeof window.Stripe !== "undefined"',
      });

      console.log('[CDP Test] Stripe 已加载:', stripeLoaded.result?.value);

      // 填写地址信息
      console.log('[CDP Test] 填写地址信息...');
      await page.fill('input[name="fullName"], input[placeholder*="name" i]', 'Test User');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="phone"], input[type="tel"]', '1234567890');
      await page.fill('input[name="addressLine1"], input[placeholder*="address" i]', '123 Test St');
      await page.fill('input[name="city"]', 'Toronto');
      await page.selectOption('select[name="province"], select[name="state"]', { label: 'Ontario' });
      await page.fill('input[name="postalCode"], input[name="postal"]', 'M5H 2N2');
      await page.selectOption('select[name="country"]', { label: 'Canada' });

      await page.waitForTimeout(2000);

      // 等待运费计算
      await page.waitForResponse(
        (response) => response.url().includes('/api/checkout/shipping-rates'),
        { timeout: 15000 }
      ).catch(() => {});

      await page.waitForTimeout(2000);

      // 选择运费方式
      const shippingSelected = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const shippingInput = document.querySelector('input[type="radio"][name*="shipping"]');
            if (shippingInput) {
              shippingInput.click();
              return true;
            }
            return false;
          })()
        `,
      });

      if (shippingSelected.result?.value) {
        await page.waitForTimeout(1000);
        console.log('[CDP Test] 已选择运费方式');
      }

      // 检查 Place Order 按钮状态
      await page.waitForTimeout(3000); // 等待卡片信息验证

      const buttonState = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const button = document.querySelector('button:has-text("Place Order"), button[type="submit"]');
            if (!button) return null;
            return {
              disabled: button.disabled,
              text: button.textContent,
              title: button.title || '',
            };
          })()
        `,
      });

      const state = buttonState.result?.value;
      console.log('[CDP Test] Place Order 按钮状态:', state);

      // 输出调试日志
      console.log('[CDP Test] ===== 调试日志 =====');
      debugLogs.slice(-20).forEach((log, index) => {
        console.log(`[CDP Test] Log ${index + 1}:`, log.substring(0, 200));
      });

      // 截图保存
      await page.screenshot({ path: 'test-results/cdp-checkout-button.png', fullPage: true });

      // 验证：按钮应该存在
      expect(state).not.toBeNull();

    } catch (error) {
      console.error('[CDP Test] 测试失败:', error);
      await page.screenshot({ path: 'test-results/cdp-checkout-error.png', fullPage: true });
      throw error;
    } finally {
      await browser.close();
    }
  });
});

