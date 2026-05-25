import { test, expect } from '@playwright/test';

const PROD_URL = 'https://printngoplus.com';
const MANAGER = {
  email: 'salesmanager@suvernireplus.com',
  password: 'manager123456',
};

test('生产环境 offline orders 分类管理验证', async ({ page }) => {
  // 登录
  await page.goto(`${PROD_URL}/offline-orders/sales/login`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('邮箱', { exact: false }).fill(MANAGER.email);
  await page.getByLabel('密码', { exact: false }).fill(MANAGER.password);
  await page.getByRole('button', { name: /登录/ }).click();

  await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 20000 });
  console.log('✅ 登录成功，当前页面:', page.url());

  // 导航到 Config Management
  const configLink = page.getByRole('link', { name: /Config|配置|config/i });
  if (await configLink.isVisible()) {
    await configLink.click();
  } else {
    await page.goto(`${PROD_URL}/offline-orders/sales/config`);
  }

  await page.waitForLoadState('networkidle');
  console.log('📄 Config 页面:', page.url());

  // 点击 categoryManagement tab
  const catTab = page.getByRole('tab', { name: /category|分类/i });
  if (await catTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await catTab.click();
    await page.waitForLoadState('networkidle');
  }

  // 截图
  await page.screenshot({ path: '/tmp/offline-category-config.png', fullPage: true });

  // 检查是否有分类（不应显示"暂无分类"）
  const noCategory = page.getByText('暂无分类');
  const hasNoCategory = await noCategory.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasNoCategory) {
    console.log('❌ 仍然显示"暂无分类" — 分类数据为空或 API 仍返回错误');

    // 直接测试 API
    const apiResp = await page.request.get(
      'https://print-main-backend-5spbppmmza-uc.a.run.app/api/offline-orders/categories',
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('API 状态码:', apiResp.status());
    const body = await apiResp.text();
    console.log('API 响应:', body.slice(0, 300));
  } else {
    console.log('✅ 分类内容可见，不显示"暂无分类"');
    // 打印页面上可见的分类相关文字
    const content = await page.locator('[class*="category"], [class*="Category"]').allTextContents();
    console.log('分类内容:', content.slice(0, 5));
  }

  // 最终断言
  await expect(noCategory).not.toBeVisible({ timeout: 5000 });
});

test('直接测试分类 API 是否可访问', async ({ page }) => {
  // 先登录获取 token
  await page.goto(`${PROD_URL}/offline-orders/sales/login`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('邮箱', { exact: false }).fill(MANAGER.email);
  await page.getByLabel('密码', { exact: false }).fill(MANAGER.password);
  await page.getByRole('button', { name: /登录/ }).click();

  await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 20000 });

  // 从 localStorage 获取 token
  const token = await page.evaluate(() => {
    return (
      localStorage.getItem('offline_orders_token') ||
      localStorage.getItem('sales_token') ||
      localStorage.getItem('token') ||
      Object.entries(localStorage).find(([k]) => k.toLowerCase().includes('token'))?.[1] ||
      ''
    );
  });

  console.log('Token 前20字符:', token?.slice(0, 20) || '（未找到）');

  // 调用分类 API
  const resp = await page.request.get(
    'https://print-main-backend-5spbppmmza-uc.a.run.app/api/offline-orders/categories',
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );

  console.log('API 状态码:', resp.status());
  const body = await resp.json().catch(() => ({}));
  console.log('API 响应:', JSON.stringify(body).slice(0, 400));

  expect(resp.status()).not.toBe(500);
});
