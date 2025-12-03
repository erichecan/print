/**
 * [2025-12-02 05:31:30] 线下订单 Sales 流程 E2E 测试（登录 + 列表 + 详情 + 未登录重定向）
 * [2025-01-28 21:30:00] 修复：使用相对路径，让 Playwright 自动使用配置中的 baseURL
 */
import { test, expect } from './fixtures/test-base';

// [2025-12-02 05:31:30] 线下订单 E2E 种子账号（与 backend/scripts/seed-offline-e2e.js 保持一致）
const SALES_TEST_USER = {
  email: process.env.E2E_OFFLINE_SALES_EMAIL || 'offline-tester@example.com',
  password: process.env.E2E_OFFLINE_SALES_PASSWORD || 'OfflineTest123!',
};

async function loginAsSalesTester(page) {
  // [2025-01-28 21:30:00] 使用相对路径，Playwright 会自动使用配置中的 baseURL
  await page.goto('/offline-orders/sales/login');

  // [2025-12-02 05:31:30] 填写登录表单并提交
  await page.getByLabel('邮箱', { exact: false }).fill(SALES_TEST_USER.email);
  await page.getByLabel('密码', { exact: false }).fill(SALES_TEST_USER.password);
  await page.getByRole('button', { name: /登录/ }).click();

  // [2025-12-02 05:31:30] 等待跳转到订单列表页
  await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 20000 });
}

test.describe('线下订单 Sales 流程', () => {
  test('未登录访问线下订单入口应引导到登录页或保持在入口页', async ({ page }) => {
    // [2025-01-28 21:30:00] 使用相对路径
    await page.goto('/');

    // [2025-12-02 05:31:30] 点击首页的 Submit Offline Order 按钮
    await page.getByRole('link', { name: /Submit Offline Order/ }).click();

    // [2025-12-02 05:31:30] 允许两种行为：直接展示 intake 页面或跳到登录页
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(
      url.endsWith('/offline-orders') || url.includes('/offline-orders/sales/login'),
    ).toBeTruthy();
  });

  test('Sales 用户可以登录并看到线下订单列表', async ({ page }) => {
    // [2025-12-02 05:31:30] 监听控制台错误，确保无 React / History 异常
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await loginAsSalesTester(page);

    // [2025-12-02 05:31:30] 页面标题和基本结构
    await expect(page.getByRole('heading', { name: /Sales 线下订单列表/ })).toBeVisible();

    // [2025-12-02 05:31:30] 种子订单（OFF-E2E-CASE-*）应出现在表格中
    await expect(page.getByText(/OFF-E2E-CASE-/, { exact: false })).toBeVisible();

    // [2025-12-02 05:31:30] 确保没有 React 压缩错误或 History SecurityError
    expect(
      consoleErrors.some((msg) => msg.includes('Minified React error #418') || msg.includes('Minified React error #423')),
    ).toBeFalsy();
    expect(
      consoleErrors.some((msg) => msg.includes('SecurityError') && msg.includes('replaceState')),
    ).toBeFalsy();
  });

  test('Sales 用户可以从列表进入订单详情并返回', async ({ page }) => {
    await loginAsSalesTester(page);

    // [2025-01-28 21:30:00] 点击第一个详情按钮
    const firstDetailButton = page.getByRole('button', { name: /详情/ }).first();
    await firstDetailButton.click();

    await page.waitForURL(/\/offline-orders\/sales\/orders\/.+/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // [2025-01-28 21:30:00] 详情页应展示订单编号和基本信息
    await expect(page.getByRole('heading', { name: /线下订单详情/ })).toBeVisible();
    await expect(page.getByText(/订单编号：/)).toBeVisible();

    // [2025-01-28 21:30:00] 验证新增的订单详情字段显示
    // 产品列表部分（如果存在）
    const productListSection = page.locator('text=产品列表').or(page.locator('text=Product List'));
    if (await productListSection.count() > 0) {
      await expect(productListSection.first()).toBeVisible();
    }

    // 印刷位置部分（如果存在）
    const printPositionsSection = page.locator('text=印刷位置').or(page.locator('text=Print Positions'));
    if (await printPositionsSection.count() > 0) {
      await expect(printPositionsSection.first()).toBeVisible();
    }

    // 价格信息部分（如果存在）
    const pricingSection = page.locator('text=价格信息').or(page.locator('text=Pricing Information'));
    if (await pricingSection.count() > 0) {
      await expect(pricingSection.first()).toBeVisible();
    }

    // [2025-01-28 21:30:00] 返回列表
    await page.getByRole('button', { name: /返回列表/ }).click();
    await page.waitForURL(/\/offline-orders\/sales\/orders$/, { timeout: 20000 });
  });

  test('未登录直接访问 Sales 订单列表会被重定向到登录页', async ({ page }) => {
    // [2025-01-28 21:30:00] 使用相对路径
    await page.goto('/offline-orders/sales/orders');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/offline-orders/sales/login');
  });

  test('未登录直接访问订单详情会被重定向到登录页', async ({ page }) => {
    // [2025-01-28 21:30:00] 使用相对路径
    await page.goto('/offline-orders/sales/orders/OFF-E2E-CASE-1');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/offline-orders/sales/login');
  });
});


