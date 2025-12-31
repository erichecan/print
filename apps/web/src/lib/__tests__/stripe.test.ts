/**
 * Stripe Tests
* Design Lab 4.0: stripe 初始化空值防护测试
 */

import { getStripe, validateStripeConfig } from '../stripe';

// Mock @stripe/stripe-js
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

describe('Stripe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('空 key 应返回 null', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const stripe = await getStripe();
    expect(stripe).toBeNull();
  });

  it('生产环境缺失 key 应抛错', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    expect(() => validateStripeConfig()).toThrow();
  });

  it('开发环境缺失 key 应警告但不抛错', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    expect(() => validateStripeConfig()).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

