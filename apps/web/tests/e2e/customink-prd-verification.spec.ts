/**
 * Custom Ink Design Lab PRD 3.0 验证测试
* 对照 PRD 3.0 文档验证 Custom Ink 的实际功能实现
 * 
 * 目标：
 * 1. 识别哪些功能需求描述与实际不符（错误描述）
 * 2. 识别哪些需求有但未实现（缺失功能）
 */
import { test, expect } from './fixtures/test-base';
import * as fs from 'fs';
import * as path from 'path';
import {
  VerificationResult,
  verifyLayout,
  verifyUploadPanel,
  verifyAddTextPanel,
  verifyAddArtPanel,
  verifyProductColors,
  verifyNamesAndNumbers,
  verifyCanvas,
  verifyPricingFlow,
  verifyBottomBar,
  verifyUndoRedo,
  generateComparisonReport,
} from './helpers/customink-prd-verifier';

const CUSTOMINK_URL = 'https://www.customink.com';
const DESIGN_LAB_URL = 'https://www.customink.com/ndx';
const OUTPUT_DIR = path.resolve(__dirname, '../../../../test-results/customink-prd-verification');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// 存储所有验证结果
const allVerificationResults: Record<string, VerificationResult[]> = {};

test.describe('Custom Ink Design Lab PRD 3.0 验证测试', () => {
  
  test.setTimeout(600000); // 10 分钟超时（因为需要测试很多功能）

  test.beforeEach(async ({ page }) => {
    // 设置 User-Agent 以避免被识别为爬虫
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
  });

  test('访问 Custom Ink Design Lab 并初始化', async ({ page }) => {
    console.log('[PRD Verification] 访问 Custom Ink Design Lab...');
    
    await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(10000); // 等待页面完全加载
    
    // 检查是否需要登录
    const signInButton = page.locator('text=/Sign In|Log In/i').first();
    const needsLogin = await signInButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (needsLogin) {
      console.log('[PRD Verification] 检测到需要登录，等待手动登录...');
      console.log('[PRD Verification] 请在浏览器中完成登录，然后按 Enter 继续...');
      // 等待用户手动登录（在 headed 模式下）
      await page.waitForTimeout(30000); // 给用户 30 秒时间登录
    }
    
    // 截图记录初始状态
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '00-initial-state.png'), 
      fullPage: true 
    });
    
    console.log('[PRD Verification] Design Lab 页面已加载');
  });

  test.describe('第3章：全局布局验证', () => {
    test('验证全局布局元素', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyLayout(page, SCREENSHOTS_DIR);
      allVerificationResults['layout'] = results;
      
      // 截图记录
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '01-layout-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] 布局验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第4.1章：Upload 功能验证', () => {
    test('验证 Upload 面板和功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyUploadPanel(page, SCREENSHOTS_DIR);
      allVerificationResults['upload'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '02-upload-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Upload 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第4.2章：Add Text 功能验证', () => {
    test('验证 Add Text 面板和功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyAddTextPanel(page, SCREENSHOTS_DIR);
      allVerificationResults['addText'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '03-add-text-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Add Text 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第4.3章：Add Art 功能验证', () => {
    test('验证 Add Art 面板和功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyAddArtPanel(page, SCREENSHOTS_DIR);
      allVerificationResults['addArt'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '04-add-art-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Add Art 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第4.4章：Product Colors 功能验证', () => {
    test('验证 Product Colors 功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyProductColors(page, SCREENSHOTS_DIR);
      allVerificationResults['productColors'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '05-product-colors-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Product Colors 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第4.5章：Add Names 功能验证', () => {
    test('验证 Names & Numbers 功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyNamesAndNumbers(page, SCREENSHOTS_DIR);
      allVerificationResults['namesAndNumbers'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '06-names-numbers-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Names & Numbers 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第5章：画布视图与对象编辑验证', () => {
    test('验证画布功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyCanvas(page, SCREENSHOTS_DIR);
      allVerificationResults['canvas'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '07-canvas-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] 画布功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第8章：报价与下单流程验证', () => {
    test('验证报价流程', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyPricingFlow(page, SCREENSHOTS_DIR);
      allVerificationResults['pricing'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '08-pricing-flow-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] 报价流程验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第9章：底部操作区验证', () => {
    test('验证底部操作区', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyBottomBar(page, SCREENSHOTS_DIR);
      allVerificationResults['bottomBar'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '09-bottom-bar-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] 底部操作区验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.describe('第10章：撤销与重做验证', () => {
    test('验证 Undo/Redo 功能', async ({ page }) => {
      await page.goto(DESIGN_LAB_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      
      const results = await verifyUndoRedo(page, SCREENSHOTS_DIR);
      allVerificationResults['undoRedo'] = results;
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '10-undo-redo-verification.png'), 
        fullPage: true 
      });
      
      console.log(`[PRD Verification] Undo/Redo 功能验证完成，共 ${results.length} 个检查点`);
    });
  });

  test.afterAll(async () => {
    // 生成最终对比报告
    console.log('[PRD Verification] 生成对比报告...');
    await generateComparisonReport(allVerificationResults, OUTPUT_DIR);
    console.log('[PRD Verification] 报告已生成到:', OUTPUT_DIR);
  });
});

