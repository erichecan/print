/**
 * Cookie 403 错误调试测试
* 验证 Cookie 传递和认证流程
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('Cookie 403 错误调试', () => {
  test('验证登录后 Cookie 是否正确设置和传递', async ({ page, context }) => {
    // 1. 访问登录页面
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    // 2. 监听网络请求
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      }
    });

    const responses: any[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        });
      }
    });

    // 3. 登录
    console.log('[Cookie Test] 开始登录...');
    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 等待登录完成
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('[Cookie Test] 登录成功');

    // 4. 检查 Cookie
    const cookies = await context.cookies();
    console.log(`[Cookie Test] 浏览器 Cookie 数量: ${cookies.length}`);
    cookies.forEach((cookie) => {
      console.log(`[Cookie Test] Cookie: ${cookie.name} = ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain}, path: ${cookie.path}, secure: ${cookie.secure}, sameSite: ${cookie.sameSite})`);
    });

    const tokenCookie = cookies.find((c) => c.name === 'token');
    if (tokenCookie) {
      console.log(`[Cookie Test] ✅ Token Cookie 已设置`);
      console.log(`[Cookie Test]   - Domain: ${tokenCookie.domain}`);
      console.log(`[Cookie Test]   - Path: ${tokenCookie.path}`);
      console.log(`[Cookie Test]   - Secure: ${tokenCookie.secure}`);
      console.log(`[Cookie Test]   - SameSite: ${tokenCookie.sameSite}`);
      console.log(`[Cookie Test]   - HttpOnly: ${tokenCookie.httpOnly}`);
    } else {
      console.log('[Cookie Test] ❌ Token Cookie 未找到');
    }

    // 5. 访问配置页面
    console.log('[Cookie Test] 访问配置页面...');
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待 API 请求完成

    // 6. 检查失败的请求
    const failedRequests = responses.filter((r) => r.status === 403);
    if (failedRequests.length > 0) {
      console.log(`[Cookie Test] ❌ 发现 ${failedRequests.length} 个 403 错误:`);
      failedRequests.forEach((req) => {
        console.log(`[Cookie Test]   - ${req.method} ${req.url} -> ${req.status}`);
      });
    } else {
      console.log('[Cookie Test] ✅ 没有 403 错误');
    }

    // 7. 检查配置页面的 API 请求
    const configRequests = requests.filter((r) => 
      r.url.includes('/api/proxy/admin/offline-order')
    );
    console.log(`[Cookie Test] 配置页面 API 请求数量: ${configRequests.length}`);
    configRequests.forEach((req) => {
      const cookieHeader = req.headers['cookie'] || req.headers['Cookie'] || 'none';
      console.log(`[Cookie Test]   - ${req.method} ${req.url}`);
      console.log(`[Cookie Test]     Cookie 头: ${cookieHeader.substring(0, 100)}...`);
      console.log(`[Cookie Test]     Cookie 长度: ${cookieHeader.length}`);
      console.log(`[Cookie Test]     包含 token: ${cookieHeader.includes('token=')}`);
    });

    // 8. 手动测试 API 请求
    console.log('[Cookie Test] 手动测试 API 请求...');
    const testResponse = await page.request.get(`${FRONTEND_URL}/api/proxy/admin/offline-order-colors`, {
      headers: {
        'Cookie': cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
    });
    
    console.log(`[Cookie Test] 手动请求状态: ${testResponse.status()}`);
    if (testResponse.status() !== 200) {
      const errorText = await testResponse.text();
      console.log(`[Cookie Test] 错误响应: ${errorText.substring(0, 200)}`);
    }

    // 9. 截图
    await page.screenshot({ path: 'test-results/cookie-debug-page.png', fullPage: true });

    // 10. 验证结果
    expect(tokenCookie).toBeDefined();
    if (failedRequests.length > 0) {
      console.log('[Cookie Test] ⚠️ 存在 403 错误，需要进一步调试');
    }
  });
});

