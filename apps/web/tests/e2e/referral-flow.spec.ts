/**
 * Referral 阶梯裂变推广 E2E 测试
 * 2025-02-20 创建
 */
import { test, expect } from '@playwright/test';

test.describe('Referral Flow', () => {
  test('should show referral home at /referral', async ({ page }) => {
    await page.goto('/referral');
    await page.waitForLoadState('networkidle');
    // 当前行为：/referral 为活动首页，不重定向
    await expect(page).toHaveURL(/\/referral\/?$/);
    await expect(page.getByRole('heading', { name: /邀请|一起赚/ })).toBeVisible();
  });

  test('should show invite page when visiting /referral/invite?ref=xxx', async ({ page }) => {
    await page.goto('/referral/invite?ref=test-promoter-123');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/referral\/invite/);
    await expect(page.getByText(/好友送你|专属体验/)).toBeVisible();
    await expect(page.getByRole('button', { name: /立即购买|Buy/i })).toBeVisible();
  });

  test('should redirect dashboard to login when unauthenticated', async ({ page }) => {
    await page.goto('/referral/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain('redirect=');
  });

  test('should redirect share to login when unauthenticated', async ({ page }) => {
    await page.goto('/referral/share');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect wallet to login when unauthenticated', async ({ page }) => {
    await page.goto('/referral/wallet');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show referral header and nav on referral pages', async ({ page }) => {
    await page.goto('/referral/invite?ref=test123');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /控制台|推广/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /分享/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /钱包/ }).first()).toBeVisible();
  });

  test('should show $1000 product on invite page', async ({ page }) => {
    await page.goto('/referral/invite?ref=test123');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/1000|1,000/).first()).toBeVisible();
  });

  test('should load shop page with product images without hostname error', async ({ page }) => {
    await page.goto('/referral/shop');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/referral\/shop/);
    // 商品列表应渲染，且无 next/image 未配置 hostname 报错
    await expect(page.getByRole('button', { name: /加入购物车|直接购买/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
