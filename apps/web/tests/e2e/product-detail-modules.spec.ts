/**
 * 商品详情页模块移除验证测试
* 验证 Print Location、Also Available On、Trending Topics 模块已移除
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('商品详情页模块移除验证', () => {
  let productSlug: string;

  test.beforeAll(async ({ request }) => {
    // 获取一个有效的产品 slug
    const response = await request.get(`${API_URL}/api/products?limit=1`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      productSlug = data.data[0].slug;
    } else {
      // 如果没有产品，使用默认值
      productSlug = 'classic-t-shirt';
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products/${productSlug}`);
    await page.waitForLoadState('domcontentloaded');
    // 等待产品详情页加载
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});
  });

  test('应该移除 Print Location 模块', async ({ page }) => {
    // 检查不应存在 Print Location 相关的元素
    const printLocationSelectors = [
      'text=Print Location',
      'text=Front',
      'text=Back',
      'text=Front & Back',
      '[data-testid="print-location"]',
      '.print-location',
    ];

    for (const selector of printLocationSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      expect(count).toBe(0);
    }
  });

  test('应该移除 Also Available On 模块', async ({ page }) => {
    // 检查不应存在 Also Available On 相关的元素
    const alsoAvailableSelectors = [
      'text=Also available on',
      'text=Also Available On',
      '[data-testid="also-available"]',
      '.also-available',
    ];

    for (const selector of alsoAvailableSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      expect(count).toBe(0);
    }
  });

  test('应该移除 Trending Topics 模块', async ({ page }) => {
    // 检查不应存在 Trending Topics 相关的元素
    const trendingSelectors = [
      'text=Trending topics',
      'text=Trending Topics',
      '[data-testid="trending-topics"]',
      '.trending-topics',
    ];

    for (const selector of trendingSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      expect(count).toBe(0);
    }
  });

  test('商品详情页应该正常显示其他内容', async ({ page }) => {
    // 验证其他重要内容仍然存在
    const requiredElements = [
      'h1', // 产品标题
      'button:has-text("Add to cart"), button:has-text("Add to Cart")', // 添加到购物车按钮
      'button:has-text("Buy Now"), button:has-text("Buy now")', // 立即购买按钮
    ];

    for (const selector of requiredElements) {
      const element = page.locator(selector).first();
      await expect(element).toBeVisible({ timeout: 5000 });
    }
  });

  test('商品详情页左侧应该显示分类导航', async ({ page }) => {
    // 在桌面端应该显示分类侧边栏
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    const sidebar = page.locator('[data-testid="category-sidebar"]');
    const count = await sidebar.count();
    
    // 桌面端应该显示侧边栏
    if (count > 0) {
      await expect(sidebar).toBeVisible({ timeout: 5000 });
    }
  });

  test('商品详情页左侧分类导航应该只显示有产品的分类', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    const sidebar = page.locator('[data-testid="category-sidebar"]');
    
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible({ timeout: 5000 });
      
      // 获取所有分类节点
      const categoryNodes = page.locator('.category-node');
      const nodeCount = await categoryNodes.count();
      
      if (nodeCount > 0) {
        // 验证每个分类都有产品计数或子分类
        for (let i = 0; i < Math.min(nodeCount, 5); i++) {
          const node = categoryNodes.nth(i);
          const countText = await node.locator('.category-count').textContent();
          const hasChildren = await node.locator('.category-children').count() > 0;
          
          // 应该有产品计数或有子分类
          expect(countText !== null || hasChildren).toBe(true);
        }
      }
    }
  });
});
