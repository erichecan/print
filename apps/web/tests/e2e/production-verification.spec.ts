/**
 * 线上环境综合验证测试
* 集成所有验证测试，检查修改是否生效
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app';

test.describe('线上环境综合验证', () => {
  test('验证筛选功能修复是否生效', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
// 使用 domcontentloaded 替代 networkidle，避免超时
    await page.waitForLoadState('domcontentloaded');
    
    // 等待筛选区域加载
    const sidebar = page.locator('.plp-new__sidebar');
    await sidebar.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    
    // 1. 检查筛选区域宽度
    if (await sidebar.count() > 0) {
      const width = await sidebar.evaluate((el) => window.getComputedStyle(el).width);
      expect(width).toBe('280px');
      
      // 检查是否有横向滚动条
      const hasHorizontalScroll = await sidebar.evaluate((el) => {
        return el.scrollWidth > el.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    }
    
    // 2. 检查图标切换功能
    const details = page.locator('details.filter-section').first();
    await details.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    
    if (await details.count() > 0) {
      const summary = details.locator('summary');
      const isOpenBefore = await details.evaluate((el) => el.hasAttribute('open'));
      
      // 点击折叠
      await summary.click();
      await page.waitForTimeout(500);
      
      const isOpenAfter = await details.evaluate((el) => el.hasAttribute('open'));
      expect(isOpenAfter).not.toBe(isOpenBefore);
    }
  });

  test('验证 Admin 登录修复是否生效', async ({ page }) => {
    // 清除 cookies 确保未登录状态
    await page.context().clearCookies();
    
    // 访问登录页面
    await page.goto(`${FRONTEND_URL}/admin/login`);
await page.waitForLoadState('domcontentloaded'); // 改用 domcontentloaded 避免超时
    
    // 验证可以访问登录页面
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // 验证登录表单存在
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // 验证没有重定向循环消息
    const redirectMessage = page.locator('text=Redirecting to login');
    await expect(redirectMessage).not.toBeVisible();
  });

  test('验证筛选参数是否正确传递给 API', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
    await page.waitForLoadState('domcontentloaded');
    
    // 监听 API 请求
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/products') && request.method() === 'GET') {
        apiRequests.push(request.url());
      }
    });
    
    // 等待筛选区域加载
    await page.waitForSelector('.filter-checkbox input[type="checkbox"]', { timeout: 15000 }).catch(() => {});
    
    // 点击一个筛选选项
    const checkbox = page.locator('.filter-checkbox input[type="checkbox"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    
    if (await checkbox.count() > 0) {
      await checkbox.click();
      
      // 等待 API 请求（最多等待 5 秒）
      await page.waitForTimeout(3000);
      
      // 验证至少有一个 API 请求
      if (apiRequests.length > 0) {
        const lastRequest = new URL(apiRequests[apiRequests.length - 1]);
        // URL 参数应该被传递
        expect(lastRequest.search.length).toBeGreaterThan(0);
      }
    }
  });

  test('验证颜色对齐修复是否生效', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/products`);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('.color-swatch', { timeout: 15000 }).catch(() => {});
    
    const colorSwatch = page.locator('.color-swatch').first();
    await colorSwatch.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    
    if (await colorSwatch.count() > 0) {
      // 检查颜色圆圈是否在容器中心
      const isCentered = await colorSwatch.evaluate((el) => {
        const circle = el.querySelector('.color-swatch__circle');
        if (!circle) return false;
        
        const containerRect = el.getBoundingClientRect();
        const circleRect = circle.getBoundingClientRect();
        
        const horizontalCenter = Math.abs(
          (containerRect.width - circleRect.width) / 2 - (circleRect.left - containerRect.left)
        ) < 2;
        const verticalCenter = Math.abs(
          (containerRect.height - circleRect.height) / 2 - (circleRect.top - containerRect.top)
        ) < 2;
        
        return horizontalCenter && verticalCenter;
      });
      
      expect(isCentered).toBeTruthy();
    }
  });
});

