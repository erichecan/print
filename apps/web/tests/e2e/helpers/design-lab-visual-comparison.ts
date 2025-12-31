/**
 * Design Lab 视觉对比工具
* 截图对比和视觉验证
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotComparisonResult {
  name: string;
  referencePath: string;
  actualPath: string;
  match: boolean;
  differences?: {
    layout?: string[];
    colors?: string[];
    spacing?: string[];
  };
}

/**
 * 参考截图路径映射
 */
const REFERENCE_SCREENSHOTS: Record<string, string> = {
  'index': 'docs/customink-analysis/screenshots/interactions/designlab-index.jpeg',
  'upload01': 'docs/customink-analysis/screenshots/interactions/designlab-upload01.jpeg',
  'upload02': 'docs/customink-analysis/screenshots/interactions/designlab-upload02.jpeg',
  'upload03': 'docs/customink-analysis/screenshots/interactions/designlab-upload03.jpeg',
  'addtext01': 'docs/customink-analysis/screenshots/interactions/designlab-addtext01.jpeg',
  'addtext02': 'docs/customink-analysis/screenshots/interactions/designlab-addtext02.jpeg',
  'addtext03': 'docs/customink-analysis/screenshots/interactions/designlab-addtext03.jpeg',
  'addtext04': 'docs/customink-analysis/screenshots/interactions/designlab-addtext04.jpeg',
  'addart01': 'docs/customink-analysis/screenshots/interactions/designlab-addart01.jpeg',
  'addart02': 'docs/customink-analysis/screenshots/interactions/designlab-addart02.jpeg',
  'addart03': 'docs/customink-analysis/screenshots/interactions/designlab-addart03.jpeg',
  'addart04': 'docs/customink-analysis/screenshots/interactions/designlab-addart04.jpeg',
  'colors01': 'docs/customink-analysis/screenshots/interactions/designlab-colors01.jpeg',
  'addnames01': 'docs/customink-analysis/screenshots/interactions/designlab-addnames01.jpeg',
  'addnames02': 'docs/customink-analysis/screenshots/interactions/designlab-addnames02.jpeg',
  'addnames03': 'docs/customink-analysis/screenshots/interactions/designlab-addnames03.jpeg',
  'addnames04': 'docs/customink-analysis/screenshots/interactions/designlab-addnames04.png',
  'addnames05': 'docs/customink-analysis/screenshots/interactions/designlab-addnames05.png',
  'addnames06': 'docs/customink-analysis/screenshots/interactions/designlab-addnames06.png',
};

/**
 * 获取参考截图路径
 */
export function getReferenceScreenshotPath(name: string): string | null {
  const relativePath = REFERENCE_SCREENSHOTS[name];
  if (!relativePath) {
    return null;
  }
  
  const absolutePath = path.resolve(process.cwd(), '../../', relativePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
}

/**
 * 截图当前页面或元素
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  selector?: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const dir = path.resolve(process.cwd(), 'test-results/screenshots/design-lab');
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filepath = path.join(dir, filename);
  
  if (selector) {
    const element = page.locator(selector).first();
    if (await element.count() > 0) {
      await element.screenshot({ path: filepath });
    } else {
      await page.screenshot({ path: filepath });
    }
  } else {
    await page.screenshot({ path: filepath, fullPage: false });
  }
  
  return filepath;
}

/**
 * 截图全页面布局（5 区域）
 */
export async function takeLayoutScreenshot(page: Page): Promise<{
  fullPage: string;
  header: string;
  rail: string;
  canvas: string;
  sidebar: string;
  bottomBar: string;
}> {
  // 等待页面完全加载
  await page.waitForSelector('.design-lab-new', { timeout: 10000 });
  await page.waitForTimeout(2000); // 等待动画和渲染完成
  
  const fullPage = await takeScreenshot(page, 'layout-full');
  
  // 截图各个区域
  const header = await takeScreenshot(page, 'layout-header', '.dl-header');
  const rail = await takeScreenshot(page, 'layout-rail', '.dl-rail');
  const canvas = await takeScreenshot(page, 'layout-canvas', '.dl-canvas');
  const sidebar = await takeScreenshot(page, 'layout-sidebar', '.dl-sidebar');
  const bottomBar = await takeScreenshot(page, 'layout-bottom-bar', '.dl-bottom-bar');
  
  return {
    fullPage,
    header,
    rail,
    canvas,
    sidebar,
    bottomBar,
  };
}

/**
 * 截图面板
 */
export async function takePanelScreenshot(
  page: Page,
  panelName: string,
  selector: string
): Promise<string> {
  // 等待面板显示
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.waitForTimeout(500); // 等待动画完成
  
  return await takeScreenshot(page, `panel-${panelName}`, selector);
}

/**
 * 验证布局区域尺寸
 */
export async function verifyLayoutDimensions(page: Page): Promise<{
  header: { height: number; match: boolean };
  rail: { width: number; match: boolean };
  sidebar: { width: number; match: boolean };
  bottomBar: { height: number; match: boolean };
}> {
  const header = page.locator('.dl-header').first();
  const rail = page.locator('.dl-rail').first();
  const sidebar = page.locator('.dl-sidebar').first();
  const bottomBar = page.locator('.dl-bottom-bar').first();
  
  const headerBox = await header.boundingBox();
  const railBox = await rail.boundingBox();
  const sidebarBox = await sidebar.boundingBox();
  const bottomBarBox = await bottomBar.boundingBox();
  
  return {
    header: {
      height: headerBox?.height || 0,
      match: Math.abs((headerBox?.height || 0) - 64) <= 2, // --dl-header-height: 64px
    },
    rail: {
      width: railBox?.width || 0,
      match: Math.abs((railBox?.width || 0) - 80) <= 2, // --dl-rail-width: 80px
    },
    sidebar: {
      width: sidebarBox?.width || 0,
      match: Math.abs((sidebarBox?.width || 0) - 120) <= 2, // --dl-sidebar-width: 120px
    },
    bottomBar: {
      height: bottomBarBox?.height || 0,
      match: Math.abs((bottomBarBox?.height || 0) - 80) <= 2, // --dl-bottom-bar-height: 80px
    },
  };
}

/**
 * 验证颜色值
 */
export async function verifyColors(
  page: Page,
  selectors: Array<{ selector: string; expectedColor: string; name: string }>
): Promise<Array<{ name: string; match: boolean; expected: string; actual: string }>> {
  const results = [];
  
  for (const { selector, expectedColor, name } of selectors) {
    const element = page.locator(selector).first();
    if (await element.count() > 0) {
      const actualColor = await element.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // 简单的颜色比较（可以改进为更精确的 RGB 比较）
      const match = actualColor === expectedColor || 
                    actualColor.replace(/\s/g, '') === expectedColor.replace(/\s/g, '');
      
      results.push({
        name,
        match,
        expected: expectedColor,
        actual: actualColor,
      });
    } else {
      results.push({
        name,
        match: false,
        expected: expectedColor,
        actual: 'element not found',
      });
    }
  }
  
  return results;
}

/**
 * 生成视觉对比报告
 */
export function generateVisualComparisonReport(
  results: ScreenshotComparisonResult[]
): {
  summary: {
    total: number;
    match: number;
    mismatch: number;
  };
  details: ScreenshotComparisonResult[];
  mismatches: ScreenshotComparisonResult[];
} {
  const summary = {
    total: results.length,
    match: results.filter(r => r.match).length,
    mismatch: results.filter(r => !r.match).length,
  };
  
  const mismatches = results.filter(r => !r.match);
  
  return {
    summary,
    details: results,
    mismatches,
  };
}

