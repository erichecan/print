/**
* Playwright 测试辅助 API：封装常用的后端调用
 */
import type { APIRequestContext } from '@playwright/test';

type ProductResponse = {
  id: string;
  name: string;
  slug: string;
  variants: Array<{
    id: string;
    color?: string | null;
    size?: string | null;
    stockQuantity: number;
  }>;
};

type CouponResponse = {
  coupons: Array<{ code: string }>;
};

type CheckoutIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
};

export async function login(api: APIRequestContext, email: string, password: string) {
  const response = await api.post('/auth/login', {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`登录失败：${response.status()} ${await response.text()}`);
  }
}

export async function fetchProduct(api: APIRequestContext, slug: string): Promise<ProductResponse> {
  const response = await api.get(`/products/${slug}`);
  if (!response.ok()) {
    throw new Error(`获取产品 ${slug} 失败：${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as ProductResponse;
}

export async function fetchVariantId(api: APIRequestContext, slug: string): Promise<string> {
  const product = await fetchProduct(api, slug);
  const variant = product.variants.find((v) => v.stockQuantity > 0);
  if (!variant) {
    throw new Error(`产品 ${slug} 无可用库存变体`);
  }
  return variant.id;
}

export async function fetchActiveCoupon(api: APIRequestContext, code: string): Promise<boolean> {
  const response = await api.get('/coupons');
  if (!response.ok()) {
    throw new Error(`获取优惠券列表失败：${response.status()} ${await response.text()}`);
  }
  const payload = (await response.json()) as CouponResponse;
  return payload.coupons.some((coupon) => coupon.code.toUpperCase() === code.toUpperCase());
}

export async function prepareCheckout(
  api: APIRequestContext,
  payload: Record<string, unknown>
): Promise<CheckoutIntentResponse> {
  const response = await api.post('/checkout/create-payment-intent', {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(`创建支付意图失败：${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as CheckoutIntentResponse;
}

export async function confirmOrder(api: APIRequestContext, payload: Record<string, unknown>) {
  const response = await api.post('/checkout/confirm', {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(`确认订单失败：${response.status()} ${await response.text()}`);
  }
  return response.json();
}

export async function fetchOrderByNumber(
  api: APIRequestContext,
  orderNumber: string,
  email: string
) {
  const response = await api.get(`/orders/number/${orderNumber}`, {
    params: { email },
  });
  if (!response.ok()) {
    throw new Error(`查询订单 ${orderNumber} 失败：${response.status()} ${await response.text()}`);
  }
  return response.json();
}

export async function fetchAdminOrders(api: APIRequestContext, search: string) {
  const response = await api.get('/admin/orders', {
    params: {
      search,
      limit: '10',
    },
  });
  if (!response.ok()) {
    throw new Error(`查询后台订单失败：${response.status()} ${await response.text()}`);
  }
  return response.json();
}

