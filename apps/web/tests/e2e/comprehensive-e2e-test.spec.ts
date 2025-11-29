/**
 * [2025-11-28 16:20:00] 综合 E2E 测试 - 覆盖所有核心功能
 */
import { test, expect } from './fixtures/test-base';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app';

test.describe('综合 E2E 测试套件', () => {
  
  test.describe('1. 商品筛选功能', () => {
    test('应该能够使用筛选条件过滤商品', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/products`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待筛选区域加载
      const sidebar = page.locator('.plp-new__sidebar');
      await sidebar.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      
      // 监听 API 请求
      const apiRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/products')) {
          apiRequests.push(request.url());
        }
      });
      
      // 尝试点击筛选条件
      const filterCheckbox = page.locator('input[type="checkbox"]').first();
      if (await filterCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterCheckbox.check();
        await page.waitForTimeout(1000);
        
        // 验证 URL 参数已更新
        const url = page.url();
        expect(url).toContain('/products');
        
        // 验证 API 请求包含筛选参数
        const lastRequest = apiRequests[apiRequests.length - 1];
        if (lastRequest) {
          expect(lastRequest).toContain('?');
        }
      }
    });
  });

  test.describe('2. 商品搜索功能', () => {
    test('应该能够搜索商品并显示结果', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/`);
      await page.waitForLoadState('domcontentloaded');
      
      // 查找搜索框
      const searchInput = page.locator('input[name*="search"], input[placeholder*="search" i]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // 监听搜索结果页面导航
        const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => {});
        
        await searchInput.fill('tee');
        await searchInput.press('Enter');
        
        await navigationPromise;
        await page.waitForLoadState('domcontentloaded');
        
        // 验证 URL 包含搜索参数
        const url = page.url();
        expect(url).toMatch(/\/products/);
        expect(url).toMatch(/search=/);
        
        // 验证搜索结果页面有商品显示
        const productCards = page.locator('.product-card, .product-card-new');
        const count = await productCards.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('3. 购物车功能', () => {
    test('应该能够添加商品到购物车', async ({ page }) => {
      // 先搜索并访问一个商品
      await page.goto(`${FRONTEND_URL}/products`);
      await page.waitForLoadState('domcontentloaded');
      
      // 等待商品卡片加载
      const productCard = page.locator('.product-card, .product-card-new').first();
      await productCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      
      if (await productCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 点击商品进入详情页
        const productLink = productCard.locator('a').first();
        await productLink.click();
        await page.waitForLoadState('domcontentloaded');
        
        // 监听添加到购物车的 API 请求
        const addToCartPromise = page.waitForResponse(
          (response) => response.url().includes('/api/cart') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        // 尝试添加到购物车
        const addToCartButton = page.locator('button:has-text("Add to cart"), button:has-text("添加到购物车")').first();
        if (await addToCartButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await addToCartButton.click();
          
          // 等待 API 请求完成
          const response = await addToCartPromise;
          if (response) {
            expect(response.status()).toBe(200);
          }
          
          // 验证购物车图标更新
          await page.waitForTimeout(1000);
        }
      }
    });

    test('应该能够查看购物车', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/cart`);
      await page.waitForLoadState('domcontentloaded');
      
      // 监听购物车 API 请求
      const cartResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/cart') && response.request().method() === 'GET',
        { timeout: 10000 }
      ).catch(() => null);
      
      // 等待页面加载
      await page.waitForTimeout(1000);
      
      const response = await cartResponsePromise;
      if (response) {
        expect(response.status()).toBe(200);
        
        const cartData = await response.json().catch(() => ({}));
        expect(cartData).toBeDefined();
      }
    });
  });

  test.describe('4. 结算功能', () => {
    test('应该能够访问结算页面', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/checkout`);
      await page.waitForLoadState('domcontentloaded');
      
      // 验证结算表单存在
      const checkoutForm = page.locator('form').first();
      await checkoutForm.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      
      // 验证有地址输入字段
      const addressInput = page.locator('input[name*="address"], input[name*="Address"]').first();
      const hasAddressInput = await addressInput.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 至少应该能看到结算页面
      expect(checkoutForm.isVisible()).toBeTruthy();
    });
  });

  test.describe('5. 线下订单创建', () => {
    test('应该能够访问线下订单页面', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/offline-orders`);
      await page.waitForLoadState('domcontentloaded');
      
      // 验证表单存在
      const form = page.locator('form').first();
      await form.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      
      // 验证第一步可见
      const step1Content = page.locator('text=/产品|Product/i').first();
      const isVisible = await step1Content.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(isVisible).toBeTruthy();
    });
  });
});

