/**
 * [2025-11-24 10:34:12] Storefront 页面常用交互助手
 */
import type { Page } from '@playwright/test';

export async function addProductToCart(page: Page, slug: string = 'classic-crew-tee') {
  await page.goto(`/products/${slug}`);
  await page.waitForSelector('button:has-text("Add to cart")', { timeout: 15000 });
  await page.click('button:has-text("Add to cart")');
  // 轻微等待以便 CartContext 重新拉取
  await page.waitForTimeout(1000);
}

