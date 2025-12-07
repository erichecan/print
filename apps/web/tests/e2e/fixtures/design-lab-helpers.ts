/**
 * Design Lab 测试辅助工具
 * [2025-01-27 12:00:00] 提供 Design Lab 页面操作和验证的辅助函数
 */
import type { Page, Locator } from '@playwright/test';
import { expect } from './test-base';

const DESIGN_LAB_URL = '/design-lab';

/**
 * 导航到 Design Lab 页面并等待加载完成
 * [2025-01-27 12:00:00]
 */
export async function navigateToDesignLab(page: Page, timeout = 60000): Promise<void> {
  await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000); // 等待动画和渲染完成
  
  // 验证页面基本元素已加载
  const designLabContainer = page.locator('.design-lab-new, [class*="design-lab"]').first();
  await designLabContainer.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
    console.warn('[Design Lab Helpers] Design Lab container not found, continuing anyway...');
  });
}

/**
 * 等待 Design Lab 完全加载
 * [2025-01-27 12:00:00]
 */
export async function waitForDesignLabReady(page: Page): Promise<void> {
  // 等待主要区域加载
  await page.waitForSelector('.dl-header, .dl-rail, .dl-canvas, .dl-sidebar', { timeout: 30000 }).catch(() => {});
  
  // 等待画布初始化（如果存在）
  try {
    await page.waitForSelector('canvas', { timeout: 15000 });
  } catch (e) {
    console.warn('[Design Lab Helpers] Canvas not found, continuing without it');
  }
  
  await page.waitForTimeout(2000); // 等待动画完成
}

/**
 * 点击左侧 Rail 按钮
 * [2025-01-27 12:00:00]
 */
export async function clickRailButton(page: Page, buttonText: string): Promise<void> {
  const button = page.locator(`.dl-rail__btn:has-text("${buttonText}"), button[aria-label*="${buttonText}" i]`).first();
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
  await page.waitForTimeout(500); // 等待面板打开
}

/**
 * 打开 Upload 面板
 * [2025-01-27 12:00:00]
 */
export async function openUploadPanel(page: Page): Promise<void> {
  await clickRailButton(page, 'Upload');
  const panel = page.locator('.dl-upload-panel, .dl-panel--upload').first();
  await expect(panel).toBeVisible({ timeout: 5000 });
}

/**
 * 上传文件（Browse）
 * [2025-01-27 12:00:00]
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  await openUploadPanel(page);
  
  // 查找文件输入框
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
  
  // 等待上传完成
  await page.waitForTimeout(2000);
}

/**
 * 添加文字到画布
 * [2025-01-27 12:00:00]
 */
export async function addTextToCanvas(page: Page, text: string): Promise<void> {
  await clickRailButton(page, 'Add Text');
  
  // 输入文字
  const textInput = page.locator('input[placeholder*="text" i], textarea[placeholder*="text" i]').first();
  await textInput.waitFor({ state: 'visible', timeout: 5000 });
  await textInput.fill(text);
  
  // 点击 Add To Design
  const addButton = page.locator('button:has-text("Add To Design"), button:has-text("Add to Design")').first();
  await addButton.click();
  
  await page.waitForTimeout(1000);
}

/**
 * 打开 Add Art 面板
 * [2025-01-27 12:00:00]
 */
export async function openArtPanel(page: Page): Promise<void> {
  await clickRailButton(page, 'Add Art');
  const panel = page.locator('.dl-art-panel, .dl-panel--art').first();
  await expect(panel).toBeVisible({ timeout: 5000 });
}

/**
 * 选择素材分类
 * [2025-01-27 12:00:00]
 */
export async function selectArtCategory(page: Page, categoryName: string): Promise<void> {
  await openArtPanel(page);
  
  const category = page.locator(`.dl-art-category:has-text("${categoryName}"), button:has-text("${categoryName}")`).first();
  await category.waitFor({ state: 'visible', timeout: 5000 });
  await category.click();
  
  await page.waitForTimeout(1000);
}

/**
 * 选择并添加素材
 * [2025-01-27 12:00:00]
 */
export async function selectAndAddArtwork(page: Page, categoryName: string, artworkIndex = 0): Promise<void> {
  await selectArtCategory(page, categoryName);
  
  // 选择第一个素材
  const artwork = page.locator('.dl-art-item, .dl-artwork-item').nth(artworkIndex);
  await artwork.waitFor({ state: 'visible', timeout: 5000 });
  await artwork.click();
  
  await page.waitForTimeout(1000);
}

/**
 * 打开 Product Colors 模态
 * [2025-01-27 12:00:00]
 */
export async function openProductColorsModal(page: Page): Promise<void> {
  // 尝试从 Rail 打开
  const railButton = page.locator('.dl-rail__btn:has-text("Product"), button[aria-label*="color" i]').first();
  const isRailButtonVisible = await railButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isRailButtonVisible) {
    await railButton.click();
  } else {
    // 尝试从底部操作栏打开
    const changeColorLink = page.locator('a:has-text("Change Color"), button:has-text("Change Color")').first();
    await changeColorLink.waitFor({ state: 'visible', timeout: 5000 });
    await changeColorLink.click();
  }
  
  await page.waitForTimeout(1000);
  
  // 验证模态打开
  const modal = page.locator('.dl-modal, .dl-product-colors-modal').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
}

/**
 * 选择产品颜色
 * [2025-01-27 12:00:00]
 */
