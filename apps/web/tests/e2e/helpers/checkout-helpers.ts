/**
* 结账页面测试辅助函数
 * 提供填写表单、捕获日志、检查状态等工具函数
 */
import type { Page, ConsoleMessage } from '@playwright/test';

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface ButtonState {
  disabled: boolean;
  title?: string | null;
  text?: string;
  disabledReason?: string;
}

export interface ConsoleLog {
  type: string;
  text: string;
  timestamp: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestBody?: any;
  responseBody?: any;
  timestamp: number;
}

/**
* 填写结账地址表单
 */
export async function fillCheckoutAddress(
  page: Page,
  address: ShippingAddress
): Promise<void> {
  await page.fill('#fullName', address.fullName);
  await page.fill('#email', address.email);
  await page.fill('#phone', address.phone);
  await page.fill('#addressLine1', address.addressLine1);
  await page.fill('#city', address.city);
  await page.fill('#province', address.province);
  await page.fill('#postalCode', address.postalCode);
  await page.selectOption('#country', address.country);
  
  // 等待 React 状态更新
  await page.waitForTimeout(1000);
}

/**
* 填写 Stripe 卡片信息
 */
export async function fillStripeCard(page: Page): Promise<void> {
  // 滚动到支付信息区域
  await page.locator('h2:has-text("Payment Information")').scrollIntoViewIfNeeded();
  
  // 等待 Stripe CardElement 加载
  const cardElement = page.locator('#card-element iframe, [data-testid="card-element"] iframe').first();
  try {
    await cardElement.waitFor({ state: 'attached', timeout: 10000 });
    console.log('[Helper] Stripe CardElement loaded');
  } catch (error) {
    console.warn('[Helper] Stripe CardElement not found:', error);
    throw error;
  }

  // 在 Stripe iframe 中填写测试卡信息
  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  try {
    await cardFrame.locator('[name="cardnumber"]').fill('4242424242424242');
    await cardFrame.locator('[name="exp-date"]').fill('12/34');
    await cardFrame.locator('[name="cvc"]').fill('123');
    await page.waitForTimeout(2000); // 等待卡片验证
    console.log('[Helper] Card information filled');
  } catch (error) {
    // 尝试备用选择器
    console.warn('[Helper] Primary card filling failed, trying alternative selectors');
    try {
      const altFrame = page.frameLocator('iframe').first();
      await altFrame.locator('[name="cardnumber"], [placeholder*="Card number"]').fill('4242424242424242');
      await altFrame.locator('[name="exp-date"], [placeholder*="MM / YY"]').fill('12/34');
      await altFrame.locator('[name="cvc"], [placeholder*="CVC"]').fill('123');
      await page.waitForTimeout(2000);
      console.log('[Helper] Card information filled using alternative selectors');
    } catch (altError) {
      console.error('[Helper] Failed to fill card information:', altError);
      throw altError;
    }
  }
}

/**
* 等待 Stripe 加载
 */
export async function waitForStripeLoad(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    // 等待 Stripe Elements 容器出现
    await page.waitForSelector('#card-element, [data-testid="card-element"]', { timeout });
    
    // 等待 iframe 加载
    const iframe = page.locator('iframe[name*="__privateStripeFrame"]').first();
    await iframe.waitFor({ state: 'attached', timeout });
    
    // 检查控制台日志中是否有 Stripe 加载成功的消息
    return true;
  } catch (error) {
    console.warn('[Helper] Stripe load timeout:', error);
    return false;
  }
}

/**
* 获取按钮状态和禁用原因
 */
export async function getButtonState(
  page: Page,
  buttonSelector: string
): Promise<ButtonState> {
  const button = page.locator(buttonSelector).first();
  
  const disabled = await button.isDisabled();
  const title = await button.getAttribute('title');
  const text = await button.textContent();
  
  // 从 title 属性中提取禁用原因
  let disabledReason: string | undefined;
  if (disabled && title) {
    disabledReason = title;
  }
  
  return {
    disabled,
    title,
    text: text?.trim() || undefined,
    disabledReason,
  };
}

