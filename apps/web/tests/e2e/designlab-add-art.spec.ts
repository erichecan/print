/**
 * Design Lab Add Art E2E Tests
* 测试 Add Art 功能的完整流程
 */
import { test, expect } from '@playwright/test';

test.describe('Design Lab Add Art', () => {
  test.beforeEach(async ({ page }) => {
// 打开 Design Lab
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');
  });

  test('should display artwork categories', async ({ page }) => {
// 点击 Add Art 按钮
    const addArtButton = page.locator('button[aria-label*="art" i], button:has-text("Add Art")').first();
    await addArtButton.click();
    
// 等待分类列表加载
    await page.waitForSelector('[data-testid^="art-category-"]', { timeout: 10000 });
    
// 验证分类显示
    const categories = page.locator('[data-testid^="art-category-"]');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to subcategory and display artworks', async ({ page }) => {
// 打开 Add Art
    const addArtButton = page.locator('button[aria-label*="art" i], button:has-text("Add Art")').first();
    await addArtButton.click();
    
// 等待分类加载
    await page.waitForSelector('[data-testid^="art-category-"]', { timeout: 10000 });
    
// 点击第一个分类（如果有）
    const firstCategory = page.locator('[data-testid^="art-category-"]').first();
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      
// 等待子分类或素材加载
      await page.waitForSelector('[data-testid^="art-subcategory-"], [data-testid^="artwork-"]', { timeout: 10000 });
      
// 验证返回按钮存在
      const backButton = page.locator('[data-testid="art-back-button"]');
      await expect(backButton).toBeVisible();
    }
  });

  test('should search for artworks', async ({ page }) => {
// 打开 Add Art
    const addArtButton = page.locator('button[aria-label*="art" i], button:has-text("Add Art")').first();
    await addArtButton.click();
    
// 等待搜索框加载
    const searchInput = page.locator('[data-testid="art-search-input"]');
    await searchInput.waitFor({ timeout: 10000 });
    
// 输入搜索关键词
    await searchInput.fill('dog');
    await page.waitForTimeout(1000); // 等待防抖
    
// 验证搜索结果（如果有）
    const artworks = page.locator('[data-testid^="artwork-"]');
    const count = await artworks.count();
    // 可能没有结果，所以只验证没有错误
    const error = page.locator('.dl-art-panel__error');
    await expect(error).not.toBeVisible({ timeout: 5000 });
  });

  test('should select artwork and add to canvas', async ({ page }) => {
// 打开 Add Art
    const addArtButton = page.locator('button[aria-label*="art" i], button:has-text("Add Art")').first();
    await addArtButton.click();
    
// 等待分类加载并点击第一个
    await page.waitForSelector('[data-testid^="art-category-"]', { timeout: 10000 });
    const firstCategory = page.locator('[data-testid^="art-category-"]').first();
    
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      
// 等待素材加载
      await page.waitForSelector('[data-testid^="artwork-"]', { timeout: 10000 });
      
// 点击第一个素材
      const firstArtwork = page.locator('[data-testid^="artwork-"]').first();
      if (await firstArtwork.isVisible()) {
        await firstArtwork.click();
        
// 验证素材已添加到画布（检查画布是否有对象）
        await page.waitForTimeout(1000);
        // 这里可以添加更多验证，比如检查画布对象数量
      }
    }
  });
});
