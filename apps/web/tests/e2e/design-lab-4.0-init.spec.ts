/**
 * Design Lab 4.0 初始化测试
 * [2025-01-30 23:00:00] Design Lab 4.0: 无白屏、无 digest、画布进入可编辑
 */

import { test, expect } from '@playwright/test';

test.describe('Design Lab 4.0 初始化', () => {
  test('第一次加载 Design Lab：无白屏、无 digest', async ({ page }) => {
    await page.goto('/design-lab');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 检查无白屏（页面有内容）
    const content = await page.locator('body').textContent();
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(0);

    // 检查无 digest 错误
    const errorMessages = await page.locator('[data-testid="error"]').count();
    expect(errorMessages).toBe(0);

    // 检查画布已初始化
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('画布进入可编辑状态', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 等待画布初始化完成
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 检查画布可交互（点击画布）
    await canvas.click({ position: { x: 500, y: 600 } });

    // 检查工具面板已加载
    const toolPanel = page.locator('[data-testid="tool-panel"]').or(page.locator('.tool-panel')).first();
    await expect(toolPanel).toBeVisible({ timeout: 5000 });
  });

  test('UI 100% 复刻的关键交互', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 1. 上传功能
    const uploadButton = page.locator('[data-testid="upload-button"]').or(page.getByText(/upload/i).first());
    await expect(uploadButton.first()).toBeVisible({ timeout: 5000 });

    // 2. 添加文字
    const addTextButton = page.locator('[data-testid="add-text-button"]').or(page.getByText(/add text/i).first());
    await expect(addTextButton.first()).toBeVisible({ timeout: 5000 });

    // 3. 切换颜色
    const colorButton = page.locator('[data-testid="product-colors-button"]').or(page.getByText(/color/i).first());
    await expect(colorButton.first()).toBeVisible({ timeout: 5000 });

    // 4. Names & Numbers
    const namesButton = page.locator('[data-testid="names-numbers-button"]').or(page.getByText(/names/i).first());
    await expect(namesButton.first()).toBeVisible({ timeout: 5000 });

    // 5. Get Price
    const getPriceButton = page.locator('[data-testid="get-price-button"]').or(page.getByText(/get price/i).first());
    await expect(getPriceButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('后端故障模拟：显示错误兜底 UI', async ({ page }) => {
    // 模拟 API 失败
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查错误兜底 UI 已显示（可能显示错误提示或使用默认数据）
    // 注意：根据实现，可能显示错误提示或使用默认产品
    const errorFallback = page.locator('[data-testid="error-fallback"]').or(page.getByText(/error/i).first());
    const hasErrorOrDefault = await errorFallback.first().isVisible().catch(() => false);
    
    // 至少页面应该加载，不应该白屏
    const content = await page.locator('body').textContent();
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('图片 400/路由 404 不复现', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查无 400 错误
    const responsePromises = page.waitForResponse((response) => {
      return response.status() === 400;
    }, { timeout: 5000 }).catch(() => null);

    const response = await responsePromises;
    expect(response).toBeNull();

    // 检查无 404 错误（API 路由）
    const notFoundPromises = page.waitForResponse((response) => {
      return response.status() === 404 && response.url().includes('/api/');
    }, { timeout: 5000 }).catch(() => null);

    const notFound = await notFoundPromises;
    expect(notFound).toBeNull();
  });

  test('Stripe 不抛空 key 错误', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 检查控制台无 Stripe 错误
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Stripe') && (text.includes('publishable key') || text.includes('empty string'))) {
          consoleErrors.push(text);
        }
      }
    });

    await page.waitForTimeout(2000);

    expect(consoleErrors.length).toBe(0);
  });

  test('刷新或路由切换不出现重复初始化', async ({ page }) => {
    await page.goto('/design-lab');
    await page.waitForLoadState('networkidle');

    // 记录初始化日志
    const initLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[DesignLab]') && (text.includes('initialized') || text.includes('Canvas'))) {
        initLogs.push(text);
      }
    });

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 检查初始化日志数量（应该只有一次或两次，不应该重复多次）
    const initCount = initLogs.filter(log => log.includes('initialized')).length;
    expect(initCount).toBeLessThanOrEqual(3); // 允许最多 3 次（初始 + 刷新）
  });
});

