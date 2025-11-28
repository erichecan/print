/**
 * 筛选功能测试辅助函数
 * [2025-11-28 11:40:00] 提供筛选测试的通用辅助函数
 */
import { Page } from '@playwright/test';

export async function waitForFiltersLoaded(page: Page, timeout = 10000) {
  await page.waitForSelector('.filter-section', { timeout });
  await page.waitForSelector('.plp-new__sidebar', { timeout });
}

export async function getSidebarDimensions(page: Page) {
  const sidebar = page.locator('.plp-new__sidebar');
  return await sidebar.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      width: parseFloat(styles.width),
      height: parseFloat(styles.height),
      maxHeight: styles.maxHeight,
      overflowX: styles.overflowX,
      overflowY: styles.overflowY,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    };
  });
}

export async function toggleFilterSection(page: Page, index = 0) {
  const details = page.locator('details.filter-section').nth(index);
  const summary = details.locator('summary');
  
  const isOpenBefore = await details.evaluate((el) => el.hasAttribute('open'));
  await summary.click();
  await page.waitForTimeout(500); // 等待动画完成
  
  return {
    wasOpen: isOpenBefore,
    isOpenAfter: await details.evaluate((el) => el.hasAttribute('open')),
  };
}

export async function applyFilter(page: Page, filterName: string, filterValue: string) {
  const checkbox = page.locator(`input[name="${filterName}"][value="${filterValue}"]`);
  await checkbox.click();
  
  // 等待 URL 更新
  await page.waitForTimeout(1000);
  
  return {
    url: page.url(),
    isChecked: await checkbox.isChecked(),
  };
}

export async function getColorSwatchAlignment(page: Page, index = 0) {
  const swatch = page.locator('.color-swatch').nth(index);
  
  if ((await swatch.count()) === 0) {
    return null;
  }
  
  return await swatch.evaluate((el) => {
    const circle = el.querySelector('.color-swatch__circle');
    if (!circle) return null;
    
    const containerRect = el.getBoundingClientRect();
    const circleRect = circle.getBoundingClientRect();
    
    return {
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
      circleWidth: circleRect.width,
      circleHeight: circleRect.height,
      horizontalOffset: circleRect.left - containerRect.left,
      verticalOffset: circleRect.top - containerRect.top,
      isCentered: {
        horizontal: Math.abs(
          (containerRect.width - circleRect.width) / 2 - (circleRect.left - containerRect.left)
        ) < 2,
        vertical: Math.abs(
          (containerRect.height - circleRect.height) / 2 - (circleRect.top - containerRect.top)
        ) < 2,
      },
    };
  });
}

