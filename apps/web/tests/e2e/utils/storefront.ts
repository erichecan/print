/**
 * [2025-11-24 10:34:12] Storefront 页面常用交互助手
 */
import type { Page } from '@playwright/test';

export async function addProductToCart(page: Page, slug: string = 'classic-crew-tee') {
  // [2025-11-28 16:55:00] 优化商品详情页加载和等待策略
  await page.goto(`/products/${slug}`);
  await page.waitForLoadState('domcontentloaded');
  
  // [2025-11-28 16:55:00] 等待商品详情页加载，使用更宽松的等待策略
  await page.waitForResponse(
    (response) => response.url().includes(`/api/products`) && response.status() === 200,
    { timeout: 15000 }
  ).catch(() => {});
  
  // [2025-11-28 16:55:00] 等待添加到购物车按钮出现
  const addToCartButton = page.locator('button:has-text("Add to cart"), button:has-text("添加到购物车")').first();
  await addToCartButton.waitFor({ state: 'visible', timeout: 20000 });
  await addToCartButton.click();
  
  // 轻微等待以便 CartContext 重新拉取
  await page.waitForTimeout(1000);
}

