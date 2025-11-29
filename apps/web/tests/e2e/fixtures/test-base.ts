/**
 * [2025-11-24 10:31:18] Playwright 自定义基准 fixture：封装账号、Stripe 与 API 客户端
 */
import { test as base, expect as baseExpect, APIRequestContext, request } from '@playwright/test';
import Stripe from 'stripe';

type AccountCredentials = {
  email: string;
  password: string;
};

type TestFixtures = {
  customerAccount: AccountCredentials;
  adminAccount: AccountCredentials;
  guestEmail: string;
  api: APIRequestContext;
  stripe: Stripe;
};

export const test = base.extend<TestFixtures>({
  customerAccount: async ({}, use) => {
    await use({
      email: process.env.E2E_CUSTOMER_EMAIL || 'customer@test.com',
      password: process.env.E2E_CUSTOMER_PASSWORD || 'customer123',
    });
  },
  adminAccount: async ({}, use) => {
    await use({
      email: process.env.E2E_ADMIN_EMAIL || 'demo@print.local',
      password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
    });
  },
  guestEmail: async ({}, use) => {
    await use(process.env.E2E_GUEST_EMAIL || 'guest+e2e@print.local');
  },
  api: async ({}, use) => {
    const baseURL = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '') + '/api';
    const apiContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'x-playwright-e2e': 'true',
      },
    });
    await use(apiContext);
    await apiContext.dispose();
  },
  stripe: async ({}, use, testInfo) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      // [2025-11-28 16:55:00] 如果没有 Stripe 密钥，跳过测试而不是失败
      testInfo.skip(true, 'STRIPE_SECRET_KEY 未配置，跳过支付测试');
      return;
    }
    const stripeClient = new Stripe(secret, { apiVersion: '2024-06-20' });
    await use(stripeClient);
  },
});

export const expect = baseExpect;

