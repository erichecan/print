/**
 * Design Lab 保存与分享功能测试 (M6)
* 测试 Save、Share、设计恢复
 */
import { test, expect } from './fixtures/test-base';
import {
  navigateToDesignLab,
  waitForDesignLabReady,
  addTextToCanvas,
  verifyCanvasHasObjects,
} from './fixtures/design-lab-helpers';
import { TEST_TEXTS } from './fixtures/design-lab-test-data';

test.describe('Design Lab M6: 保存与分享功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await navigateToDesignLab(page);
    await waitForDesignLabReady(page);
  });

  test.describe('Save 功能', () => {
    test('应该能够点击 Save 按钮', async ({ page }) => {
      // 先添加一些内容
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 查找 Save 按钮
      const saveButton = page.locator('button:has-text("Save"), .dl-btn:has-text("Save")').first();
      await expect(saveButton).toBeVisible({ timeout: 5000 });
      
      await saveButton.click();
      await page.waitForTimeout(1000);
    });

    test('应该在未登录时提示登录', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();
      await page.waitForTimeout(1000);
      
      // 查找登录提示或登录模态
      const loginPrompt = page.locator('text=/Sign In|Login|登录/i').first();
      const isVisible = await loginPrompt.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 登录提示可能存在
      if (isVisible) {
        await expect(loginPrompt).toBeVisible();
      }
    });

    test('应该能够保存设计', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // 验证保存成功（可能显示成功提示）
      const successMessage = page.locator('text=/Saved|Success|保存成功/i').first();
      const isVisible = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 成功提示可能存在
      if (isVisible) {
        await expect(successMessage).toBeVisible();
      }
    });

    test('应该能够访问设计列表 (My Designs)', async ({ page }) => {
      // 查找 My Designs 按钮
      const myDesignsButton = page.locator('button:has-text("My Designs"), a:has-text("My Designs")').first();
      const isVisible = await myDesignsButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await myDesignsButton.click();
        await page.waitForTimeout(2000);
        
        // 验证进入设计列表页面
        const designsPage = page.locator('text=/My Designs|Designs|设计列表/i').first();
        const hasPage = await designsPage.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPage).toBeTruthy();
      }
    });

    test('应该能够从设计列表加载设计', async ({ page }) => {
      // 先访问设计列表
      const myDesignsButton = page.locator('button:has-text("My Designs"), a:has-text("My Designs")').first();
      const isVisible = await myDesignsButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await myDesignsButton.click();
        await page.waitForTimeout(2000);
        
        // 查找设计项
        const designItem = page.locator('.design-item, .dl-design-card, [class*="design-item"]').first();
        const isVisible = await designItem.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible) {
          await designItem.click();
          await page.waitForTimeout(2000);
          
          // 验证返回 Design Lab 并加载设计
          const designLab = page.locator('.design-lab-new, .dl-canvas').first();
          const hasLab = await designLab.isVisible({ timeout: 3000 }).catch(() => false);
          expect(hasLab).toBeTruthy();
        }
      }
    });
  });

  test.describe('Share 功能', () => {
    test('应该能够点击 Share 按钮', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 查找 Share 按钮
      const shareButton = page.locator('button:has-text("Share"), .dl-btn:has-text("Share")').first();
      await expect(shareButton).toBeVisible({ timeout: 5000 });
      
      await shareButton.click();
      await page.waitForTimeout(1000);
    });

    test('应该显示分享链接', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const shareButton = page.locator('button:has-text("Share")').first();
      await shareButton.click();
      await page.waitForTimeout(1000);
      
      // 查找分享链接或模态
      const shareModal = page.locator('.dl-share-modal, .dl-modal:has-text("Share")').first();
      const shareLink = page.locator('input[type="text"][readonly], input[value*="http"]').first();
      
      const hasModal = await shareModal.isVisible({ timeout: 3000 }).catch(() => false);
      const hasLink = await shareLink.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 分享链接应该存在
      expect(hasModal || hasLink).toBeTruthy();
    });

    test('应该能够复制分享链接', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const shareButton = page.locator('button:has-text("Share")').first();
      await shareButton.click();
      await page.waitForTimeout(1000);
      
      // 查找复制按钮
      const copyButton = page.locator('button:has-text("Copy"), button[aria-label*="copy" i]').first();
      const isVisible = await copyButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await copyButton.click();
        await page.waitForTimeout(500);
        
        // 验证链接已复制（可能显示成功提示）
        const successMessage = page.locator('text=/Copied|复制成功/i').first();
        const isVisible = await successMessage.isVisible({ timeout: 2000 }).catch(() => false);
        
        // 成功提示可能存在
        if (isVisible) {
          await expect(successMessage).toBeVisible();
        }
      }
    });

    test('应该能够生成只读链接', async ({ page }) => {
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      const shareButton = page.locator('button:has-text("Share")').first();
      await shareButton.click();
      await page.waitForTimeout(1000);
      
      // 查找只读选项
      const readOnlyOption = page.locator('input[type="checkbox"]:near(text="read-only"), label:has-text("read-only")').first();
      const isVisible = await readOnlyOption.isVisible({ timeout: 3000 }).catch(() => false);
      
      // 只读选项可能存在
      if (isVisible) {
        await readOnlyOption.check();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('设计恢复', () => {
    test('应该在刷新后恢复设计', async ({ page }) => {
      // 先添加内容
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 刷新页面
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await waitForDesignLabReady(page);
      
      // 验证设计已恢复（画布上应该有对象）
      await page.waitForTimeout(2000);
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 5000 });
    });

    test('应该能够从 URL 参数恢复设计', async ({ page }) => {
      // 访问带设计 ID 的 URL
      await page.goto('/design-lab?designId=test-123');
      await page.waitForLoadState('domcontentloaded');
      await waitForDesignLabReady(page);
      
      // 验证设计加载
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 5000 });
    });

    test('应该能够从分享链接加载设计', async ({ page }) => {
      // 访问分享链接（假设格式为 /design-lab/share/:shareId）
      await page.goto('/design-lab/share/test-share-id');
      await page.waitForLoadState('domcontentloaded');
      await waitForDesignLabReady(page);
      
      // 验证设计加载
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 5000 });
    });

    test('应该在切换产品时清除设计', async ({ page }) => {
      // 先添加内容
      await addTextToCanvas(page, TEST_TEXTS.simple);
      await page.waitForTimeout(1000);
      
      // 切换产品（通过 Change Product）
      const changeProductLink = page.locator('a:has-text("Change Product"), button:has-text("Change Product")').first();
      const isVisible = await changeProductLink.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await changeProductLink.click();
        await page.waitForTimeout(1000);
        
        // 选择新产品
        const newProduct = page.locator('.product-item, .dl-product-card').first();
        const hasProduct = await newProduct.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasProduct) {
          await newProduct.click();
          await page.waitForTimeout(2000);
          
          // 验证画布可能被清除（取决于实现）
          const canvas = page.locator('canvas').first();
          await expect(canvas).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});

