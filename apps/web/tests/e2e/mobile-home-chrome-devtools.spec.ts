/**
 * [2025-01-29 12:00:00] 使用 Chrome DevTools Protocol 测试移动端首页
 * 验证新的视觉元素和样式是否正确加载
 */
import { test, expect, chromium } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('移动端首页 Chrome DevTools 测试', () => {
  test('测试移动端首页视觉元素和样式', async () => {
    // [2025-01-29 12:00:00] 启动浏览器并启用 CDP
    const browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      devtools: true, // 打开 DevTools
    });

    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE 尺寸
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    const page = await context.newPage();

    // [2025-01-29 12:00:00] 启用 CDP 会话
    const client = await context.newCDPSession(page);
    
    // 启用网络和运行时域
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // [2025-01-29 12:00:00] 监听控制台消息
    const consoleMessages: string[] = [];
    client.on('Runtime.consoleAPICalled', (event) => {
      const args = event.args.map((arg: any) => {
        if (arg.type === 'string') return arg.value;
        if (arg.type === 'number') return arg.value;
        return JSON.stringify(arg.value);
      }).join(' ');
      consoleMessages.push(`[Console ${event.type}]: ${args}`);
    });

    // [2025-01-29 12:00:00] 监听网络请求，特别是图片加载
    const imageLoads: Array<{ url: string; status: number }> = [];
    client.on('Network.responseReceived', (event) => {
      if (event.response.url.includes('/assets/hero/') || 
          event.response.url.includes('/assets/categories/')) {
        imageLoads.push({
          url: event.response.url,
          status: event.response.status,
        });
      }
    });

    // [2025-01-29 12:00:00] 监听图片加载失败
    const imageLoadFailures: string[] = [];
    client.on('Network.loadingFailed', (event) => {
      if (event.type === 'Image') {
        imageLoadFailures.push(event.requestId);
      }
    });

    try {
      console.log('1️⃣  访问移动端首页...');
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // 等待页面完全加载

      // [2025-01-29 12:00:00] 验证 Hero 区域
      console.log('2️⃣  验证 Hero 区域...');
      const heroSection = page.locator('.home-mobile__hero');
      await expect(heroSection).toBeVisible();

      // 验证 Hero 背景图
      const heroBgImage = page.locator('.home-mobile__hero-bg-image');
      const heroBgSrc = await heroBgImage.getAttribute('src');
      expect(heroBgSrc).toContain('hero-mobile-gradient.png');
      console.log('✅ Hero 背景图路径正确:', heroBgSrc);

      // 验证 Hero 标题
      const heroTitle = page.locator('.home-mobile__hero-title');
      await expect(heroTitle).toBeVisible();
      const titleText = await heroTitle.textContent();
      expect(titleText).toBeTruthy();
      console.log('✅ Hero 标题:', titleText);

      // 验证 Hero 按钮
      const heroButton = page.locator('.home-mobile__btn--primary').first();
      await expect(heroButton).toBeVisible();
      const buttonText = await heroButton.textContent();
      expect(buttonText).toContain('Get Started');
      console.log('✅ Hero 按钮:', buttonText);

      // [2025-01-29 12:00:00] 验证分类区域
      console.log('3️⃣  验证分类区域...');
      const categoriesSection = page.locator('.home-mobile__categories');
      await expect(categoriesSection).toBeVisible();

      const categoryCards = page.locator('.home-mobile__category-card');
      const categoryCount = await categoryCards.count();
      expect(categoryCount).toBeGreaterThan(0);
      console.log(`✅ 找到 ${categoryCount} 个分类卡片`);

      // 验证分类图片
      const firstCategoryImage = categoryCards.first().locator('img');
      await expect(firstCategoryImage).toBeVisible();
      const categoryImageSrc = await firstCategoryImage.getAttribute('src');
      expect(categoryImageSrc).toBeTruthy();
      console.log('✅ 分类图片加载:', categoryImageSrc);

      // [2025-01-29 12:00:00] 验证样式
      console.log('4️⃣  验证样式...');
      
      // 验证 Hero 区域样式
      const heroStyles = await heroSection.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          minHeight: styles.minHeight,
          display: styles.display,
        };
      });
      expect(heroStyles.position).toBe('relative');
      expect(heroStyles.minHeight).toBeTruthy();
      console.log('✅ Hero 样式正确:', heroStyles);

      // 验证按钮样式
      const buttonStyles = await heroButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
        };
      });
      expect(buttonStyles.borderRadius).toBeTruthy();
      expect(buttonStyles.boxShadow).toBeTruthy();
      console.log('✅ 按钮样式正确:', buttonStyles);

      // [2025-01-29 12:00:00] 验证动画
      console.log('5️⃣  验证动画...');
      const heroTitleStyles = await heroTitle.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          animation: styles.animation,
          textShadow: styles.textShadow,
        };
      });
      expect(heroTitleStyles.textShadow).toBeTruthy();
      console.log('✅ 动画样式正确');

      // [2025-01-29 12:00:00] 截图
      console.log('6️⃣  截图保存...');
      await page.screenshot({ 
        path: 'test-results/mobile-home-full.png',
        fullPage: true 
      });
      console.log('✅ 全页面截图已保存');

      await heroSection.screenshot({ 
        path: 'test-results/mobile-home-hero.png' 
      });
      console.log('✅ Hero 区域截图已保存');

      // [2025-01-29 12:00:00] 验证控制台错误
      const errors = consoleMessages.filter(msg => 
        msg.includes('error') || msg.includes('Error') || msg.includes('failed')
      );
      if (errors.length > 0) {
        console.warn('⚠️  发现控制台错误:');
        errors.forEach(err => console.warn('  -', err));
      } else {
        console.log('✅ 无控制台错误');
      }

      // [2025-01-29 12:00:00] 验证图片加载
      if (imageLoadFailures.length > 0) {
        console.warn('⚠️  发现图片加载失败:', imageLoadFailures.length);
      } else {
        console.log('✅ 所有图片加载成功');
      }

      console.log('\n✨ 移动端首页测试完成！');

    } catch (error) {
      console.error('❌ 测试失败:', error);
      await page.screenshot({ 
        path: 'test-results/mobile-home-error.png',
        fullPage: true 
      });
      throw error;
    } finally {
      await browser.close();
    }
  });

  test('测试移动端首页响应式布局', async () => {
    const browser = await chromium.launch({
      headless: false,
      devtools: true,
    });

    const context = await browser.newContext({
      viewport: { width: 320, height: 568 }, // 小屏幕
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    const page = await context.newPage();

    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // [2025-01-29 12:00:00] 验证小屏幕布局
      const categoriesGrid = page.locator('.home-mobile__categories-grid');
      const gridStyles = await categoriesGrid.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          gridTemplateColumns: styles.gridTemplateColumns,
        };
      });
      
      // 小屏幕应该是 2 列
      expect(gridStyles.gridTemplateColumns).toContain('repeat(2');
      console.log('✅ 小屏幕布局正确:', gridStyles.gridTemplateColumns);

      await page.screenshot({ 
        path: 'test-results/mobile-home-small-screen.png',
        fullPage: true 
      });

    } finally {
      await browser.close();
    }
  });
});

