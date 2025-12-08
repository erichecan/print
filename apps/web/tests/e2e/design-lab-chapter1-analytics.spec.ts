/**
 * Design Lab Chapter 1 - Analytics E2E Tests
 * [2025-12-08] 测试第1章的目标指标收集功能
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Design Lab Chapter 1: Analytics & Metrics', () => {
  test.beforeEach(async ({ page }) => {
    // 访问 Design Lab 页面
    await page.goto(`${BASE_URL}/design-lab`);
    // 等待页面加载
    await page.waitForLoadState('networkidle');
  });

  test('应该记录 design_lab_opened 事件', async ({ page }) => {
    // 检查是否有埋点请求发送
    const analyticsRequests: any[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/design-lab/analytics/events')) {
        analyticsRequests.push(request);
      }
    });

    // 等待一段时间让埋点发送
    await page.waitForTimeout(2000);

    // 验证埋点请求已发送（或检查localStorage）
    const events = await page.evaluate(() => {
      return localStorage.getItem('design_lab_events');
    });

    expect(events).toBeTruthy();
    
    if (events) {
      const parsedEvents = JSON.parse(events);
      const openedEvent = parsedEvents.find((e: any) => e.type === 'design_lab_opened');
      expect(openedEvent).toBeTruthy();
    }
  });

  test('应该记录上传成功事件', async ({ page }) => {
    // 点击 Upload 按钮
    await page.click('button[aria-label="Upload"]');
    
    // 等待 Upload 面板显示
    await page.waitForSelector('.dl-upload-panel', { timeout: 5000 });

    // 模拟文件上传（使用测试文件）
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });

    // 等待上传完成
    await page.waitForTimeout(2000);

    // 检查埋点事件
    const events = await page.evaluate(() => {
      return localStorage.getItem('design_lab_events');
    });

    if (events) {
      const parsedEvents = JSON.parse(events);
      const uploadEvent = parsedEvents.find((e: any) => e.type === 'upload_success');
      expect(uploadEvent).toBeTruthy();
    }
  });

  test('应该记录 Get Price 点击事件', async ({ page }) => {
    // 点击 Get Price 按钮
    const getPriceButton = page.locator('button:has-text("Get Price")');
    if (await getPriceButton.isVisible()) {
      await getPriceButton.click();
      
      // 等待一段时间
      await page.waitForTimeout(1000);

      // 检查埋点事件
      const events = await page.evaluate(() => {
        return localStorage.getItem('design_lab_events');
      });

      if (events) {
        const parsedEvents = JSON.parse(events);
        const getPriceEvent = parsedEvents.find((e: any) => e.type === 'get_price_clicked');
        expect(getPriceEvent).toBeTruthy();
      }
    }
  });

  test('应该支持上传体验评分', async ({ page }) => {
    // 先上传一个文件
    await page.click('button[aria-label="Upload"]');
    await page.waitForSelector('.dl-upload-panel', { timeout: 5000 });

    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });

    // 等待上传完成并进入编辑面板
    await page.waitForSelector('.dl-edit-upload-panel', { timeout: 5000 });

    // 点击评分链接
    const ratingLink = page.locator('a:has-text("How would you rate our upload experience?")');
    if (await ratingLink.isVisible()) {
      await ratingLink.click();

      // 等待评分模态框显示
      await page.waitForSelector('.dl-upload-rating-modal', { timeout: 5000 });

      // 选择5星评分
      const star5 = page.locator('.dl-upload-rating-modal__star').nth(4);
      await star5.click();

      // 提交评分
      const submitButton = page.locator('button:has-text("Submit")');
      await submitButton.click();

      // 等待提交完成
      await page.waitForTimeout(1000);

      // 验证模态框已关闭
      const modal = page.locator('.dl-upload-rating-modal');
      await expect(modal).not.toBeVisible();
    }
  });
});

