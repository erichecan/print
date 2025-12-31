/**
 * Chrome DevTools 403 错误调试测试
* 使用 Chrome DevTools 进行详细调试
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('Chrome DevTools 403 错误调试', () => {
  test('使用 Chrome DevTools 调试 403 错误', async ({ page, context }) => {
    // 启用 Chrome DevTools
    await context.tracing.start({ screenshots: true, snapshots: true });
    
    // 1. 登录
    console.log('[DevTools Test] 开始登录...');
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('[DevTools Test] 登录成功');

    // 2. 检查 Cookie 和 localStorage
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c) => c.name === 'token');
    console.log(`[DevTools Test] Token Cookie:`, {
      exists: !!tokenCookie,
      value: tokenCookie?.value?.substring(0, 30) || 'none',
    });

    // 3. 监听所有网络请求
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/admin/offline-order-colors')) {
        const headers = request.headers();
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: {
            cookie: headers['cookie'] || headers['Cookie'] || 'none',
            authorization: headers['authorization'] || headers['Authorization'] || 'none',
          },
          allHeaders: Object.keys(headers),
        });
        console.log('[DevTools Test] 📤 Request:', {
          url: request.url(),
          cookie: headers['cookie']?.substring(0, 50) || 'none',
          authorization: headers['authorization']?.substring(0, 50) || 'none',
        });
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('/api/proxy/admin/offline-order-colors')) {
        const status = response.status();
        const headers = response.headers();
        let body = '';
        try {
          body = await response.text();
        } catch (e) {
          body = '无法读取响应体';
        }
        responses.push({
          url: response.url(),
          status,
          headers: {
            'content-type': headers['content-type'],
          },
          body: body.substring(0, 200),
        });
        console.log('[DevTools Test] 📥 Response:', {
          url: response.url(),
          status,
          body: body.substring(0, 200),
        });
      }
    });

    // 4. 访问配置页面
    console.log('[DevTools Test] 访问配置页面...');
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 5. 检查控制台错误
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('403') || msg.text().includes('API Proxy')) {
        consoleErrors.push(msg.text());
        console.log('[DevTools Test] Console:', msg.type(), msg.text());
      }
    });

    // 6. 截图
    await page.screenshot({ path: 'test-results/chrome-devtools-403-debug.png', fullPage: true });

    // 7. 停止追踪并保存
    await context.tracing.stop({ path: 'test-results/chrome-devtools-403-trace.zip' });

    // 8. 输出结果
    console.log('\n[DevTools Test] ========== 测试结果 ==========');
    console.log(`[DevTools Test] 请求数量: ${requests.length}`);
    console.log(`[DevTools Test] 响应数量: ${responses.length}`);
    console.log(`[DevTools Test] 控制台错误数量: ${consoleErrors.length}`);
    
    if (responses.length > 0) {
      const failedResponse = responses.find(r => r.status === 403);
      if (failedResponse) {
        console.log('\n[DevTools Test] ❌ 403 错误详情:');
        console.log(JSON.stringify(failedResponse, null, 2));
      }
    }

    if (requests.length > 0) {
      console.log('\n[DevTools Test] 📤 请求详情:');
      console.log(JSON.stringify(requests[0], null, 2));
    }
  });
});

