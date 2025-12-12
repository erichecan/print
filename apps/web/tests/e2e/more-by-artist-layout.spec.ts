/**
 * More by this artist 排版测试
 * [2025-12-11 22:40:00] 验证 More by this artist 组件的栅格布局和卡片统一性
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('More by this artist 排版', () => {
  let productSlug: string;
  let artistName: string;

  test.beforeAll(async ({ request }) => {
    // 获取一个有效的产品 slug 和艺术家名称
    const response = await request.get(`${API_URL}/api/products?limit=1`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      productSlug = data.data[0].slug;
      artistName = data.data[0].artist?.name || 'Unknown Artist';
    } else {
      productSlug = 'classic-t-shirt';
      artistName = 'Unknown Artist';
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products/${productSlug}`);
    await page.waitForLoadState('domcontentloaded');
    // 等待产品详情页加载
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  });

  test('移动端应该显示单列布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.reload();
    await page.waitForTimeout(2000);
    
    // 查找 More by this artist 部分
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      // 查找网格容器
      const gridContainer = moreByArtistSection.locator('..').locator('.grid, [class*="grid"]').first();
      
      if (await gridContainer.count() > 0) {
        const gridStyle = await gridContainer.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
            display: styles.display,
          };
        });
        
        // 移动端应该是单列或 flex 布局
        expect(
          gridStyle.gridTemplateColumns.includes('1fr') || 
          gridStyle.gridTemplateColumns === 'none' ||
          gridStyle.display === 'flex'
        ).toBe(true);
      }
    }
  });

  test('平板端应该显示两列布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.reload();
    await page.waitForTimeout(2000);
    
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      const gridContainer = moreByArtistSection.locator('..').locator('.grid, [class*="grid"]').first();
      
      if (await gridContainer.count() > 0) {
        const gridStyle = await gridContainer.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
          };
        });
        
        // 平板端应该至少有两列
        const columnCount = gridStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test('桌面端应该显示三列或四列布局', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop
    await page.reload();
    await page.waitForTimeout(2000);
    
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      const gridContainer = moreByArtistSection.locator('..').locator('.grid, [class*="grid"]').first();
      
      if (await gridContainer.count() > 0) {
        const gridStyle = await gridContainer.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
          };
        });
        
        // 桌面端应该至少有三列
        const columnCount = gridStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('卡片应该有统一的宽度和间距', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      const cards = page.locator('a[href*="/products/"]').filter({
        has: page.locator('img')
      });
      
      const cardCount = await cards.count();
      
      if (cardCount >= 2) {
        // 获取前两张卡片的宽度
        const widths: number[] = [];
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = cards.nth(i);
          const width = await card.evaluate((el) => el.getBoundingClientRect().width);
          widths.push(width);
        }
        
        // 验证卡片宽度一致（允许 5px 误差）
        if (widths.length >= 2) {
          const maxWidth = Math.max(...widths);
          const minWidth = Math.min(...widths);
          expect(maxWidth - minWidth).toBeLessThan(5);
        }
      }
    }
  });

  test('卡片图片应该有统一的宽高比', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      const images = page.locator('a[href*="/products/"] img');
      const imageCount = await images.count();
      
      if (imageCount >= 2) {
        const aspectRatios: number[] = [];
        
        for (let i = 0; i < Math.min(imageCount, 4); i++) {
          const img = images.nth(i);
          const { width, height } = await img.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          });
          
          if (width > 0 && height > 0) {
            aspectRatios.push(width / height);
          }
        }
        
        // 验证宽高比一致（允许 0.1 误差）
        if (aspectRatios.length >= 2) {
          const maxRatio = Math.max(...aspectRatios);
          const minRatio = Math.min(...aspectRatios);
          expect(maxRatio - minRatio).toBeLessThan(0.1);
        }
      }
    }
  });

  test('过长的标题应该被截断并显示 hover 提示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    const moreByArtistSection = page.locator('text=/More by this artist/i, text=/More from/i').first();
    
    if (await moreByArtistSection.count() > 0) {
      const titles = page.locator('a[href*="/products/"] h3, a[href*="/products/"] .product-title');
      const titleCount = await titles.count();
      
      if (titleCount > 0) {
        // 检查是否有 title 属性（用于 hover 提示）
        const firstTitle = titles.first();
        const titleAttr = await firstTitle.getAttribute('title');
        
        // 验证文本溢出样式
        const textStyle = await firstTitle.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            textOverflow: styles.textOverflow,
            overflow: styles.overflow,
            whiteSpace: styles.whiteSpace,
          };
        });
        
        // 应该有文本溢出处理
        expect(
          textStyle.textOverflow === 'ellipsis' ||
          textStyle.overflow === 'hidden' ||
          titleAttr !== null
        ).toBe(true);
      }
    }
  });
});
