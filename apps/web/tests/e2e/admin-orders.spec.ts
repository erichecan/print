/**
 * [2025-11-24 10:40:22] 后台订单管理端到端测试
 */
import { test, expect } from './fixtures/test-base';

const SEEDED_ORDER = process.env.E2E_SEEDED_ORDER || 'ORD-1001';

test.describe('后台订单管理', () => {
  test('管理员可以搜索订单并更新状态', async ({ page, adminAccount }) => {
    await page.goto('/admin/login');
    await page.fill('#email', adminAccount.email);
    await page.fill('#password', adminAccount.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin$/, { timeout: 20000 });

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
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator('.admin-alert')).toHaveText(/Order updated successfully/i);
  });
});

