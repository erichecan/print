/**
 * Cart Context
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { cartApi, CartResponse, CartItemResponse } from '@/lib/api'; // Reuse typed cart API responses
import useSWR from 'swr';

type CartItem = CartItemResponse; // Alias to shared API response type
type Cart = CartResponse; // Alias to shared API response type

interface CartContextType {
cart: Cart; // 改为非 null，始终有默认值
  isLoading: boolean;
  error: Error | null;
  addItem: (variantId: string, quantity?: number, designId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// 默认空购物车结构
const EMPTY_CART: CartResponse = {
  items: [],
  subtotal: 0,
  shipping: 0,
  discount: 0,
  total: 0,
  itemCount: 0,
};

export function CartProvider({ children }: { children: ReactNode }) {
// 修复：防止重复初始化（React Strict Mode 在开发环境下会双重渲染）
  const mountedRef = useRef(false);
  const initCountRef = useRef(0);
  
// 只在首次挂载时打印初始化日志
// 修复：使用 try-catch 包装 console.log，防止格式化错误
  if (!mountedRef.current) {
    initCountRef.current += 1;
    try {
      console.log('[CartProvider] ===== INITIALIZING =====', {
        timestamp: new Date().toISOString(),
        initCount: initCountRef.current,
        hasCartApi: typeof cartApi !== 'undefined',
        hasGetMethod: typeof cartApi?.get === 'function',
      });
    } catch (e) {
      // 如果 console.log 失败（可能是格式化错误），静默忽略
      if (process.env.NODE_ENV === 'development') {
        // 使用最简单的输出方式
        try {
          console.log('[CartProvider] INITIALIZING');
        } catch (e2) {
          // 完全失败，忽略
        }
      }
    }
  }

// 修复：使用稳定的 SWR key，避免重复初始化
  const SWR_KEY = '/cart';
  
// 使用更安全的错误处理方式
// Hooks 必须在组件顶层调用，不能在 try-catch 内
  const { data, error, mutate, isLoading } = useSWR<CartResponse>(
      SWR_KEY,
      async () => {
// 防止重复获取（在开发环境下 React Strict Mode 可能导致双重调用）
// 修复：使用 try-catch 包装 console.log，防止格式化错误
        try {
          if (mountedRef.current) {
            console.log('[CartProvider] ===== FETCHING CART (already mounted) =====', {
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log('[CartProvider] ===== FETCHING CART =====', {
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          // 如果 console.log 失败，静默忽略
        }
        try {
          const result = await cartApi.get();
// 修复：使用 try-catch 包装 console.log，防止格式化错误
          try {
            console.log('[CartProvider] ✅ Cart fetched successfully:', {
              timestamp: new Date().toISOString(),
              itemCount: result?.itemCount || 0,
            });
          } catch (e) {
            // 如果 console.log 失败，静默忽略
          }
          return result;
        } catch (err: any) {
// 记录详细错误信息
// 优化：如果是后端服务错误（500/503），静默处理，减少控制台噪音
          const isServerError = err?.message?.includes('500') || 
                               err?.message?.includes('503') ||
                               err?.message?.includes('Service Unavailable') ||
                               err?.message?.includes('Internal Server Error') ||
                               err?.message?.includes('无法连接到后端服务器');
          
// 只有在非服务错误时才详细记录错误（保留对真正错误的可见性）
          if (!isServerError && process.env.NODE_ENV === 'development') {
// 修复：使用 try-catch 包装 console.error，防止格式化错误
            try {
              console.error('[CartProvider] ❌ Error fetching cart:', {
                timestamp: new Date().toISOString(),
                error: err,
                errorMessage: err?.message,
                errorStack: err?.stack,
                errorName: err?.name,
                errorType: typeof err,
                errorString: String(err),
              });
            } catch (e) {
              // 如果 console.error 失败，尝试简单输出
              try {
                console.error('[CartProvider] Error fetching cart:', err?.message || String(err));
              } catch (e2) {
                // 完全失败，忽略
              }
            }
          } else if (isServerError && process.env.NODE_ENV === 'development') {
// 后端服务不可用时，只记录一个警告（而不是错误）
            try {
              console.warn('[CartProvider] 后端购物车服务暂时不可用，使用空购物车');
            } catch (e) {
              // 如果 console.warn 失败，静默忽略
            }
          }
          // 返回空购物车结构，而不是抛出错误
          return EMPTY_CART;
        }
      },
      {
revalidateOnFocus: false, // 禁用自动重新验证，避免频繁调用
revalidateOnReconnect: false, // 禁用重连时自动验证
        refreshInterval: 0,
        shouldRetryOnError: false, // 不自动重试
fallbackData: EMPTY_CART, // 提供默认值，避免 undefined
        onError: (err) => {
// 记录详细的 SWR 错误
// 修复：使用 try-catch 包装 console.error，防止格式化错误
          try {
            console.error('[CartProvider] ❌ SWR error (non-fatal):', {
              timestamp: new Date().toISOString(),
              error: err,
              errorMessage: err?.message,
              errorStack: err?.stack,
              errorName: err?.name,
              errorType: typeof err,
              errorString: String(err),
            });
          } catch (e) {
            // 如果 console.error 失败，尝试简单输出
            try {
              console.error('[CartProvider] SWR error:', err?.message || String(err));
            } catch (e2) {
              // 完全失败，忽略
            }
          }
        },
        onErrorRetry: () => {
// 禁用错误重试
// 修复：使用 try-catch 包装 console.log，防止格式化错误
          try {
            console.log('[CartProvider] Error retry disabled');
          } catch (e) {
            // 如果 console.log 失败，静默忽略
          }
          return;
        },
      }
  );

// 只在首次挂载时打印 SWR 完成日志
// 修复：使用 try-catch 包装 console.log，防止格式化错误
  if (!mountedRef.current) {
    try {
      console.log('[CartProvider] ===== SWR HOOK COMPLETED =====', {
        timestamp: new Date().toISOString(),
        hasData: !!data,
        hasError: !!error,
        isLoading,
      });
    } catch (e) {
      // 如果 console.log 失败，静默忽略
    }
  }

// 标记已挂载，防止重复初始化
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

// 监听购物车更新事件，确保实时更新
// 修复：使用 try-catch 包装 console.log，防止格式化错误
  useEffect(() => {
    const handleCartUpdate = () => {
      try {
        console.log('[CartProvider] Cart update event received, refreshing cart...');
      } catch (e) {
        // 如果 console.log 失败，静默忽略
      }
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
// 触发更新事件，确保其他组件也能收到通知
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

// 添加详细调试日志，修复删除功能
  const removeItem = async (itemId: string) => {
    try {
      console.log('[CartContext] removeItem() called:', itemId);
      await cartApi.removeItem(itemId);
      console.log('[CartContext] ✅ Item removed, refreshing cart');
      await mutate(); // Refresh cart
// 触发购物车更新事件，确保其他组件也能收到通知
      window.dispatchEvent(new CustomEvent('cart:updated'));
      console.log('[CartContext] ✅ Cart update event dispatched');
    } catch (err) {
      console.error('[CartContext] ❌ Error removing cart item:', err);
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

// 确保 cart 始终有值，避免 null 导致的问题
  const cart = data || EMPTY_CART;

// 减少渲染日志，只在必要时打印（避免重复日志）
// 修复：使用 try-catch 包装 console.log，防止格式化错误
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (renderCountRef.current <= 2 || process.env.NODE_ENV === 'development') {
    try {
      console.log('[CartProvider] ===== RENDERING PROVIDER =====', {
        timestamp: new Date().toISOString(),
        renderCount: renderCountRef.current,
        cartItemCount: cart?.itemCount || 0,
        hasError: !!error,
        isLoading,
      });
    } catch (e) {
      // 如果 console.log 失败，静默忽略
    }
  }

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
