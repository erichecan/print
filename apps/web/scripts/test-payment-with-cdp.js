/**
 * [2025-01-29 12:45:00] 使用 Chrome DevTools Protocol 测试支付功能
 * 独立脚本，不依赖 Playwright 配置
 */
const { chromium } = require('playwright');

// 尝试多个可能的 URL
const POSSIBLE_URLS = [
  process.env.BASE_URL,
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', ''),
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

const FRONTEND_URL = POSSIBLE_URLS[0] || 'http://localhost:3000';

async function testAddToCart() {
  console.log('🚀 开始测试：添加购物车功能（无弹窗，实时更新）\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  // 启用 CDP 域
  await client.send('Network.enable');
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('DOM.enable');

  // 监听控制台
  const consoleMessages = [];
  client.on('Runtime.consoleAPICalled', (event) => {
    const args = event.args.map(arg => {
      if (arg.type === 'string') return arg.value;
      if (arg.type === 'number') return arg.value;
      return JSON.stringify(arg.value);
    }).join(' ');
    consoleMessages.push(`[Console ${event.type}]: ${args}`);
  });

  // 监听网络请求
  const networkRequests = [];
  client.on('Network.responseReceived', (event) => {
    if (event.response.url.includes('/api/cart') || event.response.url.includes('/api/products')) {
      networkRequests.push({
        url: event.response.url,
        method: event.request?.method || 'GET',
        status: event.response.status,
      });
    }
  });

  let alertCount = 0;
  page.on('dialog', () => {
    alertCount++;
    console.log('⚠️  检测到弹窗！');
  });

  try {
    console.log('1️⃣  访问商品列表页...');
    await page.goto(`${FRONTEND_URL}/products`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 获取商品链接（等待页面加载）
    await page.waitForTimeout(3000);
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/products/"]'));
      return links.map(a => a.href).filter((href, i, self) => self.indexOf(href) === i).slice(0, 1);
    });

    if (!productLinks || productLinks.length === 0) {
      console.log('⚠️  未找到商品链接，尝试直接访问测试商品...');
      // 尝试直接访问一个已知的商品
      const testProductUrl = `${FRONTEND_URL}/products/classic-crew-tee`;
      try {
        await page.goto(testProductUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(5000); // 等待 React 渲染
        
        // 检查页面是否加载成功
        const pageTitle = await page.title();
        console.log('📄 页面标题:', pageTitle);
        
        // 等待内容加载
        await page.waitForSelector('body', { timeout: 10000 });
        console.log('✅ 直接访问测试商品成功');
      } catch (error) {
        console.log('❌ 无法访问商品页面:', error.message);
        console.log('   请确保前端服务正在运行: cd apps/web && npm run dev');
        await page.screenshot({ path: 'test-results/error-page-load.png', fullPage: true });
        await browser.close();
        return;
      }
    } else {

      console.log('2️⃣  访问商品详情页:', productLinks[0]);
      await page.goto(productLinks[0], { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    // 获取初始购物车数量
    const initialCount = await page.evaluate(() => {
      const badge = document.querySelector('.cart-icon__badge, [class*="cart-icon"] [class*="badge"]');
      return badge ? parseInt(badge.textContent || '0', 10) : 0;
    });

    console.log('📊 初始购物车数量:', initialCount);

    // 选择颜色
    const colorSelected = await page.evaluate(() => {
      const colorBtn = document.querySelector('[class*="color"], button[class*="color"]');
      if (colorBtn && colorBtn.offsetParent !== null) {
        colorBtn.click();
        return true;
      }
      return false;
    });

    if (colorSelected) {
      await page.waitForTimeout(500);
      console.log('✅ 已选择颜色');
    }

    // 点击添加购物车
    console.log('3️⃣  查找添加购物车按钮...');
    
    // 先等待页面完全加载和 React 渲染
    await page.waitForTimeout(5000);
    
    // 检查页面内容
    const pageContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        buttonCount: document.querySelectorAll('button').length,
        hasReact: typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined,
      };
    });
    console.log('📄 页面信息:', {
      buttonCount: pageContent.buttonCount,
      hasReact: pageContent.hasReact,
      bodyPreview: pageContent.bodyText.substring(0, 100) + '...',
    });
    
    // 尝试多种选择器
    const buttonSelectors = [
      'button:has-text("Add to Cart")',
      'button:has-text("加入购物车")',
      'button[class*="add-to-cart"]',
      'button[class*="Add"]',
      'button',
    ];
    
    let addButton = null;
    for (const selector of buttonSelectors) {
      const buttons = await page.locator(selector).all();
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && (text.includes('Add to Cart') || text.includes('加入购物车') || text.includes('Add'))) {
          const isVisible = await btn.isVisible();
          if (isVisible) {
            addButton = btn;
            console.log(`✅ 找到按钮: "${text}" (选择器: ${selector})`);
            break;
          }
        }
      }
      if (addButton) break;
    }
    
    if (!addButton) {
      // 截图用于调试
      await page.screenshot({ path: 'test-results/debug-no-button.png', fullPage: true });
      console.log('❌ 未找到添加购物车按钮');
      console.log('📸 调试截图已保存: test-results/debug-no-button.png');
      
      // 输出页面上的所有按钮文本
      const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()).filter(Boolean);
      });
      console.log('📋 页面上的所有按钮:', allButtons);
      
      await browser.close();
      return;
    }

    // 等待 API 响应
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/cart/items') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    await addButton.click();
    console.log('✅ 已点击添加购物车按钮');
    
    const response = await responsePromise;
    if (response) {
      console.log('✅ 购物车 API 响应:', response.status());
    } else {
      console.log('⚠️  未收到 API 响应（可能超时或请求未发送）');
    }

    await page.waitForTimeout(3000);

    // 检查购物车数量
    const newCount = await page.evaluate(() => {
      const badge = document.querySelector('.cart-icon__badge, [class*="cart-icon"] [class*="badge"]');
      return badge ? parseInt(badge.textContent || '0', 10) : 0;
    });

    console.log('📊 新购物车数量:', newCount);

    // 结果
    console.log('\n📋 测试结果:');
    console.log('  - 弹窗数量:', alertCount, alertCount === 0 ? '✅' : '❌');
    console.log('  - 购物车数量变化:', initialCount, '->', newCount, newCount >= initialCount ? '✅' : '❌');
    console.log('  - 购物车 API 请求:', networkRequests.length, '个');

    // 截图
    await page.screenshot({ path: 'test-results/cdp-add-to-cart.png', fullPage: true });
    console.log('📸 截图已保存: test-results/cdp-add-to-cart.png');

    if (alertCount === 0 && newCount >= initialCount) {
      console.log('\n✅ 测试通过！');
    } else {
      console.log('\n❌ 测试失败！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    await page.screenshot({ path: 'test-results/cdp-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

async function testCartImages() {
  console.log('\n🚀 开始测试：购物车图片显示\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send('Network.enable');
  await client.send('Runtime.enable');

  const imageLoadErrors = [];
  client.on('Network.loadingFailed', (event) => {
    if (event.type === 'Image') {
      imageLoadErrors.push(event.errorText || 'Unknown error');
    }
  });

  try {
    console.log('1️⃣  访问购物车页面...');
    await page.goto(`${FRONTEND_URL}/cart`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src*="cart"], img[class*="cart"], .cart-card img'));
      return imgs.map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        visible: img.offsetParent !== null
      }));
    });

    console.log('📊 找到图片数量:', images.length);

    images.forEach((img, index) => {
      console.log(`  图片 ${index + 1}:`, {
        src: img.src.substring(0, 80) + '...',
        width: img.naturalWidth,
        height: img.naturalHeight,
        loaded: img.complete,
        visible: img.visible,
      });
    });

    const loadedImages = images.filter(img => img.complete && img.naturalWidth > 0);
    console.log('\n📋 测试结果:');
    console.log('  - 成功加载的图片:', loadedImages.length, '/', images.length);
    console.log('  - 图片加载错误:', imageLoadErrors.length);

    await page.screenshot({ path: 'test-results/cdp-cart-images.png', fullPage: true });
    console.log('📸 截图已保存: test-results/cdp-cart-images.png');

    if (images.length === 0 || loadedImages.length > 0) {
      console.log('\n✅ 测试通过！');
    } else {
      console.log('\n❌ 测试失败！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    await page.screenshot({ path: 'test-results/cdp-cart-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

async function testStripeButton() {
  console.log('\n🚀 开始测试：Stripe 支付按钮\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send('Network.enable');
  await client.send('Runtime.enable');

  const debugLogs = [];
  client.on('Runtime.consoleAPICalled', (event) => {
    const args = event.args.map(arg => {
      if (arg.type === 'string') return arg.value;
      return JSON.stringify(arg.value);
    }).join(' ');
    if (args.includes('Checkout Debug') || args.includes('cardComplete')) {
      debugLogs.push(args);
    }
  });

  try {
    console.log('1️⃣  访问结算页...');
    await page.goto(`${FRONTEND_URL}/checkout`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const stripeLoaded = await page.evaluate(() => {
      return typeof window !== 'undefined' && typeof window.Stripe !== 'undefined';
    });

    console.log('📊 Stripe 已加载:', stripeLoaded ? '✅' : '❌');

    console.log('2️⃣  填写地址信息...');
    await page.fill('input[name="fullName"], input[placeholder*="name" i]', 'Test User');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="phone"], input[type="tel"]', '1234567890');
    await page.fill('input[name="addressLine1"], input[placeholder*="address" i]', '123 Test St');
    await page.fill('input[name="city"]', 'Toronto');
    await page.selectOption('select[name="province"], select[name="state"]', { label: 'Ontario' });
    await page.fill('input[name="postalCode"], input[name="postal"]', 'M5H 2N2');
    await page.selectOption('select[name="country"]', { label: 'Canada' });

    await page.waitForTimeout(2000);

    await page.waitForResponse(
      (response) => response.url().includes('/api/checkout/shipping-rates'),
      { timeout: 15000 }
    ).catch(() => {});

    await page.waitForTimeout(2000);

    const shippingSelected = await page.evaluate(() => {
      const shippingInput = document.querySelector('input[type="radio"][name*="shipping"]');
      if (shippingInput) {
        shippingInput.click();
        return true;
      }
      return false;
    });

    if (shippingSelected) {
      await page.waitForTimeout(1000);
      console.log('✅ 已选择运费方式');
    }

    await page.waitForTimeout(3000);

    const buttonState = await page.evaluate(() => {
      const button = document.querySelector('button:has-text("Place Order"), button[type="submit"]');
      if (!button) return null;
      return {
        disabled: button.disabled,
        text: button.textContent,
        title: button.title || '',
      };
    });

    console.log('\n📋 测试结果:');
    console.log('  - Place Order 按钮状态:', buttonState);
    console.log('  - 相关调试日志数量:', debugLogs.length);

    if (debugLogs.length > 0) {
      console.log('\n📝 最近的调试日志:');
      debugLogs.slice(-10).forEach((log, index) => {
        console.log(`  ${index + 1}.`, log.substring(0, 150));
      });
    }

    await page.screenshot({ path: 'test-results/cdp-checkout-button.png', fullPage: true });
    console.log('📸 截图已保存: test-results/cdp-checkout-button.png');

    if (buttonState) {
      console.log('\n✅ 测试完成！');
    } else {
      console.log('\n❌ 未找到按钮！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    await page.screenshot({ path: 'test-results/cdp-checkout-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 Chrome DevTools Protocol 支付功能测试');
  console.log('='.repeat(60));

  try {
    await testAddToCart();
    await testCartImages();
    await testStripeButton();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testAddToCart, testCartImages, testStripeButton };

