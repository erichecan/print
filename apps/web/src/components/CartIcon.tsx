/**
 * Cart Icon Component
 * [2025-11-05 00:20:00]
 * [2025-11-11 23:59:30] Added "Cart" label for navigation parity
 */
'use client';

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';

export function CartIcon() {
  const { cart, isLoading } = useCart();
  // [2025-01-28 03:40:00] cart 现在保证不是 null，但为了安全仍然使用可选链
  const itemCount = cart?.itemCount || 0;

  return (
    <Link
      href="/cart"
      className="cart-icon"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span className="cart-icon__label">Cart</span>
      {itemCount > 0 && (
        <span className="cart-icon__badge" aria-hidden="true">
          {itemCount}
        </span>
      )}
      <style jsx>{`
        .cart-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: currentColor;
          text-decoration: none;
        }
        .cart-icon__badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff1f3d;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }
        .cart-icon__label {
          margin-left: 8px;
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
    </Link>
  );
}
