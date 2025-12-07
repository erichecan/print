/**
 * Design Lab 元素验证工具
 * [2025-12-06 12:30:00] 基于 ELEMENT-INVENTORY.json 验证元素位置和样式
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ElementInfo {
  id: string;
  type: string;
  tagName: string;
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styles: {
    display?: string;
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontWeight?: string;
  };
  attributes?: {
    class?: string;
  };
}

export interface ElementVerificationResult {
  elementId: string;
  elementText: string;
  found: boolean;
  positionMatch: boolean;
  sizeMatch: boolean;
  colorMatch: boolean;
  fontSizeMatch: boolean;
  fontWeightMatch: boolean;
  differences: {
    position?: { expected: { x: number; y: number }; actual: { x: number; y: number }; diff: { x: number; y: number } };
    size?: { expected: { width: number; height: number }; actual: { width: number; height: number }; diff: { width: number; height: number } };
    color?: { expected: string; actual: string };
    fontSize?: { expected: string; actual: string };
    fontWeight?: { expected: string; actual: string };
  };
  allMatch: boolean;
}

/**
 * 读取 ELEMENT-INVENTORY.json
 */
export function loadElementInventory(): ElementInfo[] {
  const inventoryPath = path.resolve(process.cwd(), '../../docs/customink-analysis/ELEMENT-INVENTORY.json');
  
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`ELEMENT-INVENTORY.json not found at ${inventoryPath}`);
  }
  
  const content = fs.readFileSync(inventoryPath, 'utf-8');
  const data = JSON.parse(content);
  
  return data.elements || [];
}

/**
 * 查找页面中的元素（通过文本、类型、位置等）
 */
async function findElementOnPage(
  page: Page,
  elementInfo: ElementInfo
): Promise<{ found: boolean; boundingBox: { x: number; y: number; width: number; height: number } | null }> {
  try {
    // 尝试通过文本查找
    if (elementInfo.text) {
      const textLocator = page.locator(`text="${elementInfo.text}"`).first();
      if (await textLocator.count() > 0) {
        const box = await textLocator.boundingBox();
        if (box) {
          return { found: true, boundingBox: box };
        }
      }
    }
    
    // 尝试通过标签和文本组合查找
    if (elementInfo.tagName && elementInfo.text) {
      const tagLocator = page.locator(`${elementInfo.tagName}:has-text("${elementInfo.text}")`).first();
      if (await tagLocator.count() > 0) {
        const box = await tagLocator.boundingBox();
        if (box) {
          return { found: true, boundingBox: box };
        }
      }
    }
    
    // 尝试通过类名查找（如果有）
    if (elementInfo.attributes?.class) {
      const classNames = elementInfo.attributes.class.split(' ').filter(c => c && !c.startsWith('css-'));
      if (classNames.length > 0) {
        const classSelector = classNames.map(c => `.${c}`).join('');
        const classLocator = page.locator(classSelector).first();
        if (await classLocator.count() > 0) {
          const box = await classLocator.boundingBox();
          if (box) {
            return { found: true, boundingBox: box };
          }
        }
      }
    }
    
    return { found: false, boundingBox: null };
  } catch (error) {
    console.warn(`Error finding element ${elementInfo.id}:`, error);
    return { found: false, boundingBox: null };
  }
}

/**
 * 获取元素的实际样式
 */
async function getElementStyles(
  page: Page,
  elementInfo: ElementInfo
): Promise<{ color: string; fontSize: string; fontWeight: string; backgroundColor: string } | null> {
  try {
    // 尝试通过文本查找元素
    if (elementInfo.text) {
      const locator = page.locator(`text="${elementInfo.text}"`).first();
      if (await locator.count() > 0) {
        const styles = await locator.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            backgroundColor: computed.backgroundColor,
          };
        });
        return styles;
      }
    }
    return null;
  } catch (error) {
    console.warn(`Error getting styles for element ${elementInfo.id}:`, error);
    return null;
  }
}

/**
 * 解析颜色值（支持 rgb, rgba, hex）
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color) return null;
  
  // RGB/RGBA 格式: rgb(74, 74, 74) 或 rgba(0, 0, 0, 0.57)
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  
  // Hex 格式: #4A4A4A
  const hexMatch = color.match(/#([0-9A-Fa-f]{6})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }
  
  return null;
}

/**
 * 比较颜色值（允许 2px 误差）
 */
function compareColors(expected: string, actual: string): boolean {
  const expectedColor = parseColor(expected);
  const actualColor = parseColor(actual);
  
  if (!expectedColor || !actualColor) {
    return expected === actual; // 如果无法解析，直接比较字符串
  }
  
  // 允许每个颜色分量误差 < 2
  const diff = Math.abs(expectedColor.r - actualColor.r) +
               Math.abs(expectedColor.g - actualColor.g) +
               Math.abs(expectedColor.b - actualColor.b);
  
  return diff < 6; // 总共允许 6 的误差（每个分量 2）
}

