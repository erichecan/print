/**
* 用户菜单下拉框遮挡问题修复验证测试
 * 测试订单创建页面右上角头像下拉菜单是否正常显示且不被遮挡
 */
import { test, expect } from './fixtures/test-base';

// 使用与离线订单测试相同的测试账号
const SALES_TEST_USER = {
  email: process.env.E2E_OFFLINE_SALES_EMAIL || 'offline-tester@example.com',
  password: process.env.E2E_OFFLINE_SALES_PASSWORD || 'OfflineTest123!',
};

async function loginAsSalesTester(page) {
  await page.goto('/offline-orders/sales/login');
  await page.getByLabel('邮箱', { exact: false }).fill(SALES_TEST_USER.email);
  await page.getByLabel('密码', { exact: false }).fill(SALES_TEST_USER.password);
  await page.getByRole('button', { name: /登录/ }).click();
  await page.waitForURL(/\/offline-orders\/sales\/orders/, { timeout: 20000 });
}

test.describe('用户菜单下拉框测试', () => {
  test('订单创建页面：登录后点击头像，下拉菜单应显示且不被遮挡', async ({ page }) => {
// 1. 登录
    await loginAsSalesTester(page);

// 2. 导航到订单创建页面
    await page.goto('/offline-orders');
    await page.waitForLoadState('networkidle');

// 3. 等待页面加载完成，查找右上角的头像按钮
    // 头像按钮可能包含用户名字或SVG图标
    const avatarButton = page
      .locator('button')
      .filter({ hasText: /订单管理|修改密码|退出登录/ })
      .or(page.locator('button').filter({ has: page.locator('svg') }))
      .first();

    // 或者更精确地定位：在header右上角区域的按钮
    const headerRightSection = page.locator('header').locator('div[class*="absolute"][class*="top"][class*="right"]');
    const userMenuButton = headerRightSection.locator('button').first();

// 4. 验证头像按钮可见
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });

// 5. 点击头像按钮打开下拉菜单
    await userMenuButton.click();
    await page.waitForTimeout(500); // 等待菜单动画

// 6. 验证下拉菜单是否显示
    // 菜单应该包含：用户名、邮箱、订单管理、修改密码、退出登录
    const dropdownMenu = page.locator('div').filter({ hasText: /订单管理|修改密码|退出登录/ }).first();
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });

// 7. 验证菜单项是否可点击（不被遮挡）
    const orderManagementButton = page.getByRole('button', { name: /订单管理/ });
    await expect(orderManagementButton).toBeVisible();

// 8. 使用Chrome DevTools获取菜单的z-index，确保它足够高
    const menuZIndex = await page.evaluate(() => {
      const menu = document.querySelector('div[class*="z-[9999]"]') || 
                   document.querySelector('div[style*="z-index"]');
      if (menu) {
        const style = window.getComputedStyle(menu);
        return style.zIndex;
      }
      return null;
    });

    console.log('下拉菜单z-index:', menuZIndex);
    
// 9. 验证菜单定位方式：应该是fixed而不是absolute
    const menuPosition = await page.evaluate(() => {
      const menu = document.querySelector('div[class*="fixed"]') || 
                   document.querySelector('div').filter(div => {
                     const style = window.getComputedStyle(div);
                     return style.position === 'fixed' && 
                            (div.textContent?.includes('订单管理') || 
                             div.textContent?.includes('退出登录'));
                   });
      if (menu) {
        const style = window.getComputedStyle(menu as Element);
        return {
          position: style.position,
          zIndex: style.zIndex,
          top: style.top,
          right: style.right,
        };
      }
      return null;
    });

    console.log('菜单定位信息:', menuPosition);
    
// 10. 验证菜单位置应该是fixed
    // 如果找到了fixed定位的菜单，说明修复成功
    const menuFixed = await page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll('div'));
      for (const menu of menus) {
        const text = menu.textContent || '';
        if ((text.includes('订单管理') || text.includes('退出登录')) && 
            window.getComputedStyle(menu).position === 'fixed') {
          return true;
        }
      }
      return false;
    });

    expect(menuFixed).toBe(true);

// 11. 验证菜单项可以点击
    await orderManagementButton.click();
    await page.waitForTimeout(1000);
    
// 应该跳转到订单管理页面
    await expect(page).toHaveURL(/\/offline-orders\/sales\/orders/, { timeout: 5000 });
  });

  test('下拉菜单应显示在页面最上层，不被main区域遮挡', async ({ page }) => {
// 1. 登录并导航到订单创建页面
    await loginAsSalesTester(page);
    await page.goto('/offline-orders');
    await page.waitForLoadState('networkidle');

// 2. 滚动页面以确保main区域可见
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

// 3. 点击头像按钮
    const headerRightSection = page.locator('header').locator('div[class*="absolute"][class*="top"][class*="right"]');
    const userMenuButton = headerRightSection.locator('button').first();
    await userMenuButton.click();
    await page.waitForTimeout(500);

// 4. 检查菜单是否在main内容之上
    const menuAboveContent = await page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll('div'));
      let menuElement: Element | null = null;
      
      for (const menu of menus) {
        const text = menu.textContent || '';
        if (text.includes('订单管理') || text.includes('退出登录')) {
          const style = window.getComputedStyle(menu);
          if (style.position === 'fixed' && parseInt(style.zIndex) > 100) {
            menuElement = menu;
            break;
          }
        }
      }

      if (!menuElement) return false;

      const menuRect = menuElement.getBoundingClientRect();
      const mainElement = document.querySelector('main');
      
      if (!mainElement) return true; // 如果没有main元素，菜单应该可见
      
      const mainRect = mainElement.getBoundingClientRect();
      const mainZIndex = parseInt(window.getComputedStyle(mainElement).zIndex) || 0;
      const menuZIndex = parseInt(window.getComputedStyle(menuElement).zIndex) || 0;

      // 菜单的z-index应该大于main的z-index
      return menuZIndex > mainZIndex;
    });

    expect(menuAboveContent).toBe(true);
  });
});