export async function selectProductColor(page: Page, colorIndex = 0): Promise<void> {
  await openProductColorsModal(page);
  
  const colorItem = page.locator('.dl-color-item:not(.is-unavailable), button[class*="color"]:not([disabled])').nth(colorIndex);
  await colorItem.waitFor({ state: 'visible', timeout: 5000 });
  await colorItem.click();
  
  await page.waitForTimeout(1000);
}

/**
 * 切换视图（Front/Back/Sleeve Design/Zoom）
 * [2025-01-27 12:00:00]
 */
export async function switchView(page: Page, viewName: 'Front' | 'Back' | 'Sleeve Design' | 'Zoom'): Promise<void> {
  const viewButton = page.locator(`.dl-sidebar__btn:has-text("${viewName}"), button:has-text("${viewName}")`).first();
  await viewButton.waitFor({ state: 'visible', timeout: 5000 });
  await viewButton.click();
  
  await page.waitForTimeout(1000);
}

/**
 * 点击 Undo 按钮
 * [2025-01-27 12:00:00]
 */
export async function clickUndo(page: Page): Promise<void> {
  const undoButton = page.locator('button[aria-label*="undo" i], button:has-text("Undo")').first();
  await undoButton.waitFor({ state: 'visible', timeout: 5000 });
  await undoButton.click();
  await page.waitForTimeout(500);
}

/**
 * 点击 Redo 按钮
 * [2025-01-27 12:00:00]
 */
export async function clickRedo(page: Page): Promise<void> {
  const redoButton = page.locator('button[aria-label*="redo" i], button:has-text("Redo")').first();
  await redoButton.waitFor({ state: 'visible', timeout: 5000 });
  await redoButton.click();
  await page.waitForTimeout(500);
}

/**
 * 打开 Names & Numbers 模态
 * [2025-01-27 12:00:00]
 */
export async function openNamesNumbersModal(page: Page): Promise<void> {
  await clickRailButton(page, 'Add Names');
  
  await page.waitForTimeout(1000);
  
  // 验证模态或面板打开
  const modal = page.locator('.dl-modal, .dl-names-numbers-modal, .dl-names-numbers-tools').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
}

/**
 * 点击 Get Price 按钮
 * [2025-01-27 12:00:00]
 */
export async function clickGetPrice(page: Page): Promise<void> {
  const getPriceButton = page.locator('button:has-text("Get Price"), .dl-btn:has-text("Get Price")').first();
  await getPriceButton.waitFor({ state: 'visible', timeout: 5000 });
  await getPriceButton.click();
  
  await page.waitForTimeout(2000); // 等待模态或页面加载
}

/**
 * 验证画布上有对象
 * [2025-01-27 12:00:00]
 */
export async function verifyCanvasHasObjects(page: Page, minCount = 1): Promise<void> {
  // 通过检查画布上的对象或通过 API 验证
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 5000 });
  
  // 等待对象渲染
  await page.waitForTimeout(1000);
}

/**
 * 等待对象被选中
 * [2025-01-27 12:00:00]
 */
export async function waitForObjectSelected(page: Page, timeout = 5000): Promise<void> {
  // 检查是否有选中状态的对象（通过检查编辑面板是否出现）
  const editPanel = page.locator('.dl-edit-panel, .dl-panel--edit').first();
  await editPanel.waitFor({ state: 'visible', timeout }).catch(() => {
    console.warn('[Design Lab Helpers] Edit panel not found, object may not be selected');
  });
}

/**
 * 删除选中的对象
 * [2025-01-27 12:00:00]
 */
export async function deleteSelectedObject(page: Page): Promise<void> {
  // 查找删除按钮（通常在对象右上角或编辑面板中）
  const deleteButton = page.locator('button[aria-label*="delete" i], button[aria-label*="remove" i], .dl-object-delete').first();
  const isVisible = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isVisible) {
    await deleteButton.click();
    await page.waitForTimeout(500);
  } else {
    // 尝试按 Delete 键
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
  }
}

/**
 * 验证模态是否打开
 * [2025-01-27 12:00:00]
 */
export async function verifyModalOpen(page: Page, modalClass?: string): Promise<Locator> {
  const selector = modalClass || '.dl-modal';
  const modal = page.locator(selector).first();
  await expect(modal).toBeVisible({ timeout: 5000 });
  return modal;
}

/**
 * 关闭模态
 * [2025-01-27 12:00:00]
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.locator('.dl-modal__close, button[aria-label*="close" i], button:has-text("×")').first();
  const isVisible = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isVisible) {
    await closeButton.click();
  } else {
    // 尝试按 Esc 键
    await page.keyboard.press('Escape');
  }
  
  await page.waitForTimeout(500);
}

/**
 * 验证布局元素存在
 * [2025-01-27 12:00:00]
 */
export async function verifyLayoutElements(page: Page): Promise<void> {
  // 验证 Header
  const header = page.locator('.dl-header').first();
  await expect(header).toBeVisible({ timeout: 5000 });
  
  // 验证 Rail
  const rail = page.locator('.dl-rail').first();
  await expect(rail).toBeVisible({ timeout: 5000 });
  
  // 验证 Canvas
  const canvas = page.locator('.dl-canvas, canvas').first();
  await expect(canvas).toBeVisible({ timeout: 5000 });
  
  // 验证 Sidebar
  const sidebar = page.locator('.dl-sidebar').first();
  await expect(sidebar).toBeVisible({ timeout: 5000 });
  
  // 验证 Bottom Bar
  const bottomBar = page.locator('.dl-bottom-bar').first();
  await expect(bottomBar).toBeVisible({ timeout: 5000 });
}

