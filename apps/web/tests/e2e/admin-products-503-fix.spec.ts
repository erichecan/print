/**
 * Admin Products 503 Fix E2E Test
 * [2025-01-27 19:00:00] 验证 503 Service Unavailable 错误已修复
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 登录管理后台
 */
async function loginAsAdmin(page: any) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  // 等待登录完成
  await page.waitForURL(/\/admin/, { timeout: 10000 });
}

test.describe('Admin Products 503 Fix', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should not return 503 when updating product', async ({ page }) => {
    // 监听网络请求，捕获 503 错误
    const networkErrors: Array<{ url: string; status: number; statusText: string }> = [];
    
    page.on('response', (response) => {
      if (response.status() === 503) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    // 导航到商品列表
    await page.goto(`${BASE_URL}/admin/products`);
    await page.waitForLoadState('networkidle');

    // 点击第一个商品的编辑按钮
    const editButton = page.locator('a[href*="/admin/products/"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // 修改库存
      const stockInput = page.locator('input[name="stockQuantity"]');
      if (await stockInput.count() > 0) {
        const currentValue = await stockInput.inputValue();
        const newValue = String(parseInt(currentValue || '0', 10) + 1);
        await stockInput.fill(newValue);

        // 选择分类（如果有）
        const categorySelect = page.locator('select[name="categoryId"]');
        if (await categorySelect.count() > 0) {
          const options = await categorySelect.locator('option').count();
          if (options > 1) {
            await categorySelect.selectOption({ index: 1 });
          }
        }

        // 提交表单
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // 等待响应（给冷启动更多时间）
        await page.waitForTimeout(3000);

        // 验证没有 503 错误
        expect(networkErrors.length).toBe(0);

        // 验证成功或正确的错误处理
        const errorMessage = page.locator('.form-error');
        const successMessage = page.locator('text=/成功|保存|更新/i');
        const isOnListPage = page.url().includes('/admin/products') && !page.url().includes('/admin/products/');

        const hasError = await errorMessage.count() > 0;
        const hasSuccess = await successMessage.count() > 0;

        // 应该要么成功，要么显示错误（但不是 503）
        expect(hasError || hasSuccess || isOnListPage).toBe(true);

        // 如果有错误，应该包含 traceId
        if (hasError) {
          const errorText = await errorMessage.textContent();
          expect(errorText).not.toContain('503');
          expect(errorText).not.toContain('Service Unavailable');
        }
      }
    }
  });

  test('should handle timeout gracefully', async ({ page, context }) => {
    // 拦截请求，模拟超时场景
    await context.route('**/api/proxy/admin/products/**', async (route) => {
      if (route.request().method() === 'PUT') {
        // 模拟超时：延迟 20 秒（超过 15 秒超时）
        await new Promise(resolve => setTimeout(resolve, 20000));
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UPSTREAM_TIMEOUT',
              message: '请求超时',
            },
            traceId: `test-trace-${Date.now()}`,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${BASE_URL}/admin/products`);
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('a[href*="/admin/products/"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // 修改商品
      await page.fill('input[name="stockQuantity"]', '100');

      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待错误提示
      await page.waitForTimeout(2000);

      // 验证：应该显示超时错误，但不是 503
      const errorMessage = page.locator('.form-error');
      await expect(errorMessage).toBeVisible();
      
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/超时|timeout/i);
      expect(errorText).not.toContain('503');
    }
  });
});
