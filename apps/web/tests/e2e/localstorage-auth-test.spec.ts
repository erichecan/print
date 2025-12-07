/**
 * localStorage + Authorization Header 认证测试
 * [2025-12-07 08:00:00] 验证新的认证流程
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('localStorage + Authorization Header 认证测试', () => {
  test('验证登录后 token 存储到 localStorage 并正确传递', async ({ page, context }) => {
    // 1. 登录
    console.log('[Auth Test] 开始登录...');
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('[Auth Test] 登录成功');

    // 2. 检查 localStorage 中的 token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log(`[Auth Test] Token in localStorage: ${token ? token.substring(0, 30) + '...' : 'none'}`);
    expect(token).toBeTruthy();

    // 3. 监听网络请求，检查 Authorization header
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/admin/offline-order-colors')) {
        const headers = request.headers();
        requests.push({
          url: request.url(),
          method: request.method(),
          authorization: headers['authorization'] || headers['Authorization'] || 'none',
          hasAuthorization: !!(headers['authorization'] || headers['Authorization']),
        });
        console.log('[Auth Test] 📤 Request:', {
          url: request.url(),
          authorization: headers['authorization']?.substring(0, 50) || 'none',
        });
      }
    });

    // 4. 访问配置页面
    console.log('[Auth Test] 访问配置页面...');
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 5. 检查请求
    console.log(`[Auth Test] 找到 ${requests.length} 个相关请求`);
    if (requests.length > 0) {
      const req = requests[0];
      console.log('[Auth Test] 请求详情:', {
        hasAuthorization: req.hasAuthorization,
        authorizationPreview: req.authorization.substring(0, 50),
      });
      expect(req.hasAuthorization).toBe(true);
    }

    // 6. 检查响应
    const responses: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/proxy/admin/offline-order-colors')) {
        const status = response.status();
        let body = '';
        try {
          body = await response.text();
        } catch (e) {
          body = '无法读取响应体';
        }
        responses.push({
          url: response.url(),
          status,
          body: body.substring(0, 200),
        });
        console.log('[Auth Test] 📥 Response:', {
          url: response.url(),
          status,
          body: body.substring(0, 200),
        });
      }
    });

    // 7. 再次访问配置页面，捕获响应
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 8. 验证结果
    const failedResponses = responses.filter(r => r.status === 403);
    if (failedResponses.length > 0) {
      console.log(`[Auth Test] ❌ 发现 ${failedResponses.length} 个 403 错误`);
      failedResponses.forEach((resp) => {
        console.log('[Auth Test] 403 错误详情:', resp);
      });
    } else {
      console.log('[Auth Test] ✅ 没有 403 错误');
    }

    // 9. 截图
    await page.screenshot({ path: 'test-results/localstorage-auth-test.png', fullPage: true });

    // 10. 验证
    expect(token).toBeTruthy();
    if (requests.length > 0) {
      expect(requests[0].hasAuthorization).toBe(true);
    }
  });
});

