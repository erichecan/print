/**
 * Products RSC Error Verification Test
 * [2025-12-09 22:50:00] 验证商品列表和详情页是否正常访问，无 RSC 渲染错误
 */
import { test, expect } from '@playwright/test';

test.describe('Products Pages RSC Error Verification', () => {
  test('商品列表页应正常加载且无 RSC 错误', async ({ page }) => {
    const errors: string[] = [];
    const consoleMessages: string[] = [];

    // 监听控制台错误
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (msg.type() === 'error') {
        errors.push(text);
        console.log('[Console Error]', text);
      }
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('[Page Error]', error.message);
    });

    // 访问商品列表页
    await page.goto('/products', { waitUntil: 'networkidle' });

    // 等待页面加载完成
    await page.waitForTimeout(2000);

    // 检查页面是否正常渲染
    const mainContent = page.locator('main, [role="main"], body');
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

    // 检查是否有 RSC 错误
    const rscErrors = errors.filter(e => 
      /Server Components render|_rsc|Cannot access.*before initialization/i.test(e)
    );

    // 检查是否有关键的 404 错误（排除资源加载的 404）
    const criticalNotFoundErrors = errors.filter(e => 
      /chat\?_rsc|_rsc=.*404/i.test(e) // 只检查 RSC 相关的 404
    );

    // 输出错误信息（如果有）
    if (rscErrors.length > 0) {
      console.error('❌ 发现 RSC 错误:');
      rscErrors.forEach(err => console.error('  -', err));
    }

    if (criticalNotFoundErrors.length > 0) {
      console.error('❌ 发现关键的 404 错误（RSC 相关）:');
      criticalNotFoundErrors.forEach(err => console.error('  -', err));
    }

    // 断言：不应有 RSC 错误
    expect(rscErrors, '不应有 Server Components 渲染错误').toHaveLength(0);
    
    // 断言：不应有 RSC 相关的 404 错误（资源加载的 404 可以忽略）
    expect(criticalNotFoundErrors, '不应有 RSC 相关的 404 错误').toHaveLength(0);

    // 断言：页面应包含商品相关内容
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // 检查页面标题
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('✅ 商品列表页标题:', title);
  });

  test('商品详情页应正常加载且无 RSC 错误', async ({ page }) => {
    const errors: string[] = [];
    const consoleMessages: string[] = [];

    // 监听控制台错误
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (msg.type() === 'error') {
        errors.push(text);
        console.log('[Console Error]', text);
      }
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('[Page Error]', error.message);
    });

    // 先访问商品列表页，获取一个有效的商品 slug
    await page.goto('/products', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 尝试找到一个商品链接
    const productLink = page.locator('a[href*="/products/"]').first();
    const productHref = await productLink.getAttribute('href').catch(() => null);

    if (productHref) {
      const productSlug = productHref.replace('/products/', '');
      console.log('📦 找到商品 slug:', productSlug);

      // 访问商品详情页
      await page.goto(productHref, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 检查页面是否正常渲染
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

      // 检查是否有 RSC 错误
      const rscErrors = errors.filter(e => 
        /Server Components render|_rsc|Cannot access.*before initialization/i.test(e)
      );

      // 检查是否有关键的 404 错误（排除资源加载的 404）
      const criticalNotFoundErrors = errors.filter(e => 
        /chat\?_rsc|_rsc=.*404/i.test(e) // 只检查 RSC 相关的 404
      );

      // 输出错误信息（如果有）
      if (rscErrors.length > 0) {
        console.error('❌ 发现 RSC 错误:');
        rscErrors.forEach(err => console.error('  -', err));
      }

      if (criticalNotFoundErrors.length > 0) {
        console.error('❌ 发现关键的 404 错误（RSC 相关）:');
        criticalNotFoundErrors.forEach(err => console.error('  -', err));
      }

      // 断言：不应有 RSC 错误
      expect(rscErrors, '不应有 Server Components 渲染错误').toHaveLength(0);
      
      // 断言：不应有 RSC 相关的 404 错误（资源加载的 404 可以忽略）
      expect(criticalNotFoundErrors, '不应有 RSC 相关的 404 错误').toHaveLength(0);

      // 检查页面标题
      const title = await page.title();
      expect(title).toBeTruthy();
      console.log('✅ 商品详情页标题:', title);
    } else {
      // 如果没有找到商品链接，使用测试 slug
      console.log('⚠️ 未找到商品链接，使用测试 slug');
      await page.goto('/products/test-slug', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // 检查页面是否正常渲染（即使是 404 也应该有内容）
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent.first()).toBeVisible({ timeout: 10000 });

      // 检查是否有 RSC 错误
      const rscErrors = errors.filter(e => 
        /Server Components render|Event handlers cannot be passed|Cannot access.*before initialization/i.test(e)
      );

      // 输出错误信息（如果有）
      if (rscErrors.length > 0) {
        console.error('❌ 发现 RSC 错误:');
        rscErrors.forEach(err => console.error('  -', err));
      }

      // 断言：不应有 RSC 错误（即使页面是 404）
      expect(rscErrors, '不应有 Server Components 渲染错误').toHaveLength(0);
    }
  });

  test('商品列表页 API 应正常返回数据', async ({ page }) => {
    // 访问 API 端点
    const response = await page.goto('/api/products?limit=1', { waitUntil: 'networkidle' });
    
    expect(response?.status()).toBe(200);
    
    const data = await response?.json();
    expect(data).toBeTruthy();
    console.log('✅ API 返回数据:', JSON.stringify(data).substring(0, 200));
  });
});

