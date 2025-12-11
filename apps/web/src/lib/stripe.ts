/**
 * Stripe 初始化与配置
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化前检查，空值防护
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * 获取 Stripe 实例
 * [2025-01-30 23:00:00] Design Lab 4.0: 初始化前检查，空值防护
 */
export function getStripe(): Promise<Stripe | null> {
  if (stripePromise) {
    return stripePromise;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // [2025-01-30 23:00:00] Design Lab 4.0: 空值防护
  if (!publishableKey || publishableKey.trim() === '') {
    console.warn('[Stripe] ⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置或为空，Stripe 功能将不可用');
    stripePromise = Promise.resolve(null);
    return stripePromise;
  }

  // [2025-01-30 23:00:00] Design Lab 4.0: 初始化 Stripe
  stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

/**
 * 检查 Stripe 是否已配置
 * [2025-01-30 17:45:00] 检查 Stripe publishable key 是否存在
 */
export function isStripeConfigured(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return !!(publishableKey && publishableKey.trim() !== '');
}

/**
 * 验证 Stripe 配置
 * [2025-01-30 23:00:00] Design Lab 4.0: 构建时校验
 */
export function validateStripeConfig(): void {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey || publishableKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ 生产环境 Stripe 配置缺失: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 必须设置');
    } else {
      console.warn('[Stripe] ⚠️ 开发环境 Stripe 配置缺失: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置');
    }
  }
}
