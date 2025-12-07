/**
 * Cookie 和 Authorization Header 测试
 * [2025-12-07 07:35:00] 验证 Authorization header 是否被正确发送
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('Authorization Header 测试', () => {
  test('验证 Authorization header 是否被正确发送到后端', async ({ page, context }) => {
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
    console.log(`[Auth Header Test] Token Cookie exists: ${!!tokenCookie}`);

    // 3. 监听网络请求，检查请求头
    const requestsWithHeaders: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/admin/offline-order-colors')) {
        const headers = request.headers();
        requestsWithHeaders.push({
          url: request.url(),
          method: request.method(),
          cookieHeader: headers['cookie'] || headers['Cookie'] || 'none',
          authorizationHeader: headers['authorization'] || headers['Authorization'] || 'none',
          allHeaders: Object.keys(headers),
        });
      }
    });

    // 4. 访问配置页面
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 5. 检查请求头
    console.log(`[Auth Header Test] 找到 ${requestsWithHeaders.length} 个相关请求`);
    requestsWithHeaders.forEach((req, idx) => {
      console.log(`[Auth Header Test] 请求 ${idx + 1}:`, {
        url: req.url,
        method: req.method,
        cookieHeader: req.cookieHeader.substring(0, 50),
        authorizationHeader: req.authorizationHeader.substring(0, 50),
        hasAuthorization: req.authorizationHeader !== 'none',
      });
    });

    // 6. 手动测试：直接调用 API，检查响应
    console.log('[Auth Header Test] 手动测试 API 请求...');
    const token = tokenCookie?.value;
    if (token) {
      const manualResponse = await page.request.get(
        `${FRONTEND_URL}/api/proxy/admin/offline-order-colors`,
        {
          headers: {
            'Cookie': cookies.map((c) => `${c.name}=${c.value}`).join('; '),
            'Authorization': `Bearer ${token}`, // 手动添加 Authorization header
          },
        }
      );
      console.log(`[Auth Header Test] 手动请求（带 Authorization header）状态: ${manualResponse.status()}`);
      if (manualResponse.status() === 200) {
        const data = await manualResponse.json();
        console.log(`[Auth Header Test] ✅ 成功获取数据: ${JSON.stringify(data).substring(0, 100)}`);
      } else {
        const errorText = await manualResponse.text();
        console.log(`[Auth Header Test] ❌ 错误响应: ${errorText.substring(0, 200)}`);
      }
    }

    // 7. 截图
    await page.screenshot({ path: 'test-results/auth-header-test.png', fullPage: true });
  });
});

