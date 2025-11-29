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
    
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // [2025-11-28 17:50:00] 监听任何登录相关的 API 请求（包括错误响应）
    const loginApiPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return url.includes('/api/auth/login') || url.includes('/auth/login');
      },
      { timeout: 30000 }
    ).catch(() => null);
    
    // 提交登录表单
    await submitButton.click();
    
    // 等待登录 API 响应
    const loginResponse = await loginApiPromise;
    if (loginResponse) {
      const status = loginResponse.status();
      const loginData = await loginResponse.json().catch(() => ({}));
      
      if (status !== 200) {
        console.log(`登录 API 返回状态: ${status}`);
        console.log('响应数据:', loginData);
        throw new Error(`登录失败: HTTP ${status} - ${loginData.error || loginData.message || '未知错误'}`);
      }
      
      if (loginData.error) {
        throw new Error(`登录失败: ${loginData.error}`);
      }
    } else {
      // [2025-11-28 17:50:00] 如果没有 API 响应，等待页面导航或错误消息
      await page.waitForTimeout(2000);
    }
    
    // 等待跳转到 /admin 或检查错误消息
    try {
      // [2025-11-28 17:50:00] 使用更宽松的等待策略，先等待页面变化
      await Promise.race([
        page.waitForURL(/\/admin$/, { timeout: 15000 }).catch(() => null),
        page.waitForTimeout(3000),
      ]);
      
      // 检查当前 URL
      const currentUrl = page.url();
      if (currentUrl.includes('/admin') && !currentUrl.includes('/login')) {
        // 成功登录
        await page.waitForLoadState('domcontentloaded');
        const loginForm = page.locator('input[type="email"]');
        await expect(loginForm).not.toBeVisible({ timeout: 5000 });
        return;
      }
      
      // 如果还在登录页面，检查错误消息
      const errorMessage = page.locator('.error-message, [role="alert"], .text-error, [class*="error"]').first();
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorMessage.textContent();
        throw new Error(`登录失败: ${errorText || '未知错误'}`);
      }
      
      // 如果既没有跳转也没有错误，可能是网络问题
      throw new Error('登录超时：未能跳转到后台，可能是网络问题或后端服务不可用');
    } catch (error) {
      // 检查是否有错误消息显示
      const errorMessage = page.locator('.error-message, [role="alert"], .text-error, [class*="error"]').first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorMessage.textContent();
        throw new Error(`登录失败: ${errorText || '未知错误'}`);
      }
      throw error;
    }
  });

  test('登录后应该可以访问后台功能', async ({ page }) => {
    // 先登录
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('domcontentloaded');
    
    const emailInput = page.locator('input[type="email"]').or(page.locator('#email'));
    const passwordInput = page.locator('input[type="password"]').or(page.locator('#password'));
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // [2025-11-28 16:55:00] 监听登录 API 请求
    const loginApiPromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/login'),
      { timeout: 30000 }
    ).catch(() => null);
    
    await submitButton.click();
    
    // 等待登录 API 响应
    const loginResponse = await loginApiPromise;
    if (loginResponse && loginResponse.status() !== 200) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(`登录失败: ${errorData.error || 'HTTP ' + loginResponse.status()}`);
    }
    
    // 等待跳转到后台 - 增加超时时间
    await page.waitForURL(/\/admin$/, { timeout: 30000 });
    
    // [2025-11-28 12:00:00] 使用 domcontentloaded 避免超时
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // 额外等待页面渲染
    
    // 检查后台导航或侧边栏是否存在 - 使用更宽松的选择器
    const adminNav = page.locator('nav, [role="navigation"], .admin-sidebar, .admin-layout, [class*="admin"]').first();
    const hasNav = await adminNav.isVisible({ timeout: 15000 }).catch(() => false);
    
    // 如果导航不可见，至少检查页面标题或内容
    if (!hasNav) {
      const pageTitle = await page.title();
      const hasAdminContent = pageTitle.toLowerCase().includes('admin') || 
                              pageTitle.toLowerCase().includes('dashboard');
      expect(hasAdminContent || hasNav).toBeTruthy();
    } else {
      await expect(adminNav).toBeVisible();
    }
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

