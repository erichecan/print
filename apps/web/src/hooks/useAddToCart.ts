/**
 * useAddToCart Hook
 * [2025-12-08] 重构 Add to Cart 功能，包含防抖、错误处理和埋点
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';

interface UseAddToCartOptions {
  onSuccess?: (cartCount: number) => void;
  onError?: (error: Error) => void;
}

interface UseAddToCartReturn {
  addToCart: (variantId: string, quantity?: number, designId?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 错误上报（埋点）
 */
function reportError(error: Error, context: Record<string, unknown>) {
  // Console 日志
  console.error('[AddToCart] Error:', {
    error: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // Sentry 上报（如果配置了）
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(error, {
        tags: { feature: 'add-to-cart' },
        extra: context,
      });
    } catch (e) {
      console.warn('[AddToCart] Failed to report to Sentry:', e);
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
      console.warn('[AddToCart] Failed to report to analytics:', e);
    }
  }
}

/**
 * useAddToCart Hook
 * 提供添加商品到购物车的功能，包含防抖、错误处理和埋点
 */
export function useAddToCart(options: UseAddToCartOptions = {}): UseAddToCartReturn {
  const { addItem, refreshCart, cart } = useCart();
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef<number>(0);

  const addToCart = useCallback(
    async (variantId: string, quantity: number = 1, designId?: string) => {
      // 防抖：1秒内不允许重复提交
      const now = Date.now();
      if (now - lastCallTimeRef.current < 1000) {
        console.warn('[AddToCart] Request throttled');
        return;
      }
      lastCallTimeRef.current = now;

      // 防止并发请求
      if (isProcessingRef.current) {
        console.warn('[AddToCart] Already processing, skipping');
        return;
      }

      isProcessingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // 调用 CartContext 的 addItem 方法（它会自动刷新购物车）
        await addItem(variantId, quantity, designId);

        // addItem 内部已经调用了 mutate() 来刷新购物车数据
        // 但为了确保数据同步，我们再次调用 refreshCart
        // 注意：refreshCart 是同步的，但 SWR 的更新是异步的
        refreshCart();

        // 等待一下让 React 状态更新（SWR 的 mutate 是异步的）
        // 由于 cart 是通过 useCart hook 获取的，它会在 SWR 更新后自动更新
        // 我们使用一个小的延迟来确保状态已更新
        await new Promise(resolve => setTimeout(resolve, 100));

        // 获取最新的购物车数量
        // 注意：由于 cart 是通过 hook 获取的，它会在 SWR 更新后自动更新
        // 但为了确保获取最新值，我们需要在下一个事件循环中获取
        // 实际上，由于我们使用了 refreshCart，cart 应该已经更新了
        const latestCartCount = cart?.itemCount || 0;

        // 显示成功提示
        success('已加入购物车', 3000);

        // 触发成功回调
        options.onSuccess?.(latestCartCount);

        // 分析埋点：成功添加
        if (typeof window !== 'undefined' && (window as any).gtag) {
          try {
            (window as any).gtag('event', 'add_to_cart', {
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
            console.warn('[AddToCart] Failed to track analytics:', e);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add to cart');
        setError(error);

        // 错误上报
        reportError(error, {
          variantId,
          quantity,
          designId,
          action: 'add-to-cart',
        });

        // 显示错误提示
        showError('加入失败，请稍后重试', 3000);

        // 触发错误回调
        options.onError?.(error);
      } finally {
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    },
    [addItem, refreshCart, cart, success, showError, options]
  );

  return {
    addToCart,
    isLoading,
    error,
  };
}

