/**
 * Cart Icon Component
 * [2025-11-05 00:20:00]
 * [2025-11-11 23:59:30] Added "Cart" label for navigation parity
 * [2025-12-08] 重构：支持 99+ 显示和动画效果
 */
'use client';

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function CartIcon() {
  const { cart, isLoading } = useCart();
  // [2025-01-28 03:40:00] cart 现在保证不是 null，但为了安全仍然使用可选链
  const itemCount = cart?.itemCount || 0;
  const [displayCount, setDisplayCount] = useState(itemCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // [2025-12-08] 当 itemCount 变化时，更新显示并触发动画
  useEffect(() => {
    if (itemCount !== displayCount) {
      setIsAnimating(true);
      setDisplayCount(itemCount);
      // 动画结束后移除动画类
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount, displayCount]);

  // [2025-12-08] 格式化角标数字：超过 99 显示 "99+"
  const badgeText = displayCount > 99 ? '99+' : displayCount.toString();
  const badgeWidth = displayCount > 99 ? 'auto' : '20px';
  const badgePadding = displayCount > 99 ? '0 6px' : '0';

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
      {displayCount > 0 && (
        <span
          className={`cart-icon__badge ${isAnimating ? 'cart-icon__badge--animate' : ''}`}
          aria-hidden="true"
        >
          {badgeText}
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
          border-radius: 12px;
          min-width: ${badgeWidth};
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          padding: ${badgePadding};
          transition: transform 0.2s ease-out;
        }
        .cart-icon__badge--animate {
          animation: badgePulse 0.3s ease-out;
        }
        @keyframes badgePulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
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
