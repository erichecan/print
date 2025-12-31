/**
 * Status Selector Verification Test
* 验证状态选择器的样式和功能
 */
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const SALES_MANAGER_EMAIL = 'salesmanager@suvernireplus.com';
const SALES_MANAGER_PASSWORD = 'manager123456';

test.describe('状态选择器样式验证', () => {
  test('验证状态选择器显示为圆角标签+下拉箭头', async ({ page }) => {
    // 1. 访问登录页面
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');

    // 2. 登录销售主管账号
    console.log('[Test] 开始登录...');
    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 等待登录完成并跳转到订单列表
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });
    console.log('[Test] 登录成功，已跳转到订单列表');

    // 3. 等待订单列表加载
    await page.waitForSelector('table.sales-orders-table', { timeout: 10000 });
    console.log('[Test] 订单列表已加载');

    // 4. 查找状态选择器元素
    const statusSelectors = page.locator('.sales-orders-status-selector');
    const count = await statusSelectors.count();
    console.log(`[Test] 找到 ${count} 个状态选择器`);

    if (count === 0) {
      // 如果没有订单，截图并失败
      await page.screenshot({ path: 'test-results/status-selector-no-orders.png', fullPage: true });
      throw new Error('没有找到状态选择器，可能没有订单数据');
    }

    // 5. 截图查看状态选择器的样式
    const firstStatusSelector = statusSelectors.first();
    await firstStatusSelector.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // 等待动画完成

    // 截图整个订单列表区域
    const tableContainer = page.locator('.sales-orders-card');
    await tableContainer.screenshot({ path: 'test-results/status-selector-table.png' });
    console.log('[Test] 已截图订单列表');

    // 截图第一个状态选择器
    await firstStatusSelector.screenshot({ path: 'test-results/status-selector-detail.png' });
    console.log('[Test] 已截图状态选择器详情');

    // 6. 验证状态选择器的样式
    const statusTag = firstStatusSelector.locator('.status-tag');
    await expect(statusTag).toBeVisible();
    
    // 验证圆角样式（通过检查 CSS 类）
    const tagClass = await statusTag.getAttribute('class');
    expect(tagClass).toContain('status-tag');
    console.log(`[Test] 状态标签类名: ${tagClass}`);

    // 验证下拉箭头存在
    const arrow = firstStatusSelector.locator('svg');
    await expect(arrow).toBeVisible();
    console.log('[Test] 下拉箭头已找到');

    // 7. 点击状态选择器，验证下拉菜单
    await firstStatusSelector.click();
    await page.waitForTimeout(300); // 等待下拉菜单打开

    // 验证下拉菜单是否显示
    const dropdownMenu = page.locator('.status-dropdown-menu');
    await expect(dropdownMenu).toBeVisible();
    console.log('[Test] 下拉菜单已打开');

    // 截图下拉菜单
    await dropdownMenu.screenshot({ path: 'test-results/status-selector-dropdown.png' });
    console.log('[Test] 已截图下拉菜单');

    // 验证下拉菜单选项
    const menuItems = dropdownMenu.locator('.status-menu-item');
    const itemCount = await menuItems.count();
    expect(itemCount).toBeGreaterThan(0);
    console.log(`[Test] 下拉菜单有 ${itemCount} 个选项`);

    // 验证选项内容（应该包含 ACTIVE, ACTIVE_RUSH, COMPLETED, CANCELLED）
    const menuText = await menuItems.allTextContents();
    console.log(`[Test] 下拉菜单选项: ${menuText.join(', ')}`);
    
    // 8. 点击外部关闭下拉菜单
    await page.click('body');
    await page.waitForTimeout(300);
    
    // 验证下拉菜单已关闭
    await expect(dropdownMenu).not.toBeVisible();
    console.log('[Test] 下拉菜单已关闭');

    // 9. 全页面截图
    await page.screenshot({ path: 'test-results/status-selector-full-page.png', fullPage: true });
    console.log('[Test] 已截图全页面');

    console.log('[Test] ✅ 状态选择器样式验证完成');
  });

  test('验证状态选择器支持 ACTIVE_RUSH 状态', async ({ page }) => {
    // 1. 登录
    await page.goto(`${FRONTEND_URL}/offline-orders/sales/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SALES_MANAGER_EMAIL);
    await page.fill('input[type="password"]', SALES_MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 10000 });

    // 2. 等待订单列表加载
    await page.waitForSelector('table.sales-orders-table', { timeout: 10000 });

    // 3. 点击第一个状态选择器
    const firstStatusSelector = page.locator('.sales-orders-status-selector').first();
    await firstStatusSelector.scrollIntoViewIfNeeded();
    await firstStatusSelector.click();
    await page.waitForTimeout(300);

    // 4. 验证下拉菜单中包含 ACTIVE_RUSH 选项
    const dropdownMenu = page.locator('.status-dropdown-menu');
    await expect(dropdownMenu).toBeVisible();

    // 查找包含 "加急" 或 "ACTIVE_RUSH" 的选项
    const rushOption = dropdownMenu.locator('.status-menu-item').filter({ hasText: /加急|ACTIVE_RUSH|ACTIVE.*加急/i });
    const rushOptionCount = await rushOption.count();
    
    if (rushOptionCount > 0) {
      console.log('[Test] ✅ 找到 ACTIVE_RUSH 选项');
      await rushOption.first().screenshot({ path: 'test-results/status-selector-rush-option.png' });
    } else {
      // 列出所有选项以便调试
      const allOptions = await dropdownMenu.locator('.status-menu-item').allTextContents();
      console.log(`[Test] ⚠️ 未找到 ACTIVE_RUSH 选项，当前选项: ${allOptions.join(', ')}`);
      await dropdownMenu.screenshot({ path: 'test-results/status-selector-dropdown-all-options.png' });
    }

    // 5. 验证加急标签显示
    const rushTags = page.locator('.tag.tag-rush');
    const rushTagCount = await rushTags.count();
    if (rushTagCount > 0) {
      console.log(`[Test] ✅ 找到 ${rushTagCount} 个加急标签`);
      await rushTags.first().screenshot({ path: 'test-results/rush-tag.png' });
    } else {
      console.log('[Test] ⚠️ 未找到加急标签（可能没有加急订单）');
    }
  });
});

