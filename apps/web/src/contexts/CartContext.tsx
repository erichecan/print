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
  cart: Cart | null;
  isLoading: boolean;
  error: Error | null;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { data, error, mutate, isLoading } = useSWR<Cart>('/cart', () => cartApi.get(), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0,
  });

  const addItem = async (variantId: string, quantity: number = 1) => {
    try {
      await cartApi.addItem(variantId, quantity);
      await mutate(); // Refresh cart
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

  return (
    <CartContext.Provider
      value={{
        cart: data || null,
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