/**
* 捕获控制台日志
 */
export function captureConsoleLogs(page: Page): ConsoleLog[] {
  const logs: ConsoleLog[] = [];
  
  page.on('console', (msg: ConsoleMessage) => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
    });
  });
  
  return logs;
}

/**
* 捕获网络请求
 */
export function captureNetworkRequests(page: Page): NetworkRequest[] {
  const requests: NetworkRequest[] = [];
  
  page.on('request', (request) => {
    const url = request.url();
    // 只捕获 API 请求
    if (url.includes('/api/')) {
      requests.push({
        url,
        method: request.method(),
        timestamp: Date.now(),
      });
    }
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const request = requests.find((r) => r.url === url && !r.status);
      if (request) {
        request.status = response.status();
        request.statusText = response.statusText();
        try {
          request.responseBody = await response.json().catch(() => null);
        } catch {
          request.responseBody = null;
        }
      }
    }
  });
  
  return requests;
}

/**
* 过滤调试日志
 */
export function filterDebugLogs(logs: ConsoleLog[], prefix: string = '[Checkout Debug]'): ConsoleLog[] {
  return logs.filter((log) => log.text.includes(prefix));
}

/**
* 等待运费选项加载并选择第一个
 */
export async function selectFirstShippingOption(page: Page, timeout: number = 20000): Promise<boolean> {
  try {
    await page.waitForSelector('.delivery-option input', { timeout });
    const shippingOptions = await page.locator('.delivery-option input').count();
    
    if (shippingOptions > 0) {
      await page.locator('.delivery-option input').first().check();
      await page.waitForTimeout(1000);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Helper] Shipping options not loaded:', error);
    return false;
  }
}

/**
* 获取默认测试地址（加拿大）
 */
export function getDefaultTestAddress(): ShippingAddress {
  return {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '4165550100',
    addressLine1: '123 Test St',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5H2M9',
    country: 'CA',
  };
}

/**
* 等待地址状态更新
 */
export async function waitForAddressReady(
  page: Page,
  logs: ConsoleLog[],
  timeout: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const addressLogs = logs.filter((log) =>
      log.text.includes('[Checkout Debug] addressReady:') &&
      log.text.includes('true')
    );
    
    if (addressLogs.length > 0) {
      return true;
    }
    
    await page.waitForTimeout(500);
  }
  
  return false;
}

/**
* 应用优惠券
 */
export async function applyCoupon(
  page: Page,
  couponCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 查找优惠券输入框
    const couponInput = page.locator(
      'input[type="text"][placeholder*="coupon"], input[type="text"][placeholder*="优惠券"], input[id*="coupon"]'
    ).first();
    
    await couponInput.fill(couponCode);
    await page.waitForTimeout(500);
    
    // 查找 Apply 按钮
    const applyButton = page.locator('button:has-text("Apply"), button:has-text("应用")').first();
    
    // 检查按钮是否启用
    const isDisabled = await applyButton.isDisabled();
    if (isDisabled) {
      const title = await applyButton.getAttribute('title');
      return {
        success: false,
        error: `Apply button is disabled. Title: ${title || 'No title'}`,
      };
    }
    
    // 点击 Apply 按钮
    await applyButton.click();
    await page.waitForTimeout(2000); // 等待 API 响应
    
    // 检查是否有错误消息
    const errorMessage = page.locator('.coupon-error-message').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      return {
        success: false,
        error: errorText || 'Unknown error',
      };
    }
    
    // 检查是否成功应用（显示已应用的优惠券信息）
    const appliedCoupon = page.locator('.coupon-applied, .coupon-info').first();
    const isApplied = await appliedCoupon.isVisible().catch(() => false);
    
    return {
      success: isApplied,
      error: isApplied ? undefined : 'Coupon not applied (no success indicator found)',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to apply coupon',
    };
  }
}

