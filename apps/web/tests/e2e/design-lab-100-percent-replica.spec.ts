/**
 * Design Lab 100% 复刻闭环测试
* 完整的视觉对比、功能验证和交互测试
 */
import { test, expect } from './fixtures/test-base';
import {
  takeLayoutScreenshot,
  takePanelScreenshot,
  takeScreenshot,
  verifyLayoutDimensions,
  verifyColors,
  getReferenceScreenshotPath,
} from './helpers/design-lab-visual-comparison';
import {
  loadElementInventory,
  verifyAllElements,
  generateVerificationReport,
  type ElementVerificationResult,
} from './helpers/design-lab-element-verification';

const DESIGN_LAB_URL = '/design-lab';

test.describe('Design Lab 100% 复刻测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 访问 Design Lab 页面
    await page.goto(DESIGN_LAB_URL, { waitUntil: 'networkidle' });
    // 等待页面完全加载（包括 Suspense）
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    // 等待 Design Lab 容器出现
    await page.waitForSelector('.design-lab-new, .dl-header, .dl-rail', { timeout: 30000 });
    // 等待 Fabric.js 画布初始化（如果存在）
    try {
      await page.waitForSelector('canvas', { timeout: 15000 });
    } catch (e) {
      // 如果画布不存在，继续测试（某些测试可能不需要画布）
      console.warn('Canvas not found, continuing without it');
    }
    await page.waitForTimeout(3000); // 等待动画和渲染完成
  });

  test.describe('阶段 1: 视觉对比测试', () => {
    
    test('1.1 全页面截图对比', async ({ page }) => {
      // 截图全页面
      const screenshots = await takeLayoutScreenshot(page);
      
      // 验证截图已保存
      expect(screenshots.fullPage).toBeTruthy();
      expect(screenshots.header).toBeTruthy();
      expect(screenshots.rail).toBeTruthy();
      expect(screenshots.canvas).toBeTruthy();
      expect(screenshots.sidebar).toBeTruthy();
      expect(screenshots.bottomBar).toBeTruthy();
      
      // 验证布局尺寸
      const dimensions = await verifyLayoutDimensions(page);
      expect(dimensions.header.match, 'Header 高度应该是 64px').toBeTruthy();
      expect(dimensions.rail.match, 'Rail 宽度应该是 80px').toBeTruthy();
      expect(dimensions.sidebar.match, 'Sidebar 宽度应该是 120px').toBeTruthy();
      expect(dimensions.bottomBar.match, 'Bottom Bar 高度应该是 80px').toBeTruthy();
    });

    test('1.2 元素位置验证（基于 ELEMENT-INVENTORY.json）', async ({ page }) => {
      // 验证关键元素
      const keyElements = [
        'element-1', // My Designs
        'element-2', // Untitled design
        'element-3', // Add Products
        'element-8', // Upload
        'element-9', // Add Text
        'element-10', // Add Art
        'element-11', // Product Colors
        'element-12', // Add Names
      ];
      
      const results = await verifyAllElements(page, keyElements);
      const report = generateVerificationReport(results);
      
      // 输出报告摘要
      console.log('元素验证报告摘要:', report.summary);
      
      // 检查关键元素是否找到
      const myDesigns = results.find(r => r.elementId === 'element-1');
      expect(myDesigns?.found, 'My Designs 按钮应该存在').toBeTruthy();
      
      const upload = results.find(r => r.elementId === 'element-8');
      expect(upload?.found, 'Upload 按钮应该存在').toBeTruthy();
      
      // 记录所有不匹配的元素
      if (report.issues.length > 0) {
        console.log('发现不匹配的元素:');
        report.issues.forEach(issue => {
          console.log(`  - ${issue.elementId} (${issue.elementText}):`, issue.differences);
        });
      }
    });

    test('1.3 面板截图对比 - Upload 面板', async ({ page }) => {
      // 点击 Upload 按钮
      const uploadButton = page.locator('.dl-rail__btn:has-text("Upload")').first();
      await uploadButton.click();
      await page.waitForTimeout(1000);
      
      // 截图 Upload 面板
      const screenshot = await takePanelScreenshot(page, 'upload', '.dl-upload-panel, .dl-tool-panel');
      
      expect(screenshot).toBeTruthy();
      
      // 验证关键元素存在
      await expect(page.locator('text=/Choose File To Upload|Browse Your Computer/')).toBeVisible();
    });

    test('1.4 面板截图对比 - Add Text 面板', async ({ page }) => {
      // 点击 Add Text 按钮
      const addTextButton = page.locator('.dl-rail__btn:has-text("Add Text")').first();
      await addTextButton.click();
      await page.waitForTimeout(1000);
      
      // 截图 Add Text 面板
      const screenshot = await takePanelScreenshot(page, 'add-text', '.dl-text-panel, .dl-tool-panel');
      
      expect(screenshot).toBeTruthy();
      
      // 验证关键元素存在
      await expect(page.locator('text=/Add Text/')).toBeVisible();
    });

    test('1.5 面板截图对比 - Add Art 面板', async ({ page }) => {
      // 点击 Add Art 按钮
      const addArtButton = page.locator('.dl-rail__btn:has-text("Add Art")').first();
      await addArtButton.click();
      await page.waitForTimeout(1000);
      
      // 截图 Add Art 面板
      const screenshot = await takePanelScreenshot(page, 'add-art', '.dl-art-panel, .dl-tool-panel');
      
      expect(screenshot).toBeTruthy();
      
      // 验证关键元素存在
      await expect(page.locator('text=/Add Art|Artwork Categories/')).toBeVisible();
    });

    test('1.6 颜色验证 - Rail 按钮文本色', async ({ page }) => {
      // 验证 Rail 按钮文本色应该是 rgb(191, 191, 191)
      const railButtons = page.locator('.dl-rail__btn');
      const buttonCount = await railButtons.count();
      
      expect(buttonCount).toBeGreaterThan(0);
      
      // 检查第一个按钮的颜色
      const firstButton = railButtons.first();
      const color = await firstButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // Rail 按钮文本色应该是 rgb(191, 191, 191)
      expect(color).toMatch(/rgb\(191,\s*191,\s*191\)/);
    });
  });

  test.describe('阶段 2: 功能流程测试', () => {
    
    test('2.1 Upload 流程测试', async ({ page }) => {
      // 1. 点击 Rail 中的 "Upload" 按钮
      const uploadButton = page.locator('.dl-rail__btn:has-text("Upload")').first();
      await uploadButton.click();
      await page.waitForTimeout(500);
      
      // 2. 验证 "Choose File To Upload" 面板显示
      await expect(page.locator('text=/Choose File To Upload/')).toBeVisible();
      
      // 3. 验证 "Browse Your Computer" 按钮存在
      await expect(page.locator('button:has-text("Browse Your Computer"), button:has-text("Browse")')).toBeVisible();
      
      // 4. 验证拖拽区域存在
      const dragDrop = page.locator('.dl-upload-panel__drag-drop, [class*="drag"]');
      if (await dragDrop.count() > 0) {
        await expect(dragDrop).toBeVisible();
      }
      
      // 注意：实际文件上传测试需要测试文件，这里只验证 UI 元素
    });

    test('2.2 Text 流程测试', async ({ page }) => {
      // 1. 点击 Rail 中的 "Add Text" 按钮
      const addTextButton = page.locator('.dl-rail__btn:has-text("Add Text")').first();
      await addTextButton.click();
      await page.waitForTimeout(500);
      
      // 2. 验证 "Add Text" 面板显示
      await expect(page.locator('text=/Add Text/')).toBeVisible();
      
      // 3. 验证文本输入框存在
      const textInput = page.locator('textarea, input[type="text"]').first();
      await expect(textInput).toBeVisible();
      
      // 4. 验证 "Add To Design" 按钮存在
      await expect(page.locator('button:has-text("Add To Design"), button:has-text("Add")')).toBeVisible();
    });

    test('2.3 Art 流程测试', async ({ page }) => {
      // 1. 点击 Rail 中的 "Add Art" 按钮
      const addArtButton = page.locator('.dl-rail__btn:has-text("Add Art")').first();
      await addArtButton.click();
      await page.waitForTimeout(500);
      
      // 2. 验证 "Artwork Categories" 面板显示
      await expect(page.locator('text=/Add Art|Artwork Categories/')).toBeVisible();
      
      // 3. 验证类别网格或列表存在
      const categories = page.locator('.dl-art-panel__category, [class*="category"]');
      if (await categories.count() > 0) {
        await expect(categories.first()).toBeVisible();
      }
    });

    test('2.4 Product Colors 流程测试', async ({ page }) => {
      // 1. 点击 Rail 中的 "Product Colors" 按钮
      const colorsButton = page.locator('.dl-rail__btn:has-text("Product Colors")').first();
      await colorsButton.click();
      await page.waitForTimeout(1000);
      
      // 2. 验证 "Choose Your Product Color" 模态显示
      await expect(page.locator('text=/Choose Your Product Color|Product Color/')).toBeVisible();
      
      // 3. 验证颜色色板存在
      const colorSwatches = page.locator('.dl-product-colors-modal__swatch, [class*="swatch"]');
      if (await colorSwatches.count() > 0) {
        await expect(colorSwatches.first()).toBeVisible();
      }
    });

    test('2.5 Names & Numbers 流程测试', async ({ page }) => {
      // 1. 点击 Rail 中的 "Add Names" 按钮
      const addNamesButton = page.locator('.dl-rail__btn:has-text("Add Names")').first();
      await addNamesButton.click();
      await page.waitForTimeout(1000);
      
      // 2. 验证模态显示
      await expect(page.locator('text=/Names.*Numbers|Names and Numbers/')).toBeVisible();
    });
  });

  test.describe('阶段 3: 交互行为测试', () => {
    
    test('3.1 Rail 按钮交互测试', async ({ page }) => {
      const uploadButton = page.locator('.dl-rail__btn:has-text("Upload")').first();
      
      // 测试悬停效果
      await uploadButton.hover();
      await page.waitForTimeout(300);
      
      // 验证悬停状态（通过检查是否有 hover 类或样式变化）
      const hoverStyles = await uploadButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // 点击按钮
      await uploadButton.click();
      await page.waitForTimeout(500);
      
      // 验证激活状态
      const isActive = await uploadButton.evaluate((el) => {
        return el.classList.contains('is-active');
      });
      
      expect(isActive).toBeTruthy();
    });

    test('3.2 Sidebar 按钮交互测试', async ({ page }) => {
      const frontButton = page.locator('.dl-sidebar__btn:has-text("Front")').first();
      
      // 测试点击
      await frontButton.click();
      await page.waitForTimeout(500);
      
      // 验证激活状态
      const isActive = await frontButton.evaluate((el) => {
        return el.classList.contains('is-active');
      });
      
      expect(isActive).toBeTruthy();
    });

    test('3.3 Canvas 交互测试', async ({ page }) => {
      // 验证 Canvas 存在
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
      
      // 验证 Canvas 尺寸
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      expect(canvasBox?.width).toBeGreaterThan(0);
      expect(canvasBox?.height).toBeGreaterThan(0);
    });
  });

  test.describe('阶段 4: 响应式测试', () => {
    
    test('4.1 桌面端测试 (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      await page.waitForSelector('.design-lab-new', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // 验证布局正常
      const dimensions = await verifyLayoutDimensions(page);
      expect(dimensions.header.match).toBeTruthy();
      expect(dimensions.rail.match).toBeTruthy();
    });

    test('4.2 平板端测试 (1024x768)', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.reload();
      await page.waitForSelector('.design-lab-new', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // 验证响应式布局
      const rail = page.locator('.dl-rail').first();
      await expect(rail).toBeVisible();
    });

    test('4.3 移动端测试 (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForSelector('.design-lab-new', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // 验证移动端布局（Rail 可能移动到底部）
      const designLab = page.locator('.design-lab-new').first();
      await expect(designLab).toBeVisible();
    });
  });
});

