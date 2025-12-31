/**
 * 视觉对比辅助函数
* 提供视觉验证和截图对比的辅助函数
 */
import { Page } from '@playwright/test';

export async function takeElementScreenshot(page: Page, selector: string, name: string) {
  const element = page.locator(selector).first();
  if (await element.count() > 0) {
    await element.screenshot({ path: `test-results/screenshots/${name}.png` });
    return true;
  }
  return false;
}

export async function compareElementStyles(page: Page, selector: string, expectedStyles: Record<string, string>) {
  const element = page.locator(selector).first();
  
  if ((await element.count()) === 0) {
    return { found: false, matches: {} };
  }
  
  const actualStyles = await element.evaluate((el, props) => {
    const styles = window.getComputedStyle(el);
    const result: Record<string, string> = {};
    
    for (const prop of props) {
      result[prop] = styles.getPropertyValue(prop) || (styles as any)[prop];
    }
    
    return result;
  }, Object.keys(expectedStyles));
  
  const matches: Record<string, boolean> = {};
  for (const [prop, expected] of Object.entries(expectedStyles)) {
    matches[prop] = actualStyles[prop] === expected || 
                    actualStyles[prop]?.trim() === expected?.trim();
  }
  
  return {
    found: true,
    actual: actualStyles,
    expected: expectedStyles,
    matches,
    allMatch: Object.values(matches).every(v => v),
  };
}

