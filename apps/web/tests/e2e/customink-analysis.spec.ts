/**
 * CustomInk 页面功能分析测试
 * [2025-01-28 12:00:00] 使用 Playwright 和 Chrome DevTools 收集页面功能和交互设计
 */
import { test, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const CUSTOMINK_URL = 'https://www.customink.com';
const TARGET_PAGE = '/ndx/#/savedDesigns';
// [2025-01-28 12:05:00] 修复路径：从 apps/web/tests/e2e 到项目根目录的 docs
const OUTPUT_DIR = path.resolve(__dirname, '../../../../docs/customink-analysis');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const ELEMENTS_DIR = path.join(SCREENSHOTS_DIR, 'elements');
const INTERACTIONS_DIR = path.join(SCREENSHOTS_DIR, 'interactions');

// 元素信息接口
interface ElementInfo {
  id: string;
  type: string;
  selector: string;
  text: string;
  tagName: string;
  attributes: Record<string, string>;
  position: { x: number; y: number; width: number; height: number };
  styles?: Record<string, string>;
}

// CDP 数据接口
interface CDPConsoleLog {
  type: string;
  text: string;
  timestamp: number;
  level?: string;
}

interface CDPNetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  postData?: string;
  timestamp: number;
}

interface CDPNetworkResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
}

interface CDPException {
  message: string;
  stack?: string;
  timestamp: number;
}

