/**
 * Stripe Config Validator Component
* 客户端 Stripe 配置验证组件
 * 
 * 在客户端运行时验证 Stripe 配置，避免在生产环境出现配置错误
 */
'use client';

import { useEffect } from 'react';
import { getStripePublishableKey } from '@/config/env';

export function StripeConfigValidator() {
  useEffect(() => {
    // 只在客户端运行
    if (typeof window === 'undefined') return;
    
    try {
// 验证 Stripe 配置
      const key = getStripePublishableKey();
      if (!key || key.trim() === '') {
        if (process.env.NODE_ENV === 'production') {
          console.error('[StripeConfigValidator] ❌ 生产环境必须配置 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
        } else {
          console.warn('[StripeConfigValidator] ⚠️ 开发环境未配置 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
        }
      }
    } catch (error) {
      // 错误已经在 getStripePublishableKey 中记录，这里不需要额外处理
      // 避免页面崩溃，只记录错误
      if (process.env.NODE_ENV === 'development') {
        console.warn('[StripeConfigValidator] 配置验证失败:', error);
      }
    }
  }, []);

  // 不渲染任何内容
  return null;
}

