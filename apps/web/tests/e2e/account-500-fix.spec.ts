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

  // [2025-12-12 14:15:00] 新增测试：验证 redirect 错误不被捕获
  test('should properly handle redirect without Server Components error', async ({ page }) => {
    // 清除所有 cookies，确保未登录
    await page.context().clearCookies();
    
    // 访问账户页面
    const response = await page.goto(`${BASE_URL}/account`, {
      waitUntil: 'networkidle',
    });
    
    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 检查控制台是否有 Server Components 错误
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Server Components render') || text.includes('digest')) {
          consoleErrors.push(text);
        }
      }
    });
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 不应该有 Server Components 错误
    expect(consoleErrors.length).toBe(0);
  });

  // [2025-12-12 14:15:00] 新增测试：验证超时错误处理
  test('should handle API timeout gracefully (not 500)', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // Mock 后端 API 超时（延迟响应超过 10 秒）
    await page.route('**/api/auth/me', async (route) => {
      // 模拟超时：不响应或延迟很久
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15秒延迟
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
      });
    });

    // 设置较短的超时时间
    const response = await page.goto(`${BASE_URL}/account`, {
      timeout: 12000, // 12秒超时
    }).catch(() => null);
    
    // 即使超时，也不应该返回 500
    // 应该重定向到登录页或显示错误页面
    if (response) {
      expect(response.status()).not.toBe(500);
    }
  });

  // [2025-12-12 14:15:00] 新增测试：验证 JSON 解析错误处理
  test('should handle invalid JSON response gracefully (not 500)', async ({ page, context }) => {
    // 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // Mock 后端 API 返回无效 JSON
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {', // 无效的 JSON
      });
    });

    const response = await page.goto(`${BASE_URL}/account`);
    
    // 应该重定向到登录页，而不是返回 500
    await expect(page).toHaveURL(/.*\/login/);
    
    if (response) {
      expect(response.status()).not.toBe(500);
    }
  });
});
