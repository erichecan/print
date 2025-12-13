/**
 * Account Render Error E2E Test
 * [2025-12-13 14:30:00] 复现并验证 My Account 页面的 Server Components render 错误
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Account Render Error Fix', () => {
  test('should not show Server Components render error when accessing /account', async ({ page }) => {
    // [2025-12-13 14:30:00] 清除所有 cookies，确保未登录
    await page.context().clearCookies();
    
    // [2025-12-13 14:30:00] 监听控制台错误
    const consoleErrors: Array<{ type: string; text: string }> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // 捕获 Server Components render 错误
        if (text.includes('Server Components render') || 
            text.includes('digest') ||
            text.includes('An error occurred')) {
          consoleErrors.push({ type: msg.type(), text });
        }
      }
    });
    
    // [2025-12-13 14:30:00] 访问账户页面
    const response = await page.goto(`${BASE_URL}/account`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    
    // [2025-12-13 14:30:00] 检查响应状态码（不应该是 500）
    if (response) {
      expect(response.status()).not.toBe(500);
    }
    
    // [2025-12-13 14:30:00] 应该重定向到登录页，而不是显示错误
    await expect(page).toHaveURL(/.*\/login/);
    
    // [2025-12-13 14:30:00] 不应该有 Server Components render 错误
    expect(consoleErrors.length).toBe(0);
    
    // [2025-12-13 14:30:00] 如果有错误，输出详细信息用于调试
    if (consoleErrors.length > 0) {
      console.error('Server Components render errors detected:', consoleErrors);
      throw new Error(`Found ${consoleErrors.length} Server Components render error(s)`);
    }
  });

  test('should access /account successfully when authenticated', async ({ page, context }) => {
    // [2025-12-13 14:35:00] 设置认证 cookie
    await context.addCookies([{
      name: 'token',
      value: 'valid-test-token', // 需要使用有效的测试 token
      domain: new URL(BASE_URL).hostname,
      path: '/',
    }]);

    // [2025-12-13 14:35:00] Mock 后端 API 响应
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

    // [2025-12-13 14:35:00] 监听控制台错误
    const consoleErrors: Array<{ type: string; text: string }> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Server Components render') || 
            text.includes('digest') ||
            text.includes('An error occurred')) {
          consoleErrors.push({ type: msg.type(), text });
        }
      }
    });

    const response = await page.goto(`${BASE_URL}/account`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    
    // [2025-12-13 14:35:00] 应该返回 200，而不是 500
    if (response) {
      expect(response.status()).toBe(200);
      expect(response.status()).not.toBe(500);
    }
    
    // [2025-12-13 14:35:00] 不应该有 Server Components render 错误
    expect(consoleErrors.length).toBe(0);
    
    if (consoleErrors.length > 0) {
      console.error('Server Components render errors detected:', consoleErrors);
      throw new Error(`Found ${consoleErrors.length} Server Components render error(s)`);
    }
  });
});
