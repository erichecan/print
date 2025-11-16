/**
 * Cart Page
 * [2025-11-05 00:25:00]
 * [2025-01-27 20:00:00] 添加优惠券功能
 * [2025-11-16 12:32:00] 对齐原型化购物车布局与摘要
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { couponApi } from '@/lib/api';

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
      if (appliedCoupon) {
        handleApplyCoupon();
      }
    } finally {
      setUpdating(null);
    }
  };

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

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const calculateTotal = () => {
    if (!cart) return 0;
    const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    return Math.max(0, cart.total - discount);
  };

  const renderEmptyState = () => (
    <section className="cart">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">Shopping Cart</li>
          </ol>
        </nav>
          <div className="cart__grid">
            <div className="cart__items">
              <h1>Shopping Cart</h1>
              <div className="no-reviews cart-empty">
              <p>Your cart is empty.</p>
              <Link href="/products" className="btn btn--outline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  if (isLoading) {
    return (
      <section className="cart">
        <div className="container">
          <p>Loading cart...</p>
        </div>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return renderEmptyState();
  }

  return (
    <section className="cart">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">Shopping Cart</li>
          </ol>
        </nav>

        <div className="cart__grid">
          <div className="cart__items">
            <h1>Shopping Cart</h1>
            <div className="cart-table">
              <div className="cart-row header">
                <span>Product</span>
                <span>Color/Size</span>
                <span>Quantity</span>
                <span>Price</span>
                <span aria-hidden="true" />
              </div>
              {cart.items.map((item) => (
                <div key={item.id} className="cart-row">
                  <div className="item-info">
                    {item.thumbnail && (
                      <Image src={item.thumbnail} alt={item.productName} width={80} height={80} className="item-img" />
                    )}
                    <div className="item-details">
                      <strong>{item.productName}</strong>
                      <p>{item.variantDescription || 'Custom configuration'}</p>
                    </div>
                  </div>
                  <div className="item-variants">
                    <small>{item.variantDescription || 'N/A'}</small>
                  </div>
                  <div className="item-qty">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={updating === item.id || item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={item.quantity}
                      onChange={(event) => {
                        const nextValue = parseInt(event.target.value, 10) || 1;
                        handleUpdateQuantity(item.id, nextValue);
                      }}
                      disabled={updating === item.id}
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={updating === item.id}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-price">
                    <div>${item.unitPrice.toFixed(2)}</div>
                    <small>Subtotal: ${item.subtotal.toFixed(2)}</small>
                  </div>
                  <div className="item-remove">
                    <button type="button" onClick={() => handleRemove(item.id)} disabled={updating === item.id}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="promo">
              <label htmlFor="promo-code">Promo Code</label>
              <div className="promo-input">
                <input
                  id="promo-code"
                  type="text"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  onKeyPress={(event) => event.key === 'Enter' && handleApplyCoupon()}
                />
                <button type="button" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}>
                  {applyingCoupon ? 'Applying…' : 'Apply'}
                </button>
              </div>
              {appliedCoupon && (
                <div className="coupon-applied">
                  <p>
                    Coupon <strong>{appliedCoupon.code}</strong> applied — saved ${appliedCoupon.discountAmount.toFixed(2)}
                  </p>
                  <button type="button" onClick={handleRemoveCoupon}>
                    Remove
                  </button>
                </div>
              )}
              {couponError && <div className="coupon-error">{couponError}</div>}
            </div>
          </div>

          <aside className="cart-summary">
            <div className="summary-card">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="summary-row">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>- ${appliedCoupon.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>{cart.shipping === 0 ? 'Free' : `$${cart.shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>Calculated at checkout</span>
              </div>
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

            <div className="trust-badges">
              <p>✓ Free shipping on $50+</p>
              <p>✓ 100% satisfaction guarantee</p>
              <p>✓ Secure checkout</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