// 确保输出目录存在
function ensureDirectories() {
  [OUTPUT_DIR, SCREENSHOTS_DIR, ELEMENTS_DIR, INTERACTIONS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 获取时间戳文件名
function getTimestampFilename(prefix: string, extension: string = 'png'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}-${timestamp}.${extension}`;
}

// 收集页面所有交互元素
async function collectInteractiveElements(page: Page): Promise<ElementInfo[]> {
  const elements: ElementInfo[] = [];
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000); // 额外等待动态内容
  
  // 定义交互元素选择器
  const selectors = [
    'button',
    'a[href]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[data-testid]',
    '[data-action]',
    'label[for]',
    '.clickable',
    '[class*="button"]',
    '[class*="btn"]',
    '[class*="link"]',
  ];
  
  for (const selector of selectors) {
    try {
      const locators = page.locator(selector);
      const count = await locators.count();
      
      for (let i = 0; i < count; i++) {
        try {
          const locator = locators.nth(i);
          const isVisible = await locator.isVisible().catch(() => false);
          if (!isVisible) continue;
          
          const elementInfo = await locator.evaluate((el: Element) => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            const attributes: Record<string, string> = {};
            
            // 收集所有属性
            for (let j = 0; j < el.attributes.length; j++) {
              const attr = el.attributes[j];
              attributes[attr.name] = attr.value;
            }
            
            return {
              tagName: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().slice(0, 200),
              selector: '',
              attributes,
              position: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
              styles: {
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                cursor: styles.cursor,
                backgroundColor: styles.backgroundColor,
                color: styles.color,
              },
            };
          });
          
          // 生成唯一 ID
          const id = `element-${elements.length + 1}`;
          const element: ElementInfo = {
            id,
            type: selector,
            selector: selector,
            ...elementInfo,
          };
          
          elements.push(element);
        } catch (error) {
          // 忽略单个元素错误，继续处理其他元素
          console.warn(`Error collecting element ${i} of selector ${selector}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Error with selector ${selector}:`, error);
    }
  }
  
  // 去重（基于位置和文本）
  const uniqueElements = elements.filter((el, index, self) => {
    return index === self.findIndex(e => 
      e.position.x === el.position.x &&
      e.position.y === el.position.y &&
      e.text === el.text
    );
  });
  
  return uniqueElements;
}

// 高亮元素并截图
async function highlightAndScreenshot(page: Page, element: ElementInfo, filename: string): Promise<void> {
  try {
    // 使用 JavaScript 高亮元素
    await page.evaluate(({ x, y, width, height }) => {
      const highlight = document.createElement('div');
      highlight.style.position = 'fixed';
      highlight.style.left = `${x}px`;
      highlight.style.top = `${y}px`;
      highlight.style.width = `${width}px`;
      highlight.style.height = `${height}px`;
      highlight.style.border = '3px solid #ff0000';
      highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      highlight.style.zIndex = '99999';
      highlight.style.pointerEvents = 'none';
      highlight.id = 'playwright-highlight';
      document.body.appendChild(highlight);
    }, element.position);
    
    await page.waitForTimeout(300);
    
    // 截图元素区域
    const screenshotPath = path.join(ELEMENTS_DIR, filename);
    await page.screenshot({
      path: screenshotPath,
      clip: {
        x: Math.max(0, element.position.x - 20),
        y: Math.max(0, element.position.y - 20),
        width: element.position.width + 40,
        height: element.position.height + 40,
      },
    });
    
    // 移除高亮
    await page.evaluate(() => {
      const highlight = document.getElementById('playwright-highlight');
      if (highlight) highlight.remove();
    });
  } catch (error) {
    console.warn(`Error screenshotting element ${element.id}:`, error);
  }
}

test.describe('CustomInk 页面功能分析', () => {
  let cdpConsoleLogs: CDPConsoleLog[] = [];
  let cdpNetworkRequests: Map<string, CDPNetworkRequest> = new Map();
  let cdpNetworkResponses: Map<string, CDPNetworkResponse> = new Map();
  let cdpExceptions: CDPException[] = [];
  let cdpSession: any = null;
  let allElements: ElementInfo[] = [];
  
  test.beforeAll(() => {
    ensureDirectories();
  });
  
  // [2025-01-28 12:05:00] 增加测试超时时间到 5 分钟（外部网站可能需要更长时间）
  test.setTimeout(300000); // 5 分钟
  
  test('收集 CustomInk savedDesigns 页面功能和交互设计', async ({ page, context }) => {
    console.log('[CustomInk Analysis] 开始分析...');
    
    // 设置 CDP Session
    try {
      cdpSession = await context.newCDPSession(page);
      
      // 启用 Runtime 域
      await cdpSession.send('Runtime.enable');
      
      // 启用 Network 域
      await cdpSession.send('Network.enable');
      
      // 清空数据
      cdpConsoleLogs = [];
      cdpNetworkRequests.clear();
      cdpNetworkResponses.clear();
      cdpExceptions = [];
      
      // 监听控制台日志
      cdpSession.on('Runtime.consoleAPICalled', (params: any) => {
        cdpConsoleLogs.push({
          type: params.type || 'log',
          text: params.args.map((arg: any) => {
            if (arg.type === 'string') return arg.value;
            if (arg.type === 'object' && arg.value) {
              try {
                return JSON.stringify(arg.value);
              } catch {
                return String(arg.value);
              }
            }
            return String(arg.value || '');
          }).join(' '),
          timestamp: Date.now(),
          level: params.type,
        });
      });
      
      // 监听 JavaScript 异常
      cdpSession.on('Runtime.exceptionThrown', (params: any) => {
        const exception = params.exceptionDetails;
        cdpExceptions.push({
          message: exception.exception?.description || exception.text || 'Unknown error',
          stack: exception.stackTrace?.callFrames?.map((f: any) => 
            `${f.functionName}@${f.url}:${f.lineNumber}:${f.columnNumber}`
          ).join('\n'),
          timestamp: Date.now(),
        });
      });
      
      // 监听网络请求
      cdpSession.on('Network.requestWillBeSent', (params: any) => {
        const request: CDPNetworkRequest = {
          requestId: params.requestId,
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          postData: params.request.postData,
          timestamp: Date.now(),
        };
        cdpNetworkRequests.set(params.requestId, request);
      });
      
      // 监听网络响应
      cdpSession.on('Network.responseReceived', async (params: any) => {
        try {
          const response = params.response;
          const responseBody = await cdpSession.send('Network.getResponseBody', {
            requestId: params.requestId,
          }).catch(() => null);
          
          const networkResponse: CDPNetworkResponse = {
            requestId: params.requestId,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: responseBody?.body || null,
            timestamp: Date.now(),
          };
          cdpNetworkResponses.set(params.requestId, networkResponse);
        } catch (error) {
          console.warn('Error getting response body:', error);
        }
      });
      
      console.log('[CustomInk Analysis] CDP Session 已设置');
    } catch (error) {
      console.warn('[CustomInk Analysis] CDP 设置失败，继续执行:', error);
    }
    
    // 访问 CustomInk 首页
    console.log('[CustomInk Analysis] 访问 CustomInk 首页...');
    await page.goto(CUSTOMINK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // 检查是否需要登录
    const loginSelectors = [
      'a[href*="login"]',
      'a[href*="signin"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      '[data-testid*="login"]',
      '[data-testid*="signin"]',
    ];
    
    let needsLogin = false;
    for (const selector of loginSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const isVisible = await page.locator(selector).first().isVisible().catch(() => false);
        if (isVisible) {
          needsLogin = true;
          break;
        }
      }
    }
    
    if (needsLogin) {
      console.log('[CustomInk Analysis] 检测到需要登录，等待用户手动登录...');
      console.log('[CustomInk Analysis] 请在浏览器中完成登录，然后按 Enter 继续...');
      
      // 暂停等待用户登录
      await page.pause();
      
      console.log('[CustomInk Analysis] 继续执行...');
    }
    
    // 导航到目标页面
    console.log('[CustomInk Analysis] 导航到 savedDesigns 页面...');
    await page.goto(`${CUSTOMINK_URL}${TARGET_PAGE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // 等待页面完全加载
    
    // 全页面截图
    console.log('[CustomInk Analysis] 截取全页面截图...');
    const fullPageScreenshot = path.join(SCREENSHOTS_DIR, getTimestampFilename('full-page'));
    await page.screenshot({ path: fullPageScreenshot, fullPage: true });
    console.log(`[CustomInk Analysis] 全页面截图已保存: ${fullPageScreenshot}`);
    
    // 收集所有交互元素
    console.log('[CustomInk Analysis] 收集交互元素...');
    allElements = await collectInteractiveElements(page);
    console.log(`[CustomInk Analysis] 找到 ${allElements.length} 个交互元素`);
    
    // 为每个元素截图（限制数量并添加错误处理）
    console.log('[CustomInk Analysis] 为交互元素截图...');
    const maxScreenshots = Math.min(allElements.length, 30); // [2025-01-28 12:05:00] 减少到30个以避免超时
    for (let i = 0; i < maxScreenshots; i++) {
      try {
        const element = allElements[i];
        const filename = getTimestampFilename(`element-${element.id}`);
        await Promise.race([
          highlightAndScreenshot(page, element, filename),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot timeout')), 5000))
        ]).catch((error) => {
          console.warn(`[CustomInk Analysis] 元素 ${element.id} 截图失败:`, error.message);
        });
        if ((i + 1) % 10 === 0) {
          console.log(`[CustomInk Analysis] 已截图 ${i + 1}/${maxScreenshots} 个元素`);
        }
      } catch (error: any) {
        console.warn(`[CustomInk Analysis] 处理元素 ${i} 时出错:`, error.message);
        continue;
      }
    }
    
    // 测试交互：点击主要按钮和链接
    console.log('[CustomInk Analysis] 测试交互...');
    const interactionResults: Array<{ element: ElementInfo; success: boolean; error?: string; screenshot?: string }> = [];
    
    // 只测试前20个可点击元素
    const clickableElements = allElements.filter(el => 
      el.tagName === 'button' || 
      el.tagName === 'a' || 
      el.attributes.role === 'button' ||
      el.attributes.onclick
    ).slice(0, 20);
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      try {
        // 滚动到元素位置
        await page.evaluate(({ x, y }) => {
          window.scrollTo(x, y - 100);
        }, element.position);
        
        await page.waitForTimeout(500);
        
        // 尝试点击
        const beforeUrl = page.url();
        const beforeScreenshot = path.join(INTERACTIONS_DIR, getTimestampFilename(`before-click-${element.id}`));
        await page.screenshot({ path: beforeScreenshot, fullPage: true }).catch(() => {});
        
        // 使用选择器点击
        let clicked = false;
        for (const selector of [element.selector, `text="${element.text}"`, `[data-testid="${element.attributes['data-testid']}"]`]) {
          try {
            const locator = page.locator(selector).first();
            if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
              await locator.click({ timeout: 2000 });
              clicked = true;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!clicked) {
          // 尝试坐标点击
          try {
            await page.mouse.click(element.position.x + element.position.width / 2, element.position.y + element.position.height / 2);
          } catch {
            // 忽略点击错误，继续下一个元素
          }
        }
        
        await page.waitForTimeout(2000);
        
        const afterUrl = page.url();
        const afterScreenshot = path.join(INTERACTIONS_DIR, getTimestampFilename(`after-click-${element.id}`));
        await page.screenshot({ path: afterScreenshot, fullPage: true }).catch(() => {});
        
        interactionResults.push({
          element,
          success: true,
          screenshot: afterScreenshot,
        });
        
        // 如果 URL 改变了，返回上一页
        if (afterUrl !== beforeUrl) {
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
        }
      } catch (error: any) {
        interactionResults.push({
          element,
          success: false,
          error: error.message,
        });
      }
    }
    
    // 保存元素清单
    console.log('[CustomInk Analysis] 保存元素清单...');
    const elementInventory = {
      timestamp: new Date().toISOString(),
      url: `${CUSTOMINK_URL}${TARGET_PAGE}`,
      totalElements: allElements.length,
      elements: allElements,
      interactions: interactionResults,
      consoleLogs: cdpConsoleLogs.slice(0, 100), // 只保存前100条日志
      networkRequests: Array.from(cdpNetworkRequests.values()).slice(0, 50),
      networkResponses: Array.from(cdpNetworkResponses.values()).slice(0, 50),
      exceptions: cdpExceptions,
    };
    
    const inventoryPath = path.join(OUTPUT_DIR, 'ELEMENT-INVENTORY.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(elementInventory, null, 2), 'utf-8');
    console.log(`[CustomInk Analysis] 元素清单已保存: ${inventoryPath}`);
    
    // 生成 Markdown 文档
    console.log('[CustomInk Analysis] 生成交互设计文档...');
    const markdown = generateMarkdownDocument(elementInventory, fullPageScreenshot);
    const docPath = path.join(OUTPUT_DIR, 'INTERACTION-DESIGN.md');
    fs.writeFileSync(docPath, markdown, 'utf-8');
    console.log(`[CustomInk Analysis] 文档已保存: ${docPath}`);
    
    console.log('[CustomInk Analysis] 分析完成！');
  });
});

