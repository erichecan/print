/**
 * 分类侧边栏 UI 测试
* 测试 CategorySidebar 组件，验证只显示有产品的分类
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('分类侧边栏 UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
    await page.waitForLoadState('domcontentloaded');
    // 等待分类侧边栏加载
    await page.waitForSelector('[data-testid="category-sidebar"]', { 
      state: 'attached', 
      timeout: 20000 
    }).catch(() => {});
  });

  test('应该显示分类侧边栏', async ({ page }) => {
    const sidebar = page.locator('[data-testid="category-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('应该只显示有产品的分类', async ({ page }) => {
    // 等待分类加载完成
    await page.waitForTimeout(2000);
    
    // 获取所有分类节点
    const categoryNodes = page.locator('.category-node');
    const count = await categoryNodes.count();
    
    if (count > 0) {
      // 验证每个分类都有产品计数
      for (let i = 0; i < count; i++) {
        const node = categoryNodes.nth(i);
        const countText = await node.locator('.category-count').textContent();
        
        if (countText) {
          // 提取数字，例如 "(5)" -> 5
          const match = countText.match(/\((\d+)\)/);
          if (match) {
            const productCount = parseInt(match[1], 10);
            // 分类应该显示产品计数，或者有子分类
            const hasChildren = await node.locator('.category-children').count() > 0;
            expect(productCount > 0 || hasChildren).toBe(true);
          }
        }
      }
    }
  });

  test('应该支持展开和收起分类', async ({ page }) => {
    // 查找有子分类的分类
    const expandableCategory = page.locator('.category-toggle').first();
    
    if (await expandableCategory.count() > 0) {
      const isExpandedBefore = await expandableCategory.getAttribute('aria-expanded');
      
      // 点击展开
      await expandableCategory.click();
      await page.waitForTimeout(500);
      
      const isExpandedAfter = await expandableCategory.getAttribute('aria-expanded');
      expect(isExpandedAfter).toBe('true');
      
      // 再次点击收起
      await expandableCategory.click();
      await page.waitForTimeout(500);
      
      const isExpandedFinal = await expandableCategory.getAttribute('aria-expanded');
      expect(isExpandedFinal).toBe('false');
    }
  });

  test('应该显示产品计数', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const categoryLinks = page.locator('.category-link');
    const count = await categoryLinks.count();
    
    if (count > 0) {
      // 至少有一个分类链接应该显示产品计数
      let hasCount = false;
      for (let i = 0; i < count; i++) {
        const link = categoryLinks.nth(i);
        const countElement = link.locator('.category-count');
        if (await countElement.count() > 0) {
          hasCount = true;
          break;
        }
      }
      expect(hasCount).toBe(true);
    }
  });

  test('点击分类应该跳转到对应页面', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const firstCategoryLink = page.locator('.category-link').first();
    
    if (await firstCategoryLink.count() > 0) {
      const href = await firstCategoryLink.getAttribute('href');
      expect(href).toContain('/products');
      expect(href).toContain('category=');
    }
  });

  test('应该保持一级和二级分类结构', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // 查找一级分类（没有父级缩进）
    const rootCategories = page.locator('.category-item').filter({
      hasNot: page.locator('.category-children')
    });
    
    // 查找有子分类的一级分类
    const expandableRoot = page.locator('.category-toggle').first();
    
    if (await expandableRoot.count() > 0) {
      await expandableRoot.click();
      await page.waitForTimeout(500);
      
      // 验证子分类存在
      const children = page.locator('.category-children .category-node');
      const childCount = await children.count();
      
      if (childCount > 0) {
        // 验证子分类有正确的缩进
        const firstChild = children.first();
        const paddingLeft = await firstChild.locator('.category-item').evaluate(
          (el) => window.getComputedStyle(el).paddingLeft
        );
        expect(parseInt(paddingLeft)).toBeGreaterThan(12);
      }
    }
  });
});
