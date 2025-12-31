/**
 * Design Lab 4.0 阶段1：布局结构验证测试
* 阶段1：验证4列3行布局结构，确保所有区域正确定位和尺寸
 */

import { test, expect } from '@playwright/test';

test.describe('Design Lab 4.0 - 阶段1：布局结构验证', () => {
  test.beforeEach(async ({ page }) => {
// 阶段1：导航到 Design Lab 页面
    await page.goto('/design-lab');
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('阶段1-1：验证所有区域存在且可见', async ({ page }) => {
// 阶段1：验证所有关键区域通过 data-testid 可被定位
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    await expect(page.locator('[data-testid="rail"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-bar"]')).toBeVisible();
  });

  test('阶段1-2：验证 Header 高度为 64px', async ({ page }) => {
// 阶段1：验证 Header 高度符合需求
    const header = page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('height', '64px');
  });

  test('阶段1-3：验证 Rail 宽度为 80px', async ({ page }) => {
// 阶段1：验证 Rail 宽度符合需求
    const rail = page.locator('[data-testid="rail"]');
    await expect(rail).toBeVisible();
    
    // 使用 evaluate 获取计算后的宽度（因为 CSS 变量可能被转换为实际像素值）
    const railWidth = await rail.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.width;
    });
    
    expect(railWidth).toBe('80px');
  });

  test('阶段1-4：验证 ToolPanel 宽度为 430px', async ({ page }) => {
// 阶段1：验证 ToolPanel 宽度符合需求
    const toolPanel = page.locator('[data-testid="tool-panel"]');
    await expect(toolPanel).toBeVisible();
    
    const toolPanelWidth = await toolPanel.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.width;
    });
    
    expect(toolPanelWidth).toBe('430px');
  });

  test('阶段1-5：验证 Sidebar 宽度为 120px', async ({ page }) => {
// 阶段1：验证 Sidebar 宽度符合需求
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
    
    const sidebarWidth = await sidebar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.width;
    });
    
    expect(sidebarWidth).toBe('120px');
  });

  test('阶段1-6：验证 BottomBar 高度为 80px', async ({ page }) => {
// 阶段1：验证 BottomBar 高度符合需求
    const bottomBar = page.locator('[data-testid="bottom-bar"]');
    await expect(bottomBar).toBeVisible();
    await expect(bottomBar).toHaveCSS('height', '80px');
  });

  test('阶段1-7：验证布局为 4 列结构', async ({ page }) => {
// 阶段1：验证 Main 区域内部是 4 列布局
    const main = page.locator('.dl-main');
    await expect(main).toBeVisible();
    
    // 验证 Main 容器使用 grid 布局
    const mainDisplay = await main.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.display;
    });
    
    expect(mainDisplay).toBe('grid');
    
    // 验证 grid-template-columns 包含 4 个列定义（通过检查子元素的 grid-column）
    const rail = page.locator('[data-testid="rail"]');
    const toolPanel = page.locator('[data-testid="tool-panel"]');
    const canvas = page.locator('[data-testid="canvas"]');
    const sidebar = page.locator('[data-testid="sidebar"]');
    
    const railColumn = await rail.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridColumnStart;
    });
    
    const toolPanelColumn = await toolPanel.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridColumnStart;
    });
    
    const canvasColumn = await canvas.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridColumnStart;
    });
    
    const sidebarColumn = await sidebar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridColumnStart;
    });
    
    // 验证每个区域在正确的列位置
    expect(railColumn).toBe('1');
    expect(toolPanelColumn).toBe('2');
    expect(canvasColumn).toBe('3');
    expect(sidebarColumn).toBe('4');
  });

  test('阶段1-8：验证布局为 3 行结构', async ({ page }) => {
// 阶段1：验证外层容器是 3 行布局
    const container = page.locator('.design-lab-new');
    await expect(container).toBeVisible();
    
    // 验证容器使用 grid 布局
    const containerDisplay = await container.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.display;
    });
    
    expect(containerDisplay).toBe('grid');
    
    // 验证 Header 在第1行
    const header = page.locator('[data-testid="header"]');
    const headerRow = await header.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridRowStart;
    });
    expect(headerRow).toBe('1');
    
    // 验证 Main 在第2行
    const main = page.locator('.dl-main');
    const mainRow = await main.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridRowStart;
    });
    expect(mainRow).toBe('2');
    
    // 验证 BottomBar 在第3行
    const bottomBar = page.locator('[data-testid="bottom-bar"]');
    const bottomBarRow = await bottomBar.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridRowStart;
    });
    expect(bottomBarRow).toBe('3');
  });

  test('阶段1-9：验证 Canvas 区域可自适应', async ({ page }) => {
// 阶段1：验证 Canvas 区域使用 1fr 自适应剩余空间
    const canvas = page.locator('[data-testid="canvas"]');
    await expect(canvas).toBeVisible();
    
    // Canvas 应该是 grid-column: 3，占据剩余空间
    const canvasColumn = await canvas.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.gridColumnStart;
    });
    expect(canvasColumn).toBe('3');
    
    // 验证 Canvas 有内容（至少包含 canvas 元素）
    const canvasElement = canvas.locator('canvas');
    await expect(canvasElement).toBeVisible({ timeout: 10000 });
  });
});