/**
 * 验证单个元素
 */
export async function verifyElement(
  page: Page,
  elementInfo: ElementInfo,
  tolerance: number = 2
): Promise<ElementVerificationResult> {
  const result: ElementVerificationResult = {
    elementId: elementInfo.id,
    elementText: elementInfo.text,
    found: false,
    positionMatch: false,
    sizeMatch: false,
    colorMatch: false,
    fontSizeMatch: false,
    fontWeightMatch: false,
    differences: {},
    allMatch: false,
  };
  
  // 查找元素
  const { found, boundingBox } = await findElementOnPage(page, elementInfo);
  result.found = found;
  
  if (!found || !boundingBox) {
    return result;
  }
  
  // 验证位置
  const positionDiff = {
    x: Math.abs(boundingBox.x - elementInfo.position.x),
    y: Math.abs(boundingBox.y - elementInfo.position.y),
  };
  result.positionMatch = positionDiff.x <= tolerance && positionDiff.y <= tolerance;
  if (!result.positionMatch) {
    result.differences.position = {
      expected: { x: elementInfo.position.x, y: elementInfo.position.y },
      actual: { x: boundingBox.x, y: boundingBox.y },
      diff: positionDiff,
    };
  }
  
  // 验证尺寸
  const sizeDiff = {
    width: Math.abs(boundingBox.width - elementInfo.position.width),
    height: Math.abs(boundingBox.height - elementInfo.position.height),
  };
  result.sizeMatch = sizeDiff.width <= tolerance && sizeDiff.height <= tolerance;
  if (!result.sizeMatch) {
    result.differences.size = {
      expected: { width: elementInfo.position.width, height: elementInfo.position.height },
      actual: { width: boundingBox.width, height: boundingBox.height },
      diff: sizeDiff,
    };
  }
  
  // 验证样式
  const actualStyles = await getElementStyles(page, elementInfo);
  if (actualStyles && elementInfo.styles) {
    // 验证颜色
    if (elementInfo.styles.color) {
      result.colorMatch = compareColors(elementInfo.styles.color, actualStyles.color);
      if (!result.colorMatch) {
        result.differences.color = {
          expected: elementInfo.styles.color,
          actual: actualStyles.color,
        };
      }
    }
    
    // 验证字体大小（允许 1px 误差）
    if (elementInfo.styles.fontSize) {
      const expectedSize = parseFloat(elementInfo.styles.fontSize);
      const actualSize = parseFloat(actualStyles.fontSize);
      result.fontSizeMatch = Math.abs(expectedSize - actualSize) <= 1;
      if (!result.fontSizeMatch) {
        result.differences.fontSize = {
          expected: elementInfo.styles.fontSize,
          actual: actualStyles.fontSize,
        };
      }
    }
    
    // 验证字重
    if (elementInfo.styles.fontWeight) {
      result.fontWeightMatch = elementInfo.styles.fontWeight === actualStyles.fontWeight;
      if (!result.fontWeightMatch) {
        result.differences.fontWeight = {
          expected: elementInfo.styles.fontWeight,
          actual: actualStyles.fontWeight,
        };
      }
    }
  }
  
  // 计算总体匹配度
  result.allMatch = result.found && result.positionMatch && result.sizeMatch &&
    (elementInfo.styles?.color ? result.colorMatch : true) &&
    (elementInfo.styles?.fontSize ? result.fontSizeMatch : true) &&
    (elementInfo.styles?.fontWeight ? result.fontWeightMatch : true);
  
  return result;
}

/**
 * 验证所有关键元素
 */
export async function verifyAllElements(
  page: Page,
  elementIds?: string[]
): Promise<ElementVerificationResult[]> {
  const elements = loadElementInventory();
  const results: ElementVerificationResult[] = [];
  
  // 如果指定了元素 ID，只验证这些元素
  const elementsToVerify = elementIds
    ? elements.filter(e => elementIds.includes(e.id))
    : elements;
  
  for (const element of elementsToVerify) {
    const result = await verifyElement(page, element);
    results.push(result);
  }
  
  return results;
}

/**
 * 生成验证报告
 */
export function generateVerificationReport(
  results: ElementVerificationResult[]
): {
  summary: {
    total: number;
    found: number;
    allMatch: number;
    positionMatch: number;
    sizeMatch: number;
    colorMatch: number;
  };
  details: ElementVerificationResult[];
  issues: ElementVerificationResult[];
} {
  const summary = {
    total: results.length,
    found: results.filter(r => r.found).length,
    allMatch: results.filter(r => r.allMatch).length,
    positionMatch: results.filter(r => r.positionMatch).length,
    sizeMatch: results.filter(r => r.sizeMatch).length,
    colorMatch: results.filter(r => r.colorMatch).length,
  };
  
  const issues = results.filter(r => !r.allMatch);
  
  return {
    summary,
    details: results,
    issues,
  };
}