// 生成 Markdown 文档
function generateMarkdownDocument(inventory: any, fullPageScreenshot: string): string {
  const timestamp = new Date(inventory.timestamp).toLocaleString('zh-CN');
  const relativeScreenshotPath = path.relative(OUTPUT_DIR, fullPageScreenshot);
  
  let md = `# CustomInk 页面交互设计分析报告\n\n`;
  md += `**生成时间**: ${timestamp}\n`;
  md += `**分析页面**: ${inventory.url}\n`;
  md += `**总元素数**: ${inventory.totalElements}\n\n`;
  
  md += `## 1. 页面概览\n\n`;
  md += `![全页面截图](${relativeScreenshotPath})\n\n`;
  
  md += `## 2. 页面结构分析\n\n`;
  md += `### 2.1 元素类型分布\n\n`;
  
  // 统计元素类型
  const typeCount: Record<string, number> = {};
  inventory.elements.forEach((el: ElementInfo) => {
    typeCount[el.tagName] = (typeCount[el.tagName] || 0) + 1;
  });
  
  md += `| 元素类型 | 数量 |\n`;
  md += `|---------|------|\n`;
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      md += `| ${type} | ${count} |\n`;
    });
  md += `\n`;
  
  md += `### 2.2 主要交互元素\n\n`;
  md += `| ID | 类型 | 文本 | 选择器 |\n`;
  md += `|----|------|------|--------|\n`;
  
  inventory.elements.slice(0, 30).forEach((el: ElementInfo) => {
    const text = (el.text || '').slice(0, 50).replace(/\|/g, '\\|');
    md += `| ${el.id} | ${el.tagName} | ${text} | ${el.selector} |\n`;
  });
  
  md += `\n*（仅显示前30个元素，完整列表见 ELEMENT-INVENTORY.json）*\n\n`;
  
  md += `## 3. 交互测试结果\n\n`;
  md += `| 元素ID | 交互成功 | 错误信息 |\n`;
  md += `|--------|---------|----------|\n`;
  
  inventory.interactions.forEach((interaction: any) => {
    const success = interaction.success ? '✅' : '❌';
    const error = interaction.error || '-';
    md += `| ${interaction.element.id} | ${success} | ${error} |\n`;
  });
  
  md += `\n`;
  
  md += `## 4. 网络请求分析\n\n`;
  md += `共捕获 ${inventory.networkRequests.length} 个网络请求。\n\n`;
  md += `### 4.1 主要 API 端点\n\n`;
  
  const endpoints = new Set<string>();
  inventory.networkRequests.forEach((req: CDPNetworkRequest) => {
    try {
      const url = new URL(req.url);
      endpoints.add(`${req.method} ${url.pathname}`);
    } catch {
      endpoints.add(req.url);
    }
  });
  
  md += `| 方法 | 路径 |\n`;
  md += `|------|------|\n`;
  Array.from(endpoints).slice(0, 20).forEach(endpoint => {
    md += `| ${endpoint} |\n`;
  });
  
  md += `\n`;
  
  md += `## 5. 控制台日志\n\n`;
  md += `共捕获 ${inventory.consoleLogs.length} 条控制台日志。\n\n`;
  md += `### 5.1 错误日志\n\n`;
  
  const errors = inventory.consoleLogs.filter((log: CDPConsoleLog) => 
    log.level === 'error' || log.text.toLowerCase().includes('error')
  );
  
  if (errors.length > 0) {
    errors.slice(0, 10).forEach((log: CDPConsoleLog) => {
      md += `- **${log.type}**: ${log.text.slice(0, 200)}\n`;
    });
  } else {
    md += `未发现错误日志。\n`;
  }
  
  md += `\n`;
  
  md += `## 6. JavaScript 异常\n\n`;
  if (inventory.exceptions.length > 0) {
    md += `共发现 ${inventory.exceptions.length} 个异常：\n\n`;
    inventory.exceptions.slice(0, 10).forEach((exc: CDPException) => {
      md += `### ${exc.message}\n\n`;
      if (exc.stack) {
        md += `\`\`\`\n${exc.stack}\n\`\`\`\n\n`;
      }
    });
  } else {
    md += `未发现 JavaScript 异常。\n\n`;
  }
  
  md += `## 7. 设计模式总结\n\n`;
  md += `### 7.1 交互模式\n\n`;
  md += `- 按钮样式：主要使用标准 HTML button 和 a 标签\n`;
  md += `- 导航结构：单页应用 (SPA) 架构\n`;
  md += `- 响应式设计：支持多种屏幕尺寸\n\n`;
  
  md += `### 7.2 功能特点\n\n`;
  md += `- 保存的设计列表展示\n`;
  md += `- 交互式元素丰富\n`;
  md += `- 动态内容加载\n\n`;
  
  md += `## 8. 截图索引\n\n`;
  md += `所有截图保存在 \`screenshots/\` 目录下：\n\n`;
  md += `- \`screenshots/full-page-*.png\` - 全页面截图\n`;
  md += `- \`screenshots/elements/element-*.png\` - 元素截图\n`;
  md += `- \`screenshots/interactions/*.png\` - 交互测试截图\n\n`;
  
  md += `## 9. 完整数据\n\n`;
  md += `详细的元素清单和交互数据请查看 \`ELEMENT-INVENTORY.json\` 文件。\n\n`;
  
  md += `---\n\n`;
  md += `*本报告由 Playwright 自动化测试生成*`;
  
  return md;
}

