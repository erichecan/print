/**
 * Cart Page
 * [2025-11-05 00:25:00]
 * [2025-01-27 20:00:00] 添加优惠券功能
 */
'use client';

import { useCart } from '@/contexts/CartContext';
import { couponApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  value: number;
}

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const [updating, setUpdating] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdating(itemId);
    try {
      await updateItem(itemId, newQuantity);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!confirm('Remove this item from cart?')) return;
    setUpdating(itemId);
    try {
      await removeItem(itemId);
      // [2025-01-27 20:00:00] 如果购物车变化，重新验证优惠券
      if (appliedCoupon) {
        handleApplyCoupon();
      }
    } finally {
      setUpdating(null);
    }
  };

  // [2025-01-27 20:00:00] 应用优惠券
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !cart) return;
    
    setApplyingCoupon(true);
    setCouponError(null);
    
    try {
      const result = await couponApi.validate(couponCode.trim().toUpperCase(), cart.subtotal);
      setAppliedCoupon({
        code: result.coupon.code,
        discountAmount: result.coupon.discountAmount,
        type: result.coupon.type,
        value: result.coupon.value,
      });
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // [2025-01-27 20:00:00] 移除优惠券
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // [2025-01-27 20:00:00] 计算总价（含折扣）
  const calculateTotal = () => {
    if (!cart) return 0;
    const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    return Math.max(0, cart.total - discount);
  };

  if (isLoading) {
    return (
      <div className="container">
        <p>Loading cart...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container">
        <h1>Shopping Cart</h1>
        <p>Your cart is empty.</p>
        <Link href="/products">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Shopping Cart</h1>
      <div className="cart-grid">
        <div className="cart-items">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Color/Size</th>
                <th>Quantity</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cart-item-info">
                      {item.thumbnail && (
                        <Image
                          src={item.thumbnail}
                          alt={item.productName}
                          width={80}
                          height={80}
                          className="cart-item-thumb"
                        />
                      )}
                      <div>
                        <strong>{item.productName}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <small>{item.variantDescription || 'N/A'}</small>
                  </td>
                  <td>
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          handleUpdateQuantity(item.id, val);
                        }}
                        disabled={updating === item.id}
                      />
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>${item.unitPrice.toFixed(2)}</div>
                      <small>Subtotal: ${item.subtotal.toFixed(2)}</small>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={updating === item.id}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="cart-summary">
          <div className="summary-card">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${cart.subtotal.toFixed(2)}</span>
            </div>
            
            {/* [2025-01-27 20:00:00] 优惠券输入 */}
            <div className="coupon-section">
              {appliedCoupon ? (
                <div className="coupon-applied">
                  <div className="coupon-info">
                    <strong>Coupon: {appliedCoupon.code}</strong>
                    <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="remove-coupon">Remove</button>
                </div>
              ) : (
                <div className="coupon-input-group">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    className="coupon-input"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="coupon-apply-btn"
                  >
                    {applyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && (
                <div className="coupon-error">{couponError}</div>
              )}
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span>{cart.shipping === 0 ? 'Free' : `$${cart.shipping.toFixed(2)}`}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <hr />
            <div className="summary-row total">
              <span>Total</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <Link href="/checkout" className="btn btn-primary">
              Proceed to Checkout
            </Link>
            <Link href="/products" className="btn btn-outline">
              Continue Shopping
            </Link>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
          margin-top: 2rem;
        }
        .cart-table {
          width: 100%;
          border-collapse: collapse;
        }
        .cart-table th,
        .cart-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .cart-item-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .quantity-controls button {
          width: 32px;
          height: 32px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
        }
        .quantity-controls input {
          width: 60px;
          text-align: center;
          padding: 0.25rem;
          border: 1px solid #ddd;
        }
        .summary-card {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 1.2em;
          margin-top: 1rem;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          text-align: center;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 1rem;
        }
        .btn-primary {
          background: #ff1f3d;
          color: white;
        }
        .btn-outline {
          border: 1px solid #ddd;
          color: #333;
        }
        .coupon-section {
          margin: 1rem 0;
          padding: 1rem 0;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }
        .coupon-input-group {
          display: flex;
          gap: 0.5rem;
        }
        .coupon-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .coupon-apply-btn {
          padding: 0.5rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .coupon-apply-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        .coupon-apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .coupon-applied {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #e8f5e9;
          border-radius: 4px;
        }
        .coupon-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          gap: 0.5rem;
        }
        .coupon-info strong {
          color: #2e7d32;
        }
        .coupon-info span {
          color: #2e7d32;
          font-weight: 600;
        }
        .remove-coupon {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid #2e7d32;
          color: #2e7d32;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .remove-coupon:hover {
          background: #2e7d32;
          color: white;
        }
        .coupon-error {
          margin-top: 0.5rem;
          color: #d32f2f;
          font-size: 12px;
        }
        @media (max-width: 968px) {
          .cart-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
