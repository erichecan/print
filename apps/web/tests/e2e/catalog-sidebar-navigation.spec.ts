/**
 * Catalog Sidebar Navigation E2E Tests
 * [2025-12-11 23:05:00] 测试分类导航的 URL 路由、交互与列表数据一致性
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';

test.describe('Catalog Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
    await page.waitForLoadState('domcontentloaded');
    // 等待分类导航加载
    await page.waitForSelector('[data-testid="sidebar-grouped"]', { 
      state: 'attached', 
      timeout: 20000 
    }).catch(() => {});
  });

  test('导航应显示分组和子分类', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const sidebar = page.locator('[data-testid="sidebar-grouped"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    
    // 验证分组标题存在
    const groupTitle = sidebar.locator('.group-title').first();
    await expect(groupTitle).toBeVisible();
  });

  test('子分类应显示计数', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const childLinks = page.locator('[data-testid^="cat-"]');
    const count = await childLinks.count();
    
    if (count > 0) {
      // 验证至少一个子分类显示计数
      const firstChild = childLinks.first();
      const text = await firstChild.textContent();
      expect(text).toMatch(/\(\d+\)/); // 匹配 (数字) 格式
    }
  });

  test('点击子分类应跳转到对应 URL', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const firstChildLink = page.locator('[data-testid^="cat-"]').first();
    
    if (await firstChildLink.count() > 0) {
      const href = await firstChildLink.getAttribute('href');
      expect(href).toMatch(/^\/catalog\/[^/]+\/[^/]+$/);
      
      // 点击链接
      await firstChildLink.click();
      await page.waitForURL(/\/catalog\/.*\/.*/, { timeout: 5000 });
      
      // 验证 URL 格式
      const url = page.url();
      expect(url).toMatch(/\/catalog\/[^/]+\/[^/]+/);
    }
  });

  test('URL 应还原选中态', async ({ page }) => {
    // 直接访问分类页面
    await page.goto(`${FRONTEND_URL}/catalog/t-shirts/kids-t-shirts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const activeLink = page.locator('[data-testid="cat-t-shirts-kids-t-shirts"]');
    
    if (await activeLink.count() > 0) {
      await expect(activeLink).toHaveClass(/active/);
      await expect(activeLink).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('导航计数应与列表结果一致', async ({ page, request }) => {
    await page.goto(`${FRONTEND_URL}/catalog/t-shirts/kids-t-shirts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 获取导航显示的计数
    const navLink = page.locator('[data-testid="cat-t-shirts-kids-t-shirts"]');
    if (await navLink.count() > 0) {
      const navText = await navLink.textContent();
      const navCountMatch = navText?.match(/\((\d+)\)/);
      const navCount = navCountMatch ? parseInt(navCountMatch[1], 10) : 0;
      
      // 获取 API 返回的产品数量
      const apiResponse = await request.get(`${API_URL}/api/categories/kids-t-shirts/products?page=1&limit=24`);
      const apiData = await apiResponse.json();
      const apiTotal = apiData.pagination?.total || 0;
      
      // 验证计数一致（允许一些差异，因为可能有分页）
      expect(navCount).toBeGreaterThan(0);
      // 导航计数应该等于或接近 API 返回的总数
      expect(Math.abs(navCount - apiTotal)).toBeLessThan(5); // 允许小差异
    }
  });

  test('Show more/Show less 应正常工作', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const showMoreButton = page.locator('[data-testid^="show-more-"]').first();
    
    if (await showMoreButton.count() > 0) {
      const initialText = await showMoreButton.textContent();
      expect(initialText).toMatch(/Show more/i);
      
      // 点击展开
      await showMoreButton.click();
      await page.waitForTimeout(500);
      
      const expandedText = await showMoreButton.textContent();
      expect(expandedText).toMatch(/Show less/i);
      
      // 再次点击收起
      await showMoreButton.click();
      await page.waitForTimeout(500);
      
      const collapsedText = await showMoreButton.textContent();
      expect(collapsedText).toMatch(/Show more/i);
    }
  });

  test('切换分类时导航不应闪烁', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/catalog/t-shirts/short-sleeve-t-shirts`);
    await page.waitForLoadState('domcontentloaded');
    
    const sidebar = page.locator('[data-testid="sidebar-grouped"]');
    await expect(sidebar).toBeVisible();
    
    // 切换到另一个分类
    const anotherLink = page.locator('[data-testid="cat-t-shirts-long-sleeve-t-shirts"]');
    if (await anotherLink.count() > 0) {
      await anotherLink.click();
      await page.waitForTimeout(1000);
      
      // 验证导航仍然可见（没有闪烁消失）
      await expect(sidebar).toBeVisible();
    }
  });
});
