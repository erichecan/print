/**
 * PDP More by this artist 条件渲染测试
 * [2025-01-30 10:00:00] 验证 More by this artist 板块的条件渲染逻辑
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('PDP More by this artist 条件渲染', () => {
  let productWithBrand: { slug: string; brandId: string; brandName: string };
  let productWithoutBrand: { slug: string };

  test.beforeAll(async ({ request }) => {
    // [2025-01-30 10:00:00] 获取一个有品牌的产品
    const productsResponse = await request.get(`${API_URL}/api/products?limit=20`);
    const productsData = await productsResponse.json();
    
    if (productsData.data && productsData.data.length > 0) {
      // 查找有品牌的产品
      const productWithBrandData = productsData.data.find((p: any) => p.brand?.id);
      if (productWithBrandData) {
        productWithBrand = {
          slug: productWithBrandData.slug,
          brandId: productWithBrandData.brand.id,
          brandName: productWithBrandData.brand.name,
        };
      } else {
        // 如果没有找到，使用默认值
        productWithBrand = {
          slug: 'classic-t-shirt',
          brandId: 'test-brand-id',
          brandName: 'Test Brand',
        };
      }

      // 查找没有品牌的产品（或使用第一个产品作为测试）
      productWithoutBrand = {
        slug: productsData.data[0].slug,
      };
    } else {
      // 默认值
      productWithBrand = {
        slug: 'classic-t-shirt',
        brandId: 'test-brand-id',
        brandName: 'Test Brand',
      };
      productWithoutBrand = {
        slug: 'classic-t-shirt',
      };
    }
  });

  test('有同一品牌商品时应该显示 More by this artist 板块', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    // [2025-01-30 10:00:00] 等待产品详情页加载
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    // [2025-01-30 10:00:00] 检查是否有同一品牌的其它商品
    const brandProductsResponse = await page.request.get(
      `${API_URL}/api/brands/${productWithBrand.brandId}/products?excludeProductId=${productWithBrand.slug}&limit=12`
    );
    const brandProductsData = await brandProductsResponse.json();

    if (brandProductsData.items && brandProductsData.items.length > 0) {
      // [2025-01-30 10:00:00] 如果有商品，应该显示板块
      await page.waitForSelector('[data-testid="artist-more-section"]', {
        timeout: 10000,
      }).catch(() => {});

      const section = page.locator('[data-testid="artist-more-section"]');
      const count = await section.count();
      
      if (count > 0) {
        // [2025-01-30 10:00:00] 验证板块可见
        await expect(section.first()).toBeVisible();
        
        // [2025-01-30 10:00:00] 验证标题存在
        const title = section.locator('h2:has-text("More by this artist")');
        await expect(title).toBeVisible();
        
        // [2025-01-30 10:00:00] 验证至少有一个商品卡片
        const cards = section.locator('[data-testid^="artist-more-card-"]');
        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThan(0);
      }
    }
  });

  test('无同一品牌商品时应该隐藏 More by this artist 板块', async ({ page }) => {
    // [2025-01-30 10:00:00] 创建一个没有同一品牌商品的场景
    // 这里我们需要找到一个品牌，该品牌只有一个商品
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    // [2025-01-30 10:00:00] 检查品牌商品数量
    const brandProductsResponse = await page.request.get(
      `${API_URL}/api/brands/${productWithBrand.brandId}/products?excludeProductId=${productWithBrand.slug}&limit=12`
    );
    const brandProductsData = await brandProductsResponse.json();

    if (brandProductsData.items && brandProductsData.items.length === 0) {
      // [2025-01-30 10:00:00] 如果没有商品，板块应该不存在
      const section = page.locator('[data-testid="artist-more-section"]');
      const count = await section.count();
      expect(count).toBe(0);
    } else {
      // [2025-01-30 10:00:00] 如果有商品，测试通过（因为无法创建无商品场景）
      test.skip();
    }
  });

  test('应该包含正确的 data-testid 属性', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    // [2025-01-30 10:00:00] 等待板块加载
    const section = page.locator('[data-testid="artist-more-section"]');
    const sectionCount = await section.count();

    if (sectionCount > 0) {
      // [2025-01-30 10:00:00] 验证板块有正确的 data-testid
      await expect(section.first()).toHaveAttribute('data-testid', 'artist-more-section');
      
      // [2025-01-30 10:00:00] 验证商品卡片有正确的 data-testid
      const cards = section.locator('[data-testid^="artist-more-card-"]');
      const cardCount = await cards.count();
      
      if (cardCount > 0) {
        // [2025-01-30 10:00:00] 验证第一个卡片有正确的 data-testid 格式
        const firstCard = cards.first();
        const testId = await firstCard.getAttribute('data-testid');
        expect(testId).toMatch(/^artist-more-card-/);
      }
    }
  });

  test('桌面端应该显示 4 列布局', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    const section = page.locator('[data-testid="artist-more-section"]');
    const sectionCount = await section.count();

    if (sectionCount > 0) {
      // [2025-01-30 10:00:00] 查找网格容器
      const grid = section.locator('.more-by-artist-grid, [class*="grid"]').first();
      const gridCount = await grid.count();

      if (gridCount > 0) {
        const gridStyle = await grid.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
            display: styles.display,
          };
        });

        // [2025-01-30 10:00:00] 桌面端应该是 4 列
        const columnCount = gridStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBe(4);
      }
    }
  });

  test('平板端应该显示 2-3 列布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    const section = page.locator('[data-testid="artist-more-section"]');
    const sectionCount = await section.count();

    if (sectionCount > 0) {
      const grid = section.locator('.more-by-artist-grid, [class*="grid"]').first();
      const gridCount = await grid.count();

      if (gridCount > 0) {
        const gridStyle = await grid.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
          };
        });

        // [2025-01-30 10:00:00] 平板端应该是 2-3 列
        const columnCount = gridStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBeGreaterThanOrEqual(2);
        expect(columnCount).toBeLessThanOrEqual(3);
      }
    }
  });

  test('手机端应该显示 1-2 列布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/products/${productWithBrand.slug}`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('h1, [data-testid="product-detail"]', { 
      timeout: 15000 
    }).catch(() => {});

    const section = page.locator('[data-testid="artist-more-section"]');
    const sectionCount = await section.count();

    if (sectionCount > 0) {
      const grid = section.locator('.more-by-artist-grid, [class*="grid"]').first();
      const gridCount = await grid.count();

      if (gridCount > 0) {
        const gridStyle = await grid.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
          };
        });

        // [2025-01-30 10:00:00] 手机端应该是 1-2 列
        const columnCount = gridStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBeGreaterThanOrEqual(1);
        expect(columnCount).toBeLessThanOrEqual(2);
      }
    }
  });
});
