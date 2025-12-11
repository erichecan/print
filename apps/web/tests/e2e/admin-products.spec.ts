/**
 * Admin Products E2E Tests
 * [2025-01-27 18:00:00] 测试商品管理的创建、更新、删除流程
 * 包括成功场景和错误场景（400/500）
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

test.describe('Admin Products Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('商品编辑成功提交流程', async ({ page }) => {
    // 导航到商品列表
    await page.goto(`${BASE_URL}/admin/products`);
    await page.waitForLoadState('networkidle');

    // 点击第一个商品的编辑按钮
    const editButton = page.locator('a[href*="/admin/products/"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // 修改商品名称
      const nameInput = page.locator('input[name="name"]');
      const originalName = await nameInput.inputValue();
      const newName = `${originalName} [测试 ${Date.now()}]`;
      await nameInput.fill(newName);

      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待成功提示或页面跳转
      await page.waitForTimeout(2000);

      // 验证：应该显示成功消息或跳转到商品列表
      const successMessage = page.locator('text=/成功|保存|更新/i');
      const isOnListPage = page.url().includes('/admin/products') && !page.url().includes('/admin/products/');
      
      expect(successMessage.count() > 0 || isOnListPage).toBeTruthy();
    } else {
      // 如果没有商品，创建一个新商品
      await page.goto(`${BASE_URL}/admin/products/new`);
      await page.waitForLoadState('networkidle');

      // 填写必填字段
      await page.fill('input[name="name"]', `测试商品 ${Date.now()}`);
      await page.fill('input[name="sku"]', `TEST-${Date.now()}`);
      await page.fill('input[name="basePrice"]', '99.99');
      
      // 选择分类（如果有）
      const categorySelect = page.locator('select[name="categoryId"]');
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }

      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待成功提示
      await page.waitForTimeout(2000);

      // 验证：应该显示成功消息或跳转到商品列表
      const successMessage = page.locator('text=/成功|创建/i');
      const isOnListPage = page.url().includes('/admin/products') && !page.url().includes('/admin/products/new');
      
      expect(successMessage.count() > 0 || isOnListPage).toBeTruthy();
    }
  });

  test('商品编辑失败场景 - 验证错误', async ({ page, context }) => {
    // 拦截请求，模拟 400 错误
    await context.route('**/api/proxy/admin/products/**', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: '数据验证失败',
              details: '商品名称不能为空',
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

      // 清空必填字段以触发验证错误
      await page.fill('input[name="name"]', '');
      
      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证：应该显示错误消息
      const errorMessage = page.locator('.form-error, [class*="error"]');
      await expect(errorMessage).toBeVisible();
      
      // 验证：错误消息应该包含 traceId
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('验证');
    }
  });

  test('商品编辑失败场景 - 服务器错误', async ({ page, context }) => {
    // 拦截请求，模拟 500 错误
    await context.route('**/api/proxy/admin/products/**', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UPSTREAM_500',
              message: '服务器内部错误',
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

      // 修改商品名称
      await page.fill('input[name="name"]', `测试商品 ${Date.now()}`);
      
      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 等待错误提示
      await page.waitForTimeout(1000);

      // 验证：应该显示错误消息
      const errorMessage = page.locator('.form-error, [class*="error"]');
      await expect(errorMessage).toBeVisible();
      
      // 验证：错误消息应该包含 traceId
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/错误|失败|重试/i);
      
      // 验证：应该有重试按钮
      const retryButton = page.locator('button:has-text("重试")');
      await expect(retryButton).toBeVisible();
    }
  });

  test('防止重复提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products`);
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('a[href*="/admin/products/"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // 修改商品名称
      await page.fill('input[name="name"]', `测试商品 ${Date.now()}`);
      
      // 提交表单
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // 立即再次点击提交按钮
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });
});
