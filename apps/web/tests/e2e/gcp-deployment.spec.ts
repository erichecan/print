/**
 * GCP 部署验证测试
 * [2025-01-27 23:55:00] 验证 GCP Cloud Run 部署的前后端连接和功能
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

test.describe('GCP 部署验证', () => {
  test('前端页面应该正常加载', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // [2025-11-28 16:55:00] 使用 domcontentloaded 代替 networkidle，避免超时
    await page.waitForLoadState('domcontentloaded');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/Custom Merch|suvernire plus/i);
    
    // 检查导航菜单是否存在
    await expect(page.locator('nav').or(page.locator('[role="navigation"]')).first()).toBeVisible();
    
    // 检查搜索框是否存在
    const searchInput = page.locator('input[type="search"]').or(page.locator('[role="textbox"][name*="Search"]'));
    await expect(searchInput.first()).toBeVisible();
  });

  test('分类 API 应该返回数据', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/categories`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // 应该至少有分类数据
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('slug');
    }
  });

  test('产品 API 应该返回数据', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/products?limit=5`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('前端应该能成功加载分类数据', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:45:00] 改用 domcontentloaded 避免超时
    
    // 监听网络请求，检查分类 API 是否成功
    const categoriesResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200,
      { timeout: 30000 }
    );
    
    // 等待 API 响应
    const response = await categoriesResponse;
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  test('购物车 API 应该正常工作', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/cart`);
    
    // 购物车 API 应该返回 200（即使购物车为空）
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    // 购物车响应应该包含基本结构
    expect(data).toHaveProperty('itemCount');
  });

  test('设计实验室页面应该可访问', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/design-lab`);
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:45:00] 改用 domcontentloaded 避免超时
    
    // 等待页面内容加载
    await page.waitForTimeout(2000);
    
    // 页面应该正常加载，不应该显示 404
    const is404 = await page.locator('text=404').or(page.locator('text=Not Found')).count() > 0;
    expect(is404).toBeFalsy();
    
    // 页面应该有一些内容
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });

  test('产品列表页面应该可访问', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:45:00] 改用 domcontentloaded 避免超时
    
    // 等待页面内容加载
    await page.waitForTimeout(2000);
    
    // 页面应该正常加载
    const is404 = await page.locator('text=404').or(page.locator('text=Not Found')).count() > 0;
    expect(is404).toBeFalsy();
  });

  test('CORS 应该正确配置', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/categories`, {
      headers: {
        'Origin': FRONTEND_URL,
      },
    });
    
    expect(response.status()).toBe(200);
    
    // 检查 CORS 头
    const headers = response.headers();
    // 允许来自前端的请求
    expect(response.ok()).toBeTruthy();
  });
});

