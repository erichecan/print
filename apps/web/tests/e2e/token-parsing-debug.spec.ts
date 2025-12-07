/**
 * Token 解析调试测试
 * [2025-12-07 08:10:00] 使用 Chrome DevTools 验证 token 是否被正确解析和传递
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('Token 解析调试测试', () => {
  test('使用 Chrome DevTools 验证 token 解析和传递', async ({ page, context }) => {
    // 启用 Chrome DevTools 追踪
    await context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true,
    });

    // 1. 登录
    console.log('[Token Debug] 开始登录...');
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('[Token Debug] 登录成功');

    // 2. 检查 localStorage 中的 token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log(`[Token Debug] Token in localStorage: ${token ? token.substring(0, 50) + '...' : 'none'}`);
    
    if (!token) {
      throw new Error('Token 未存储到 localStorage');
    }

    // 3. 解析 token（JWT）
    const tokenParts = token.split('.');
    console.log(`[Token Debug] Token 部分数量: ${tokenParts.length}`);
    
    if (tokenParts.length === 3) {
      try {
        // 解析 payload（不验证签名）
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('[Token Debug] Token Payload:', {
          userId: payload.userId,
          iat: payload.iat,
          exp: payload.exp,
          expiresIn: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
        });
      } catch (e) {
        console.error('[Token Debug] ❌ 无法解析 token payload:', e);
      }
    }

    // 4. 监听所有网络请求，检查 Authorization header
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/admin/offline-order-colors')) {
        const headers = request.headers();
        const authHeader = headers['authorization'] || headers['Authorization'] || 'none';
        requests.push({
          url: request.url(),
          method: request.method(),
          authorization: authHeader,
          hasAuthorization: authHeader !== 'none',
          authorizationPreview: authHeader !== 'none' ? authHeader.substring(0, 50) : 'none',
          allHeaders: Object.keys(headers),
        });
        console.log('[Token Debug] 📤 Request:', {
          url: request.url(),
          hasAuthorization: authHeader !== 'none',
          authorizationPreview: authHeader !== 'none' ? authHeader.substring(0, 50) : 'none',
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
          body: body.substring(0, 300),
        });
        console.log('[Token Debug] 📥 Response:', {
          url: response.url(),
          status,
          body: body.substring(0, 200),
        });
      }
    });

    // 5. 访问配置页面
    console.log('[Token Debug] 访问配置页面...');
    await page.goto(`${FRONTEND_URL}/admin/offline-orders/config`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 6. 检查控制台日志
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Config Page') || text.includes('API Proxy') || text.includes('Token')) {
        consoleMessages.push(`[${msg.type()}] ${text}`);
      }
    });

    // 7. 截图
    await page.screenshot({ path: 'test-results/token-parsing-debug.png', fullPage: true });

    // 8. 停止追踪并保存
    await context.tracing.stop({ path: 'test-results/token-parsing-debug-trace.zip' });

    // 9. 输出详细结果
    console.log('\n[Token Debug] ========== 测试结果 ==========');
    console.log(`[Token Debug] Token 存在: ${!!token}`);
    console.log(`[Token Debug] Token 长度: ${token?.length || 0}`);
    console.log(`[Token Debug] 请求数量: ${requests.length}`);
    console.log(`[Token Debug] 响应数量: ${responses.length}`);
    console.log(`[Token Debug] 控制台消息数量: ${consoleMessages.length}`);
    
    if (requests.length > 0) {
      const req = requests[0];
      console.log('\n[Token Debug] 📤 请求详情:');
      console.log(JSON.stringify(req, null, 2));
    }

    if (responses.length > 0) {
      const resp = responses[0];
      console.log('\n[Token Debug] 📥 响应详情:');
      console.log(JSON.stringify(resp, null, 2));
      
      if (resp.status === 403) {
        console.log('\n[Token Debug] ❌ 403 错误详情:');
        try {
          const errorBody = JSON.parse(resp.body);
          console.log(JSON.stringify(errorBody, null, 2));
        } catch (e) {
          console.log('无法解析错误响应体');
        }
      }
    }

    // 10. 验证
    expect(token).toBeTruthy();
    if (requests.length > 0) {
      expect(requests[0].hasAuthorization).toBe(true);
    }
  });
});

