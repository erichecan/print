/**
* 使用 Chrome DevTools Protocol 测试移动端首页
 * 独立脚本，不依赖完整的测试环境
 */
const { chromium } = require('playwright');

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMobileHome() {
  console.log('🚀 开始测试移动端首页...\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE 尺寸
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

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

  // 监听图片加载
  const imageLoads = [];
  client.on('Network.responseReceived', (event) => {
    if (event.response.url.includes('/assets/hero/') || 
        event.response.url.includes('/assets/categories/')) {
      imageLoads.push({
        url: event.response.url,
        status: event.response.status,
      });
    }
  });

  const imageLoadFailures = [];
  client.on('Network.loadingFailed', (event) => {
    if (event.type === 'Image') {
      imageLoadFailures.push(event.requestId);
    }
  });

  try {
    console.log('1️⃣  访问移动端首页...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 验证 Hero 区域
    console.log('2️⃣  验证 Hero 区域...');
    const heroSection = page.locator('.home-mobile__hero');
    if (await heroSection.count() === 0) {
      throw new Error('Hero 区域未找到');
    }
    console.log('✅ Hero 区域存在');

    // 验证 Hero 背景图
    const heroBgImage = page.locator('.home-mobile__hero-bg-image');
    if (await heroBgImage.count() > 0) {
      const heroBgSrc = await heroBgImage.getAttribute('src');
      console.log('✅ Hero 背景图路径:', heroBgSrc);
      if (!heroBgSrc || !heroBgSrc.includes('hero-mobile-gradient')) {
        console.warn('⚠️  Hero 背景图路径可能不正确');
      }
    } else {
      console.warn('⚠️  Hero 背景图元素未找到');
    }

    // 验证 Hero 标题
    const heroTitle = page.locator('.home-mobile__hero-title');
    if (await heroTitle.count() > 0) {
      const titleText = await heroTitle.textContent();
      console.log('✅ Hero 标题:', titleText?.trim());
    }

    // 验证 Hero 按钮
    const heroButton = page.locator('.home-mobile__btn--primary').first();
    if (await heroButton.count() > 0) {
      const buttonText = await heroButton.textContent();
      console.log('✅ Hero 按钮:', buttonText?.trim());
    }

    // 验证分类区域
    console.log('3️⃣  验证分类区域...');
    const categoriesSection = page.locator('.home-mobile__categories');
    if (await categoriesSection.count() > 0) {
      console.log('✅ 分类区域存在');
      
      const categoryCards = page.locator('.home-mobile__category-card');
      const categoryCount = await categoryCards.count();
      console.log(`✅ 找到 ${categoryCount} 个分类卡片`);
    }

    // 验证样式
    console.log('4️⃣  验证样式...');
    const heroStyles = await heroSection.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        position: styles.position,
        minHeight: styles.minHeight,
        display: styles.display,
      };
    });
    console.log('✅ Hero 样式:', heroStyles);

    // 截图
    console.log('5️⃣  截图保存...');
    await page.screenshot({ 
      path: 'test-results/mobile-home-full.png',
      fullPage: true 
    });
    console.log('✅ 全页面截图已保存: test-results/mobile-home-full.png');

    await heroSection.screenshot({ 
      path: 'test-results/mobile-home-hero.png' 
    });
    console.log('✅ Hero 区域截图已保存: test-results/mobile-home-hero.png');

    // 检查控制台错误
    const errors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('error') || 
      msg.toLowerCase().includes('failed')
    );
    if (errors.length > 0) {
      console.warn('⚠️  发现控制台错误:');
      errors.slice(0, 5).forEach(err => console.warn('  -', err));
    } else {
      console.log('✅ 无控制台错误');
    }

    // 检查图片加载
    if (imageLoadFailures.length > 0) {
      console.warn('⚠️  发现图片加载失败:', imageLoadFailures.length);
    } else {
      console.log('✅ 图片加载正常');
    }

    console.log('\n✨ 移动端首页测试完成！');
    console.log('📁 截图保存在 test-results/ 目录');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ 
      path: 'test-results/mobile-home-error.png',
      fullPage: true 
    });
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行测试
testMobileHome().catch(console.error);

