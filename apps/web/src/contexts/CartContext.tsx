/**
 * Cart Context
 * [2025-11-05 00:15:00]
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cartApi, CartResponse, CartItemResponse } from '@/lib/api'; // [2025-11-10 22:52:03] Reuse typed cart API responses
import useSWR from 'swr';

type CartItem = CartItemResponse; // [2025-11-10 22:52:03] Alias to shared API response type
type Cart = CartResponse; // [2025-11-10 22:52:03] Alias to shared API response type

interface CartContextType {
  cart: Cart; // [2025-01-28 03:30:00] 改为非 null，始终有默认值
  isLoading: boolean;
  error: Error | null;
  addItem: (variantId: string, quantity?: number, designId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// [2025-01-28 03:30:00] 默认空购物车结构
const EMPTY_CART: CartResponse = {
  items: [],
  subtotal: 0,
  shipping: 0,
  discount: 0,
  total: 0,
  itemCount: 0,
};

export function CartProvider({ children }: { children: ReactNode }) {
  // [2025-01-27 22:45:00] 修复 React Hooks 规则：将 useSWR 移到组件顶层
  console.log('[CartProvider] ===== INITIALIZING =====', {
    timestamp: new Date().toISOString(),
    hasCartApi: typeof cartApi !== 'undefined',
    hasGetMethod: typeof cartApi?.get === 'function',
  });

  // [2025-01-28 03:35:00] 使用更安全的错误处理方式
  // [2025-01-27 22:45:00] Hooks 必须在组件顶层调用，不能在 try-catch 内
  const { data, error, mutate, isLoading } = useSWR<CartResponse>(
      '/cart',
      async () => {
        console.log('[CartProvider] ===== FETCHING CART =====', {
          timestamp: new Date().toISOString(),
        });
        try {
          const result = await cartApi.get();
          console.log('[CartProvider] ✅ Cart fetched successfully:', {
            timestamp: new Date().toISOString(),
            itemCount: result?.itemCount || 0,
          });
          return result;
        } catch (err: any) {
          // [2025-01-28 03:35:00] 记录详细错误信息
          console.error('[CartProvider] ❌ Error fetching cart:', {
            timestamp: new Date().toISOString(),
            error: err,
            errorMessage: err?.message,
            errorStack: err?.stack,
            errorName: err?.name,
            errorType: typeof err,
            errorString: String(err),
          });
          // 返回空购物车结构，而不是抛出错误
          console.log('[CartProvider] Using empty cart as fallback');
          return EMPTY_CART;
        }
      },
      {
        revalidateOnFocus: false, // [2025-01-28 03:30:00] 禁用自动重新验证，避免频繁调用
        revalidateOnReconnect: false, // [2025-01-28 03:30:00] 禁用重连时自动验证
        refreshInterval: 0,
        shouldRetryOnError: false, // 不自动重试
        fallbackData: EMPTY_CART, // [2025-01-28 03:30:00] 提供默认值，避免 undefined
        onError: (err) => {
          // [2025-01-28 03:35:00] 记录详细的 SWR 错误
          console.error('[CartProvider] ❌ SWR error (non-fatal):', {
            timestamp: new Date().toISOString(),
            error: err,
            errorMessage: err?.message,
            errorStack: err?.stack,
            errorName: err?.name,
            errorType: typeof err,
            errorString: String(err),
          });
        },
        onErrorRetry: () => {
          // [2025-01-28 03:30:00] 禁用错误重试
          console.log('[CartProvider] Error retry disabled');
          return;
        },
      }
  );

  console.log('[CartProvider] ===== SWR HOOK COMPLETED =====', {
    timestamp: new Date().toISOString(),
    hasData: !!data,
    hasError: !!error,
    isLoading,
  });

  // [2025-01-29 12:00:00] 监听购物车更新事件，确保实时更新
  useEffect(() => {
    const handleCartUpdate = () => {
      console.log('[CartProvider] Cart update event received, refreshing cart...');
      mutate(); // 刷新购物车数据
    };

    window.addEventListener('cart:updated', handleCartUpdate);
    return () => {
      window.removeEventListener('cart:updated', handleCartUpdate);
    };
  }, [mutate]);

  const addItem = async (variantId: string, quantity: number = 1, designId?: string) => {
    try {
      await cartApi.addItem(variantId, quantity, designId);
      await mutate(); // Refresh cart
      // [2025-01-29 12:00:00] 触发更新事件，确保其他组件也能收到通知
      window.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (err) {
      console.error('Error adding item to cart:', err);
      throw err;
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    try {
      await cartApi.updateItem(itemId, quantity);
      await mutate(); // Refresh cart
    } catch (err) {
      console.error('Error updating cart item:', err);
      throw err;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.removeItem(itemId);
      await mutate(); // Refresh cart
    } catch (err) {
      console.error('Error removing cart item:', err);
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clear();
      await mutate(); // Refresh cart
    } catch (err) {
      console.error('Error clearing cart:', err);
      throw err;
    }
  };

  // [2025-01-28 03:35:00] 确保 cart 始终有值，避免 null 导致的问题
  const cart = data || EMPTY_CART;

  console.log('[CartProvider] ===== RENDERING PROVIDER =====', {
    timestamp: new Date().toISOString(),
    cartItemCount: cart?.itemCount || 0,
    hasError: !!error,
    isLoading,
  });

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        error: error || null,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        refreshCart: () => mutate(),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
