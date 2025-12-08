/**
 * useBuyNow Hook
 * [2025-12-08] 重构 Buy Now 功能，直接跳转到结算页
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';

interface UseBuyNowOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseBuyNowReturn {
  buyNow: (variantId: string, quantity?: number, designId?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 错误上报（埋点）
 */
function reportError(error: Error, context: Record<string, unknown>) {
  // Console 日志
  console.error('[BuyNow] Error:', {
    error: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // Sentry 上报（如果配置了）
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(error, {
        tags: { feature: 'buy-now' },
        extra: context,
      });
    } catch (e) {
      console.warn('[BuyNow] Failed to report to Sentry:', e);
    }
  }

  // 分析埋点（如果配置了）
  if (typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        ...context,
      });
    } catch (e) {
      console.warn('[BuyNow] Failed to report to analytics:', e);
    }
  }
}

/**
 * useBuyNow Hook
 * 提供立即购买功能，添加商品到购物车后直接跳转到结算页
 */
export function useBuyNow(options: UseBuyNowOptions = {}): UseBuyNowReturn {
  const router = useRouter();
  const { addItem, refreshCart } = useCart();
  const { error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef<number>(0);

  const buyNow = useCallback(
    async (variantId: string, quantity: number = 1, designId?: string) => {
      // 防抖：1秒内不允许重复提交
      const now = Date.now();
      if (now - lastCallTimeRef.current < 1000) {
        console.warn('[BuyNow] Request throttled');
        return;
      }
      lastCallTimeRef.current = now;

      // 防止并发请求
      if (isProcessingRef.current) {
        console.warn('[BuyNow] Already processing, skipping');
        return;
      }

      isProcessingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // 先添加商品到购物车（使用 CartContext 的 addItem，它会自动刷新）
        await addItem(variantId, quantity, designId);

        // 确保购物车数据已更新
        await refreshCart();

        // 分析埋点：Buy Now
        if (typeof window !== 'undefined' && (window as any).gtag) {
          try {
            (window as any).gtag('event', 'begin_checkout', {
              currency: 'CAD',
              value: 0, // 可以传入实际价格
              items: [
                {
                  item_id: variantId,
                  item_name: 'Product',
                  quantity: quantity,
                },
              ],
            });
          } catch (e) {
            console.warn('[BuyNow] Failed to track analytics:', e);
          }
        }

        // 触发成功回调
        options.onSuccess?.();

        // 跳转到结算页
        router.push('/checkout');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to process buy now');
        setError(error);

        // 错误上报
        reportError(error, {
          variantId,
          quantity,
          designId,
          action: 'buy-now',
        });

        // 显示错误提示
        showError('购买失败，请稍后重试', 3000);

        // 触发错误回调
        options.onError?.(error);
      } finally {
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    },
    [router, addItem, refreshCart, showError, options]
  );

  return {
    buyNow,
    isLoading,
    error,
  };
}

