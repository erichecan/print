/**
 * 生产环境 503/500 检测：访问首页并监听 /api/proxy/cart、/api/auth/login 等请求
 * 2026-03-06
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-5spbppmmza-uc.a.run.app';

test.describe('Production 503/500 check', () => {
  test('首页加载并记录 proxy/cart 与 auth 请求状态', async ({ page }) => {
    const failed: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if (
        (url.includes('/api/proxy/cart') || url.includes('/api/auth/login') || url.includes('/api/categories') || url.includes('/api/testimonials')) &&
        (status === 500 || status === 503)
      ) {
        failed.push({ url: url.replace(FRONTEND_URL, ''), status });
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (failed.length > 0) {
      console.log('Failed API responses:', JSON.stringify(failed, null, 2));
    }
    expect(failed, `不应出现 500/503: ${JSON.stringify(failed)}`).toEqual([]);
  });
});
