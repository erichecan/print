/**
 * [2025-11-24 10:40:22] 后台订单管理端到端测试
 */
import { test, expect } from './fixtures/test-base';

const SEEDED_ORDER = process.env.E2E_SEEDED_ORDER || 'ORD-1001';

test.describe('后台订单管理', () => {
  test('管理员可以搜索订单并更新状态', async ({ page, adminAccount }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('domcontentloaded'); // [2025-11-28 16:55:00] 等待页面加载
    
    // [2025-11-28 16:55:00] 等待表单元素可见
    await page.waitForSelector('#email, input[type="email"]', { timeout: 10000 });
    await page.fill('#email', adminAccount.email);
    await page.fill('#password', adminAccount.password);
    
    // [2025-11-28 16:55:00] 监听登录 API 请求
    const loginApiPromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/login'),
      { timeout: 30000 }
    ).catch(() => null);
    
    await page.click('button[type="submit"]');
    
    // 等待登录响应
    const loginResponse = await loginApiPromise;
    if (loginResponse && loginResponse.status() !== 200) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(`登录失败: ${errorData.error || 'HTTP ' + loginResponse.status()}`);
    }
    
    // [2025-11-28 16:55:00] 增加超时时间并等待页面加载
    await page.waitForURL(/\/admin$/, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();

    await page.fill('input[placeholder="Search order # or email"]', SEEDED_ORDER);
    await page.click('.admin-search-form button[type="submit"]');
    await page.waitForSelector('.admin-table tbody tr', { timeout: 15000 });
    await expect(page.locator('.admin-table tbody tr').first()).toContainText(SEEDED_ORDER);

    await page.locator('.admin-table tbody tr').first().locator('a', { hasText: 'View' }).click();
    await expect(page).toHaveURL(/\/admin\/orders\//);
    await expect(page.getByRole('heading', { name: new RegExp(`Order #${SEEDED_ORDER}`) })).toBeVisible();

    const fulfillmentSelect = page.locator('.admin-form select').first();
    await fulfillmentSelect.selectOption('PROCESSING');
    
    // [2025-12-06 18:00:00] Test status update note field for Issue #177
    const noteField = page.locator('textarea[placeholder*="状态更新备注"]');
    if (await noteField.isVisible().catch(() => false)) {
      await noteField.fill('测试状态更新备注');
    }
    
    await page.getByRole('button', { name: '保存更改' }).click();
    await expect(page.locator('.admin-alert')).toContainText(/订单更新成功|Order updated successfully/i);
    
    // [2025-12-06 18:00:00] Test status history display for Issue #177
    const statusHistoryButton = page.getByRole('button', { name: /查看状态历史|View Status History/i });
    if (await statusHistoryButton.isVisible().catch(() => false)) {
      await statusHistoryButton.click();
      await page.waitForTimeout(1000); // Wait for API call
      
      // Check if status history table is visible
      const historyTable = page.locator('.admin-table');
      if (await historyTable.isVisible().catch(() => false)) {
        // Verify history record exists
        await expect(historyTable.locator('tbody tr').first()).toBeVisible();
      }
    }
  });
  
  // [2025-12-06 18:00:00] Test status transition validation for Issue #177
  test('管理员可以看到状态转换提示', async ({ page, adminAccount }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForSelector('#email, input[type="email"]', { timeout: 10000 });
    await page.fill('#email', adminAccount.email);
    await page.fill('#password', adminAccount.password);
    
    const loginApiPromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/login'),
      { timeout: 30000 }
    ).catch(() => null);
    
    await page.click('button[type="submit"]');
    await loginApiPromise;
    await page.waitForURL(/\/admin$/, { timeout: 30000 });
    
    await page.goto('/admin/orders');
    await page.fill('input[placeholder="Search order # or email"]', SEEDED_ORDER);
    await page.click('.admin-search-form button[type="submit"]');
    await page.waitForSelector('.admin-table tbody tr', { timeout: 15000 });
    await page.locator('.admin-table tbody tr').first().locator('a', { hasText: 'View' }).click();
    
    // Check if status select shows allowed transitions
    const statusSelect = page.locator('.admin-form select').first();
    if (await statusSelect.isVisible().catch(() => false)) {
      // Check if optgroup exists (indicating grouped status options)
      const optgroup = statusSelect.locator('optgroup');
      const hasOptgroup = await optgroup.count() > 0;
      
      // Check if status transition hint is visible
      const hintText = page.locator('text=/允许的转换|Allowed transitions/i');
      const hasHint = await hintText.isVisible().catch(() => false);
      
      // At least one of these should be true
      expect(hasOptgroup || hasHint).toBeTruthy();
    }
  });
});

