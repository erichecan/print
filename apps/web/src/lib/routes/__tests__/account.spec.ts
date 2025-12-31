/**
 * Account Routes Unit Tests
* 测试账户路由映射
 */
import { ACCOUNT_ROUTES } from '../account';

describe('ACCOUNT_ROUTES', () => {
  it('should have all required route constants', () => {
    expect(ACCOUNT_ROUTES.dashboard).toBe('/account');
    expect(ACCOUNT_ROUTES.orders).toBe('/account/orders');
    expect(ACCOUNT_ROUTES.billing).toBe('/account/billing');
    expect(ACCOUNT_ROUTES.paymentMethods).toBe('/account/billing/payment-methods');
    expect(ACCOUNT_ROUTES.addresses).toBe('/account/addresses');
    expect(ACCOUNT_ROUTES.profile).toBe('/account/profile');
    expect(ACCOUNT_ROUTES.team).toBe('/account/team');
    expect(ACCOUNT_ROUTES.assets).toBe('/account/assets');
    expect(ACCOUNT_ROUTES.notifications).toBe('/account/notifications');
    expect(ACCOUNT_ROUTES.support).toBe('/account/support');
    expect(ACCOUNT_ROUTES.rewards).toBe('/account/rewards');
  });

  it('should generate order detail route correctly', () => {
    const orderId = 'test-order-123';
    const route = ACCOUNT_ROUTES.orderDetail(orderId);
    expect(route).toBe(`/account/orders/${orderId}`);
  });

  it('should generate order detail route with different IDs', () => {
    expect(ACCOUNT_ROUTES.orderDetail('abc')).toBe('/account/orders/abc');
    expect(ACCOUNT_ROUTES.orderDetail('123')).toBe('/account/orders/123');
    expect(ACCOUNT_ROUTES.orderDetail('order-456')).toBe('/account/orders/order-456');
  });
});
