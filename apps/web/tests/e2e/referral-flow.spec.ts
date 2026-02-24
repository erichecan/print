/**
 * Referral 阶梯裂变推广 E2E 测试
 * 2025-02-20 创建
 */
import { test, expect } from '@playwright/test';

test.describe('Referral Flow', () => {
  test('should redirect /referral to dashboard when no ref param', async ({ page }) => {
    await page.goto('/referral');
    await page.waitForLoadState('networkidle');
    // 无 ref 时应重定向到 dashboard（未登录会再被重定向到 login）
    await expect(page).toHaveURL(/\/referral\/(dashboard|login)/);
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
    await expect(page.getByRole('link', { name: /推广中心|控制台/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /分享/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /钱包/ })).toBeVisible();
  });

  test('should show $1000 product on invite page', async ({ page }) => {
    await page.goto('/referral/invite?ref=test123');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/1000|1,000/)).toBeVisible();
  });
});
