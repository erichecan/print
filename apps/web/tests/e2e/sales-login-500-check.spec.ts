import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-5spbppmmza-uc.a.run.app';

// 2026-03-06: 检查 Sales 登录是否返回 500
// 这里只关心 /api/auth/login 的 HTTP 状态码，而不是凭证是否正确

test.describe('Sales 登录 500 检测', () => {
  test('提交登录表单时捕获 /api/auth/login 状态码', async ({ page }) => {
    const loginUrl = `${FRONTEND_URL}/offline-orders/sales/login?callbackUrl=%2Foffline-orders`;

    let loginStatus: number | null = null;

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/auth/login')) {
        loginStatus = response.status();
        console.log('[Sales Login Test] /api/auth/login status =', loginStatus);
      }
    });

    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'dummy-password');

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/auth/login')),
      page.click('button[type="submit"]'),
    ]);

    loginStatus = response.status();
    console.log('[Sales Login Test] /api/auth/login final status =', loginStatus);

    // 这里只检查是否为 500，实际业务上 401 也是合理结果（账号/密码错误）
    expect(loginStatus, 'Sales 登录不应该返回 500').not.toBe(500);
  });
});
