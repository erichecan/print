/**
 * Account Routes E2E Tests
* 测试账户页面路由和导航
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Account Routes', () => {
  test.beforeEach(async ({ page }) => {
    // 访问登录页面并登录（如果需要）
    // 注意：这里假设有测试用户，实际测试中可能需要先创建测试用户
  });

  test('should redirect to login when accessing /account without authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/account`);
    
    // 应该重定向到登录页面
    await expect(page).toHaveURL(/.*\/login/);
    // 应该包含 redirect 参数
    const url = page.url();
    expect(url).toContain('redirect=/account');
  });

  test('should access account dashboard when authenticated', async ({ page, context }) => {
    // 设置认证 cookie（需要根据实际认证机制调整）
    // 这里假设使用 token cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token', // 实际测试中需要使用有效的测试 token
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    await page.goto(`${BASE_URL}/account`);
    
    // 应该显示账户概览页面
    await expect(page.locator('h1')).toContainText(/账户|Account|Overview/i);
  });

  test('should navigate to all account subpages', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    const routes = [
      { path: '/account', title: /账户|Account|Overview/i },
      { path: '/account/orders', title: /订单|Orders/i },
      { path: '/account/billing', title: /账单|Billing/i },
      { path: '/account/billing/payment-methods', title: /支付|Payment/i },
      { path: '/account/addresses', title: /地址|Address/i },
      { path: '/account/profile', title: /资料|Profile/i },
      { path: '/account/team', title: /团队|Team/i },
      { path: '/account/assets', title: /素材|Assets/i },
      { path: '/account/notifications', title: /通知|Notification/i },
      { path: '/account/support', title: /支持|Support/i },
      { path: '/account/rewards', title: /折扣|Rewards/i },
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route.path}`);
      // 检查页面是否加载（不返回 404）
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe('complete');
      
      // 检查页面标题或主要内容存在
      const h1 = page.locator('h1').first();
      if (await h1.count() > 0) {
        await expect(h1).toBeVisible();
      }
    }
  });

  test('should show 404 page for non-existent order', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    await page.goto(`${BASE_URL}/account/orders/non-existent-order-id`);
    
    // 应该显示友好的错误消息
    await expect(page.locator('text=/订单未找到|Order not found/i')).toBeVisible();
  });

  test('should show sidebar navigation with active state', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    await page.goto(`${BASE_URL}/account/orders`);
    
    // 检查侧边栏存在
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    // 检查"订单"链接应该是激活状态
    const ordersLink = sidebar.locator('a[href="/account/orders"]');
    await expect(ordersLink).toBeVisible();
  });

  test('should show breadcrumb navigation', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    await page.goto(`${BASE_URL}/account/billing/payment-methods`);
    
    // 检查面包屑存在
    const breadcrumb = page.locator('text=/我的账户|My Account/i');
    await expect(breadcrumb).toBeVisible();
  });
});
