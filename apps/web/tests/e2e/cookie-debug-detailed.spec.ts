/**
 * Cookie 详细调试测试
 * [2025-12-07 07:20:00] 详细检查 Cookie 传递的每个环节
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('Cookie 详细调试', () => {
  test('检查 Cookie 传递的每个环节', async ({ page, context }) => {
    // 1. 登录
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });

    // 2. 检查 Cookie
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c) => c.name === 'token');
    console.log(`[Cookie Debug] Token Cookie:`, {
      exists: !!tokenCookie,
      domain: tokenCookie?.domain,
      path: tokenCookie?.path,
      secure: tokenCookie?.secure,
      sameSite: tokenCookie?.sameSite,
      httpOnly: tokenCookie?.httpOnly,
    });

    // 3. 监听网络请求，检查 Cookie 头
    const requestsWithCookies: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/admin/offline-order-colors')) {
        const headers = request.headers();
        const cookieHeader = headers['cookie'] || headers['Cookie'] || 'none';
        requestsWithCookies.push({
          url: request.url(),
          method: request.method(),
          cookieHeader: cookieHeader,
          cookieLength: cookieHeader.length,
          hasToken: cookieHeader.includes('token='),
          allHeaders: Object.keys(headers),
        });
      }
    });

    // 4. 访问配置页面
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 等待所有请求完成

    // 5. 检查请求
    console.log(`[Cookie Debug] 找到 ${requestsWithCookies.length} 个相关请求`);
    requestsWithCookies.forEach((req, idx) => {
      console.log(`[Cookie Debug] 请求 ${idx + 1}:`, {
        url: req.url,
        method: req.method,
        cookieHeader: req.cookieHeader.substring(0, 100),
        cookieLength: req.cookieLength,
        hasToken: req.hasToken,
      });
    });

    // 6. 手动测试：使用 page.request 直接发送请求
    console.log('[Cookie Debug] 手动测试 API 请求...');
    const manualResponse = await page.request.get(
      `${FRONTEND_URL}/api/proxy/admin/offline-order-colors`,
      {
        headers: {
          'Cookie': cookies.map((c) => `${c.name}=${c.value}`).join('; '),
        },
      }
    );
    console.log(`[Cookie Debug] 手动请求状态: ${manualResponse.status()}`);
    if (manualResponse.status() !== 200) {
      const errorText = await manualResponse.text();
      console.log(`[Cookie Debug] 错误响应: ${errorText.substring(0, 300)}`);
    }

    // 7. 检查浏览器控制台日志
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('API Proxy') || msg.text().includes('Cookie')) {
        consoleMessages.push(msg.text());
      }
    });

    // 8. 再次访问配置页面，捕获控制台日志
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`[Cookie Debug] 控制台消息数量: ${consoleMessages.length}`);
    consoleMessages.forEach((msg, idx) => {
      console.log(`[Cookie Debug] 控制台 ${idx + 1}: ${msg.substring(0, 200)}`);
    });

    // 9. 截图
    await page.screenshot({ path: 'test-results/cookie-debug-detailed.png', fullPage: true });
  });
});

