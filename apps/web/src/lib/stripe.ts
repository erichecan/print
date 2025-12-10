/**
 * Stripe Integration - 统一 Stripe 初始化
 * [2025-12-10] 封装 Stripe 初始化，确保 key 正确配置
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/config/env';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * 获取 Stripe 实例（客户端）
 * [2025-12-10] 确保 key 非空后才初始化
 */
export function getStripe(): Promise<Stripe | null> {
  if (stripePromise) {
    return stripePromise;
  }

  const publishableKey = getStripePublishableKey();
  
  if (!publishableKey || publishableKey.trim() === '') {
    console.error('[Stripe] ❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置或为空');
    console.error('[Stripe] 请设置正确的 Stripe Publishable Key 环境变量');
    
    // 返回一个 rejected promise，而不是传递空字符串给 loadStripe
    return Promise.reject(new Error('Stripe Publishable Key is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.'));
  }

  stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

/**
 * 检查 Stripe 是否已配置
 */
export function isStripeConfigured(): boolean {
  try {
    const key = getStripePublishableKey();
    return !!key && key.trim() !== '';
  } catch {
    return false;
  }
}

