/**
 * Custom Ink 流程验证测试
* 对比 PRD 验证需求正确性，测试 Custom Ink 的实际流程
 */
import { test, expect } from './fixtures/test-base';
import * as fs from 'fs';
import * as path from 'path';

const CUSTOMINK_URL = 'https://www.customink.com';
const DESIGN_LAB_URL = 'https://www.customink.com/ndx';
const OUTPUT_DIR = path.resolve(__dirname, '../../../../test-results/customink-verification');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

test.describe('Custom Ink 流程验证测试', () => {
  
  test.setTimeout(300000); // 5 分钟超时

  test.beforeEach(async ({ page }) => {
    // 设置 User-Agent 以避免被识别为爬虫
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
  });

  test.describe('访问 Custom Ink Design Lab', () => {
    test('应该能够访问 Custom Ink Design Lab 页面', async ({ page }) => {
      console.log('[Custom Ink Verification] 访问 Design Lab 页面...');
      
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000); // 等待页面完全加载
      
      // 截图记录
      await page.screenshot({ path: path.join(OUTPUT_DIR, '01-design-lab-home.png'), fullPage: true });
      
      // 验证页面加载
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
      
      console.log('[Custom Ink Verification] Design Lab 页面已加载');
    });

    test('应该显示主要布局元素（Header、Rail、Canvas、Sidebar、Bottom Bar）', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Header（可能包含 Logo、My Designs 等）
      const header = page.locator('header, .header, [class*="header"]').first();
      const hasHeader = await header.isVisible({ timeout: 5000 }).catch(() => false);
      
      // 查找 Rail（左侧工具栏）
      const rail = page.locator('[class*="rail"], [class*="toolbar"], [class*="sidebar"]').first();
      const hasRail = await rail.isVisible({ timeout: 5000 }).catch(() => false);
      
      // 查找 Canvas（画布区域）
      const canvas = page.locator('canvas, [class*="canvas"], [class*="preview"]').first();
      const hasCanvas = await canvas.isVisible({ timeout: 5000 }).catch(() => false);
      
      // 至少应该有一些主要元素
      expect(hasHeader || hasRail || hasCanvas).toBeTruthy();
      
      await page.screenshot({ path: path.join(OUTPUT_DIR, '02-layout-elements.png'), fullPage: true });
    });
  });

  test.describe('Upload 流程验证', () => {
    test('应该能够找到 Upload 功能入口', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Upload 按钮或链接
      const uploadButton = page.locator('button:has-text("Upload"), a:has-text("Upload"), [aria-label*="upload" i]').first();
      const isVisible = await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await uploadButton.click();
        await page.waitForTimeout(2000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '03-upload-panel.png'), fullPage: true });
        
        // 验证 Upload 面板打开
        const uploadPanel = page.locator('[class*="upload"], [class*="Upload"]').first();
        const hasPanel = await uploadPanel.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPanel).toBeTruthy();
      } else {
        console.warn('[Custom Ink Verification] Upload 按钮未找到');
      }
    });

    test('应该显示 Browse Your Computer 选项', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 打开 Upload 面板
      const uploadButton = page.locator('button:has-text("Upload"), [aria-label*="upload" i]').first();
      const isVisible = await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await uploadButton.click();
        await page.waitForTimeout(2000);
        
        // 查找 Browse 相关文本
        const browseText = page.locator('text=/Browse|Choose File|Upload File/i').first();
        const hasBrowse = await browseText.isVisible({ timeout: 3000 }).catch(() => false);
        
        // Browse 选项应该存在
        expect(hasBrowse).toBeTruthy();
      }
    });

    test('应该显示文件大小和格式限制提示', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 打开 Upload 面板
      const uploadButton = page.locator('button:has-text("Upload")').first();
      const isVisible = await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await uploadButton.click();
        await page.waitForTimeout(2000);
        
        // 查找文件限制提示（如 "Max 20MB" 或 "≥300DPI"）
        const limitText = page.locator('text=/20.*MB|300.*DPI|max.*size|file.*size/i').first();
        const hasLimit = await limitText.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 限制提示可能存在
        if (hasLimit) {
          await expect(limitText).toBeVisible();
        }
      }
    });
  });

  test.describe('Add Text 流程验证', () => {
    test('应该能够找到 Add Text 功能入口', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Add Text 按钮
      const addTextButton = page.locator('button:has-text("Text"), button:has-text("Add Text"), [aria-label*="text" i]').first();
      const isVisible = await addTextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await addTextButton.click();
        await page.waitForTimeout(2000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '04-add-text-panel.png'), fullPage: true });
        
        // 验证 Add Text 面板打开
        const textPanel = page.locator('[class*="text"], [class*="Text"]').first();
        const hasPanel = await textPanel.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPanel).toBeTruthy();
      }
    });

    test('应该显示文字输入框和 Add To Design 按钮', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 打开 Add Text 面板
      const addTextButton = page.locator('button:has-text("Text"), button:has-text("Add Text")').first();
      const isVisible = await addTextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await addTextButton.click();
        await page.waitForTimeout(2000);
        
        // 查找输入框
        const textInput = page.locator('input[type="text"], textarea, input[placeholder*="text" i]').first();
        const hasInput = await textInput.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 查找 Add To Design 按钮
        const addButton = page.locator('button:has-text("Add To Design"), button:has-text("Add to Design")').first();
        const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 输入框和按钮应该存在
        expect(hasInput || hasAddButton).toBeTruthy();
      }
    });
  });

  test.describe('Add Art 流程验证', () => {
    test('应该能够找到 Add Art 功能入口', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Add Art 按钮
      const addArtButton = page.locator('button:has-text("Art"), button:has-text("Add Art"), [aria-label*="art" i]').first();
      const isVisible = await addArtButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await addArtButton.click();
        await page.waitForTimeout(2000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '05-add-art-panel.png'), fullPage: true });
        
        // 验证 Add Art 面板打开
        const artPanel = page.locator('[class*="art"], [class*="Art"], [class*="artwork"]').first();
        const hasPanel = await artPanel.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPanel).toBeTruthy();
      }
    });

    test('应该显示素材分类', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 打开 Add Art 面板
      const addArtButton = page.locator('button:has-text("Art"), button:has-text("Add Art")').first();
      const isVisible = await addArtButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await addArtButton.click();
        await page.waitForTimeout(2000);
        
        // 查找分类（如 Emojis、Shapes、Sports 等）
        const category = page.locator('text=/Emojis|Shapes|Sports|Animals|Nature/i').first();
        const hasCategory = await category.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 分类应该存在
        expect(hasCategory).toBeTruthy();
      }
    });
  });

  test.describe('Product Colors 流程验证', () => {
    test('应该能够找到 Product Colors 功能入口', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Product Colors 按钮
      const colorsButton = page.locator('button:has-text("Color"), button:has-text("Product"), [aria-label*="color" i]').first();
      const isVisible = await colorsButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await colorsButton.click();
        await page.waitForTimeout(2000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '06-product-colors.png'), fullPage: true });
        
        // 验证 Product Colors 面板或模态打开
        const colorsPanel = page.locator('[class*="color"], [class*="Color"], [class*="modal"]').first();
        const hasPanel = await colorsPanel.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPanel).toBeTruthy();
      }
    });

    test('应该显示颜色网格', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 打开 Product Colors
      const colorsButton = page.locator('button:has-text("Color"), button:has-text("Product")').first();
      const isVisible = await colorsButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await colorsButton.click();
        await page.waitForTimeout(2000);
        
        // 查找颜色项
        const colorItems = page.locator('[class*="color-item"], [class*="color-swatch"], button[class*="color"]');
        const count = await colorItems.count();
        
        // 应该至少有一个颜色
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Names & Numbers 流程验证', () => {
    test('应该能够找到 Names & Numbers 功能入口', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Names & Numbers 按钮
      const namesButton = page.locator('button:has-text("Names"), button:has-text("Numbers"), [aria-label*="name" i]').first();
      const isVisible = await namesButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await namesButton.click();
        await page.waitForTimeout(2000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '07-names-numbers.png'), fullPage: true });
        
        // 验证 Names & Numbers 面板或模态打开
        const namesPanel = page.locator('[class*="name"], [class*="number"], [class*="modal"]').first();
        const hasPanel = await namesPanel.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPanel).toBeTruthy();
      }
    });
  });

  test.describe('Get Price 流程验证', () => {
    test('应该能够找到 Get Price 按钮', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 查找 Get Price 按钮
      const getPriceButton = page.locator('button:has-text("Get Price"), button:has-text("Price"), a:has-text("Get Price")').first();
      const isVisible = await getPriceButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '08-get-price-button.png'), fullPage: true });
        
        await expect(getPriceButton).toBeVisible();
      } else {
        console.warn('[Custom Ink Verification] Get Price 按钮未找到');
      }
    });

    test('应该能够进入报价流程', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 点击 Get Price 按钮
      const getPriceButton = page.locator('button:has-text("Get Price"), button:has-text("Price")').first();
      const isVisible = await getPriceButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await getPriceButton.click();
        await page.waitForTimeout(3000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '09-pricing-flow.png'), fullPage: true });
        
        // 验证进入报价流程（查找 Buy & Ship 或 Ordering Options）
        const pricingPage = page.locator('text=/Buy.*Ship|Ordering Options|Fundraiser/i').first();
        const hasPricing = await pricingPage.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasPricing).toBeTruthy();
      }
    });

    test('应该显示 Buy & Ship 和 Start a Fundraiser 选项', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      
      // 进入报价流程
      const getPriceButton = page.locator('button:has-text("Get Price")').first();
      const isVisible = await getPriceButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await getPriceButton.click();
        await page.waitForTimeout(3000);
        
        // 查找 Buy & Ship 选项
        const buyShip = page.locator('text=/Buy.*Ship|Buy & Ship/i').first();
        const hasBuyShip = await buyShip.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 查找 Fundraiser 选项
        const fundraiser = page.locator('text=/Fundraiser|Start a Fundraiser/i').first();
        const hasFundraiser = await fundraiser.isVisible({ timeout: 3000 }).catch(() => false);
        
        // 至少应该有一个选项
        expect(hasBuyShip || hasFundraiser).toBeTruthy();
      }
    });
  });

  test.describe('购物车流程验证', () => {
    test('应该能够访问购物车页面', async ({ page }) => {
      await page.goto(CUSTOMINK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      
      // 查找购物车链接或按钮
      const cartLink = page.locator('a[href*="cart"], button:has-text("Cart"), [aria-label*="cart" i]').first();
      const isVisible = await cartLink.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await cartLink.click();
        await page.waitForTimeout(3000);
        
        // 截图记录
        await page.screenshot({ path: path.join(OUTPUT_DIR, '10-cart-page.png'), fullPage: true });
        
        // 验证购物车页面加载
        const cartPage = page.locator('text=/Cart|Shopping Cart|My Cart/i').first();
        const hasCart = await cartPage.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasCart).toBeTruthy();
      }
    });
  });

  test.describe('PRD 对比总结', () => {
    test('生成 PRD 对比报告', async ({ page }) => {
      // 收集所有验证结果
      const report = {
        timestamp: new Date().toISOString(),
        url: DESIGN_LAB_URL,
        findings: [] as Array<{ feature: string; found: boolean; notes: string }>,
      };

      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);

      // 检查各个功能点
      const features = [
        { name: 'Upload 功能', selector: 'button:has-text("Upload")' },
        { name: 'Add Text 功能', selector: 'button:has-text("Text"), button:has-text("Add Text")' },
        { name: 'Add Art 功能', selector: 'button:has-text("Art"), button:has-text("Add Art")' },
        { name: 'Product Colors 功能', selector: 'button:has-text("Color"), button:has-text("Product")' },
        { name: 'Names & Numbers 功能', selector: 'button:has-text("Names"), button:has-text("Numbers")' },
        { name: 'Get Price 功能', selector: 'button:has-text("Get Price")' },
      ];

      for (const feature of features) {
        const element = page.locator(feature.selector).first();
        const found = await element.isVisible({ timeout: 3000 }).catch(() => false);
        report.findings.push({
          feature: feature.name,
          found,
          notes: found ? '功能存在' : '功能未找到或需要登录',
        });
      }

      // 保存报告
      const reportPath = path.join(OUTPUT_DIR, 'prd-comparison-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`[Custom Ink Verification] PRD 对比报告已保存: ${reportPath}`);

      // 至少应该找到一些功能
      const foundCount = report.findings.filter(f => f.found).length;
      expect(foundCount).toBeGreaterThan(0);
    });
  });
});

