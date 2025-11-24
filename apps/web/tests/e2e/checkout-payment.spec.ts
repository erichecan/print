/**
 * [2025-11-24 10:39:04] 结账与支付端到端测试
 */
import { test, expect } from './fixtures/test-base';
import { addProductToCart } from './utils/storefront';
import { login, fetchAdminOrders } from './utils/api';

const apiBase = `${(process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')}/api`;

test.describe('结账与支付', () => {
  test('访客下单并完成 Stripe 支付，后台可见订单', async ({
    page,
    stripe,
    api,
    adminAccount,
    guestEmail,
  }) => {
    await addProductToCart(page);
    await page.goto('/checkout');

    const shippingAddress = {
      fullName: 'E2E Guest',
      email: guestEmail,
      phone: '4165550100',
      addressLine1: '123 Queen St W',
      addressLine2: '',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H2M9',
      country: 'CA',
    };

    await page.fill('#fullName', shippingAddress.fullName);
    await page.fill('#email', shippingAddress.email);
    await page.fill('#phone', shippingAddress.phone);
    await page.fill('#addressLine1', shippingAddress.addressLine1);
    await page.fill('#city', shippingAddress.city);
    await page.fill('#province', shippingAddress.province);
    await page.fill('#postalCode', shippingAddress.postalCode);
    await page.selectOption('#country', shippingAddress.country);

    await page.waitForSelector('.delivery-option input', { timeout: 20000 });
    await page.locator('.delivery-option input').first().check();

    await page.locator('h2:has-text("Payment Information")').scrollIntoViewIfNeeded();
    await expect(page.locator('#card-element')).toBeVisible();

    // [2025-11-24 11:58:00] 复用浏览器 sessionId，确保后端识别同一个购物车
    const contextCookies = await page.context().cookies();
    const sessionCookie = contextCookies.find((cookie) => cookie.name === 'sessionId');
    const cookieHeader = sessionCookie ? `sessionId=${sessionCookie.value}` : '';
    if (!cookieHeader) {
      throw new Error('[2025-11-24 11:58:00] Missing sessionId cookie before checkout API call');
    }

    const sharedHeaders = {
      Cookie: cookieHeader,
    };

    const createIntentResponse = await page.request.post(`${apiBase}/checkout/create-payment-intent`, {
      data: {
        shippingAddress,
        shippingMethod: 'standard',
      },
      headers: sharedHeaders,
    });
    if (!createIntentResponse.ok()) {
      const body = await createIntentResponse.text();
      throw new Error(
        `[2025-11-24 11:50:00] create-payment-intent failed (${createIntentResponse.status()}): ${body || '<<empty>>'}`
      );
    }
    const { paymentIntentId } = await createIntentResponse.json();

    await stripe.paymentIntents.confirm(paymentIntentId, { payment_method: 'pm_card_visa' });

    const confirmResponse = await page.request.post(`${apiBase}/checkout/confirm`, {
      data: {
        paymentIntentId,
        shippingAddress,
        billingAddress: shippingAddress,
        shippingMethod: 'standard',
        email: shippingAddress.email,
      },
      headers: sharedHeaders,
    });
    if (!confirmResponse.ok()) {
      const body = await confirmResponse.text();
      throw new Error(
        `[2025-11-24 11:50:00] checkout/confirm failed (${confirmResponse.status()}): ${body || '<<empty>>'}`
      );
    }
    const orderPayload = await confirmResponse.json();
    const orderNumber: string = orderPayload.orderNumber;

    await page.goto(`/checkout/success?orderNumber=${orderNumber}&email=${encodeURIComponent(shippingAddress.email)}`);
    await expect(page.getByRole('heading', { name: 'Your order is confirmed!' })).toBeVisible();
    await expect(page.locator('.order-number-value')).toHaveText(orderNumber);

    await login(api, adminAccount.email, adminAccount.password);
    const adminOrders = await fetchAdminOrders(api, orderNumber);
    const foundOrder = (adminOrders?.data || []).find((order: any) => order.orderNumber === orderNumber);
    expect(foundOrder).toBeTruthy();
  });
});

