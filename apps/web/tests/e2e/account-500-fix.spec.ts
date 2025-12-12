/**
 * Account 500 Error Fix E2E Tests
 * [2025-01-27 18:55:00] 测试账户页面不再返回 500 错误
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Account 500 Error Fix', () => {
  test('should redirect to login when not authenticated (not 500)', async ({ page }) => {
    // 清除所有 cookies
    await page.context().clearCookies();
    
    // 访问账户页面
    const response = await page.goto(`${BASE_URL}/account`);
    
    // 应该重定向到登录页，而不是返回 500
    await expect(page).toHaveURL(/.*\/login/);
    
    // 检查响应状态码（应该是 200 或 302，不应该是 500）
    if (response) {
      expect(response.status()).not.toBe(500);
      expect([200, 302, 307]).toContain(response.status());
    }
  });

  test('should return 200 when authenticated', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'valid-test-token', // 实际测试中需要使用有效的测试 token
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // Mock 后端 API 响应
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          userId: 'test-user-id',
          email: 'test@example.com',
        }),
      });
    });

    const response = await page.goto(`${BASE_URL}/account`);
    
    // 应该返回 200，而不是 500
    if (response) {
      expect(response.status()).toBe(200);
      expect(response.status()).not.toBe(500);
    }
  });

  test('should handle backend API failure gracefully (not 500)', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // Mock 后端 API 返回错误
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    const response = await page.goto(`${BASE_URL}/account`);
    
    // 应该重定向到登录页，而不是返回 500
    await expect(page).toHaveURL(/.*\/login/);
    
    if (response) {
      expect(response.status()).not.toBe(500);
    }
  });

  test('should handle network errors gracefully (not 500)', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // Mock 网络错误
    await page.route('**/api/auth/me', async (route) => {
      await route.abort('failed');
    });

    const response = await page.goto(`${BASE_URL}/account`);
    
    // 应该重定向到登录页，而不是返回 500
    await expect(page).toHaveURL(/.*\/login/);
    
    if (response) {
      expect(response.status()).not.toBe(500);
    }
  });

  test('should include request ID in headers', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/account`);
    
    // 检查响应头中是否包含 request ID
    const requestId = response?.headers()['x-request-id'] || response?.headers()['x-trace-id'];
    expect(requestId).toBeDefined();
  });
});
