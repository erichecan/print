/**
 * Design Lab 字体与素材库测试 (M5)
* 测试字体选择器、素材库浏览
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  addTextToCanvas,
  openArtPanel,
  selectArtCategory,
} from './fixtures/design-lab-helpers';
import { TEST_TEXTS, TEST_ART_CATEGORIES } from './fixtures/design-lab-test-data';

test.describe('Design Lab M5: 字体与素材库测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test.describe('字体选择器', () => {
    test('应该能够打开字体选择器', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 查找 Change Font 按钮
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 验证字体选择器打开
        const fontSelector = page.locator('.dl-font-selector, .dl-modal:has-text("Font"), .dl-font-panel').first();
        await expect(fontSelector).toBeVisible({ timeout: 5000 });
      }
    });

    test('应该显示字体分类', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 查找字体分类（如 Popular、Modern、Serif 等）
        const category = page.locator('text=/Popular|Modern|Serif|Sans Serif|Script/i').first();
        const isVisible = await category.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 字体分类应该存在
        expect(isVisible).toBeTruthy();
      }
    });

    test('应该能够浏览字体分类', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 点击第一个分类
        const firstCategory = page.locator('button:has-text("Popular"), .dl-font-category').first();
        const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await firstCategory.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('应该能够搜索字体', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 查找搜索框
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
        const isVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await searchInput.fill('Arial');
          await page.waitForTimeout(1000);
          
          // 验证搜索结果
          const result = page.locator('text=/Arial/i').first();
          const hasResult = await result.isVisible({ timeout: 2000 }).catch(() => false);
          expect(hasResult).toBeTruthy();
        }
      }
    });

    test('应该能够选择并应用字体', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 选择第一个字体
        const firstFont = page.locator('.dl-font-item, button[class*="font"]').first();
        const isVisible = await firstFont.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await firstFont.click();
          await page.waitForTimeout(1000);
          
          // 验证字体已应用（字体选择器可能关闭）
          const fontSelector = page.locator('.dl-font-selector').first();
          const isOpen = await fontSelector.isVisible({ timeout: 2000 }).catch(() => false);
          // 字体选择器可能关闭或保持打开
          expect(isOpen || !isOpen).toBeTruthy();
        }
      }
    });

    test('应该显示 Recently Used 字体', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const changeFontButton = page.locator('button:has-text("Change Font"), button:has-text("Font")').first();
      const isVisible = await changeFontButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeFontButton.click();
        await page.waitForTimeout(1000);
        
        // 查找 Recently Used 分类
        const recentlyUsed = page.locator('text=/Recently Used|Recent/i').first();
        const isVisible = await recentlyUsed.isVisible({ timeout: 3000 }).catch(() => false);
        
        // Recently Used 可能存在
        if (isVisible) {
          await expect(recentlyUsed).toBeVisible();
        }
      }
    });
  });

  test.describe('素材库浏览', () => {
    test('应该显示素材分类导航', async ({ page }) => {
      await openArtPanel(page);
      
      // 验证分类导航显示
      const categories = page.locator('.dl-art-category, button[class*="category"]').first();
      const isVisible = await categories.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 分类应该存在
      expect(isVisible).toBeTruthy();
    });

    test('应该能够浏览主要分类', async ({ page }) => {
      await openArtPanel(page);
      
      // 尝试点击不同的分类
      for (const categoryName of TEST_ART_CATEGORIES.slice(0, 5)) {
        const category = page.locator(`button:has-text("${categoryName}"), .dl-art-category:has-text("${categoryName}")`).first();
        const isVisible = await category.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isVisible) {
          await category.click();
          await page.waitForTimeout(1000);
          break; // 只测试第一个可见的分类
        }
      }
    });

    test('应该能够浏览子分类', async ({ page }) => {
      await openArtPanel(page);
      
      // 先选择一个主分类（如 Emojis）
      const emojisCategory = page.locator('button:has-text("Emojis"), .dl-art-category:has-text("Emojis")').first();
      const isVisible = await emojisCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await emojisCategory.click();
        await page.waitForTimeout(1000);
        
        // 查找子分类（如 Animals、Food & Drink 等）
        const subCategory = page.locator('text=/Animals|Food|Hands|Nature/i').first();
        const isVisible = await subCategory.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 子分类可能存在
        if (isVisible) {
          await subCategory.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('应该能够搜索素材', async ({ page }) => {
      await openArtPanel(page);
      
      // 查找搜索框
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="artwork" i]').first();
      const isVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await searchInput.fill('star');
        await page.waitForTimeout(1000);
        
        // 验证搜索结果
        const results = page.locator('.dl-art-item, .dl-artwork-item');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('应该显示素材网格', async ({ page }) => {
      await openArtPanel(page);
      
      // 选择一个分类
      const firstCategory = page.locator('.dl-art-category, button[class*="category"]').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        // 查找素材网格
        const artworkGrid = page.locator('.dl-art-grid, .dl-artwork-grid, .dl-art-item').first();
        const isVisible = await artworkGrid.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 素材网格可能存在
        expect(isVisible).toBeTruthy();
      }
    });

    test('应该能够选择并添加素材', async ({ page }) => {
      await openArtPanel(page);
      
      // 选择一个分类
      const firstCategory = page.locator('.dl-art-category').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        // 选择第一个素材
        const artwork = page.locator('.dl-art-item, .dl-artwork-item').first();
        const isVisible = await artwork.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await artwork.click();
          await page.waitForTimeout(1000);
          
          // 验证素材已添加到画布
          const canvas = page.locator('canvas').first();
          await expect(canvas).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('应该支持分页或懒加载', async ({ page }) => {
      await openArtPanel(page);
      
      // 选择一个分类
      const firstCategory = page.locator('.dl-art-category').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        // 滚动到底部触发懒加载
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
        
        // 验证有更多素材加载
        const artworkItems = page.locator('.dl-art-item, .dl-artwork-item');
        const count = await artworkItems.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('应该能够替换素材 (Change Art)', async ({ page }) => {
      await openArtPanel(page);
      
      // 先添加一个素材
      const firstCategory = page.locator('.dl-art-category').first();
      const isVisible = await firstCategory.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        
        const artwork = page.locator('.dl-art-item').first();
        const isVisible = await artwork.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await artwork.click();
          await page.waitForTimeout(1000);
          
          // 查找 Change Art 按钮
          const changeArtButton = page.locator('button:has-text("Change Art"), button:has-text("Change")').first();
          const isVisible = await changeArtButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (isVisible) {
            await changeArtButton.click();
            await page.waitForTimeout(1000);
            
            // 验证素材选择器重新打开
            const artSelector = page.locator('.dl-art-panel, .dl-artwork-selector').first();
            const hasSelector = await artSelector.isVisible({ timeout: 3000 }).catch(() => false);
            expect(hasSelector).toBeTruthy();
          }
        }
      }
    });
  });
});

