/**
 * Admin 登录功能测试
 * [2025-11-28 11:30:00] 测试 Admin 登录页面和重定向循环修复
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-hsbqzlnkxa-uc.a.run.app';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@suvernireplus.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';

test.describe('Admin 登录功能', () => {
  test('Admin 登录页面应该可以正常访问', async ({ page }) => {
    // 访问登录页面
    await page.goto(`${FRONTEND_URL}/admin/login`);
    
    // [2025-11-28 12:00:00] 使用 domcontentloaded 避免超时
    await page.waitForLoadState('domcontentloaded');
    
    // 验证没有重定向循环
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // 验证登录表单存在
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    const passwordInput = page.locator('input[type="password"]').or(page.locator('#password'));
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // 验证没有显示重定向消息
    const redirectMessage = page.locator('text=Redirecting to login').or(page.locator('text=Please login'));
    await expect(redirectMessage).not.toBeVisible();
  });

  test('访问 /admin 未登录时应重定向到登录页', async ({ page }) => {
    // 清除所有 cookies（确保未登录状态）
    await page.context().clearCookies();
    
    // 访问 /admin
    await page.goto(`${FRONTEND_URL}/admin`);
    
    // 应该重定向到登录页
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // 验证登录表单存在
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test('Admin 登录流程应该正常工作', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('domcontentloaded');
    
    // 填写登录表单
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    const passwordInput = page.locator('input[type="password"]').or(page.locator('#password'));
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // 监听导航事件
    const navigationPromise = page.waitForURL(/\/admin$/, { timeout: 15000 });
    
    // 提交登录表单
    await submitButton.click();
    
    // 等待跳转到 /admin
    await navigationPromise;
    
    // 验证成功登录并跳转到后台
    await expect(page).toHaveURL(/\/admin$/);
    
    // 验证后台页面加载（不应该显示登录表单）
    const loginForm = page.locator('input[type="email"]');
    await expect(loginForm).not.toBeVisible();
  });

  test('登录后应该可以访问后台功能', async ({ page }) => {
    // 先登录
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('domcontentloaded');
    
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    const passwordInput = page.locator('input[type="password"]').or(page.locator('#password'));
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await submitButton.click();
    
    // 等待跳转到后台
    await page.waitForURL(/\/admin$/, { timeout: 15000 });
    
    // [2025-11-28 12:00:00] 使用 domcontentloaded 避免超时
    await page.waitForLoadState('domcontentloaded');
    
    // 检查后台导航或侧边栏是否存在
    const adminNav = page.locator('nav').or(page.locator('[role="navigation"]')).or(page.locator('.admin-sidebar'));
    await expect(adminNav.first()).toBeVisible({ timeout: 10000 });
  });

  test('登录页面不应出现重定向循环', async ({ page }) => {
    // 清除 cookies
    await page.context().clearCookies();
    
    // 访问登录页面
    await page.goto(`${FRONTEND_URL}/admin/login`);
    
    // 监听导航事件，验证没有循环重定向
    const navigationEvents: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationEvents.push(frame.url());
      }
    });
    
    // [2025-11-28 12:00:00] 使用 domcontentloaded 避免超时
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // 额外等待，检查是否有后续重定向
    
    // 验证最终停留在登录页
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // 验证没有多次重定向到同一个页面
    const loginPageNavigations = navigationEvents.filter(url => url.includes('/admin/login'));
    expect(loginPageNavigations.length).toBeLessThanOrEqual(2); // 最多一次初始加载和一次重定向
  });
});

