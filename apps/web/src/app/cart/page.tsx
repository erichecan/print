/**
 * Cart Page
 * [2025-11-05 00:25:00]
 * [2025-01-27 20:00:00] 添加优惠券功能
 * [2025-11-16 12:32:00] 对齐原型化购物车布局与摘要
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { couponApi, promotionApi, Promotion } from '@/lib/api'; // [2025-01-28 12:40:00] 添加促销活动 API
import { useToast } from '@/hooks/useToast'; // [2025-01-27 16:50:00] Toast 通知
import useSWR from 'swr'; // [2025-01-28 12:40:00] 用于获取促销活动

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  value: number;
}

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const { success, error: showError, info } = useToast(); // [2025-01-27 16:50:00] Toast 通知
  const [updating, setUpdating] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState('');
  const [postalError, setPostalError] = useState('Please enter a postal code to get your price.');
  const [showCouponForm, setShowCouponForm] = useState(false);
  
  // [2025-01-28 12:40:00] 获取每个商品的促销活动信息
  const productIds = cart?.items.map((item) => item.productId).filter(Boolean) || [];
  const { data: promotionsData } = useSWR(
    productIds.length > 0 ? ['cart-promotions', productIds] : null,
    async () => {
      const promotionsMap: Record<string, Promotion> = {};
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const result = await promotionApi.getForProduct(productId);
            if (result.promotions && result.promotions.length > 0) {
              // [2025-01-28 12:40:00] 选择折扣最大的促销活动
              const bestPromotion = result.promotions.sort((a, b) => {
                const aValue = a.discountType === 'percentage' ? a.discountValue : a.discountValue;
                const bValue = b.discountType === 'percentage' ? b.discountValue : b.discountValue;
                return bValue - aValue;
              })[0];
              promotionsMap[productId] = bestPromotion;
            }
          } catch (err) {
            // 忽略错误
          }
        })
      );
      return promotionsMap;
    }
  );

  // [2025-01-28 12:40:00] 计算促销折扣总额
  const promotionDiscount = useMemo(() => {
    if (!cart || !promotionsData) return 0;
    let total = 0;
    cart.items.forEach((item) => {
      const promotion = promotionsData[item.productId];
      if (promotion) {
        const itemSubtotal = item.subtotal;
        let discount = 0;
        if (promotion.discountType === 'percentage') {
          discount = (itemSubtotal * promotion.discountValue) / 100;
          if (promotion.maxDiscount && discount > promotion.maxDiscount) {
            discount = promotion.maxDiscount;
          }
        } else {
          discount = promotion.discountValue * item.quantity;
          if (discount > itemSubtotal) {
            discount = itemSubtotal;
          }
        }
        total += discount;
      }
    });
    return Math.round(total * 100) / 100;
  }, [cart, promotionsData]);

  const recommendedProducts = useMemo(
    () => [
      { id: 'rec-1', name: 'Gildan Midweight 50/50 Pullover Hoodie', image: '/assets/categories/cat-sweatshirt.png' },
      { id: 'rec-2', name: "Gildan Women's Softstyle V-Neck T-shirt", image: '/assets/categories/cat-tshirt.png' },
      { id: 'rec-3', name: 'Gildan Ultra Cotton Long Sleeve Jersey T-shirt', image: '/assets/categories/cat-tshirt.png' },
      { id: 'rec-4', name: 'Gildan Softstyle Long Sleeve Jersey T-shirt', image: '/assets/categories/cat-tshirt.png' },
      { id: 'rec-5', name: 'Gildan Softstyle Hoodie', image: '/assets/categories/cat-sweatshirt.png' },
      { id: 'rec-6', name: 'Gildan Women’s Slim Fit Softstyle Jersey', image: '/assets/categories/cat-tshirt.png' },
      { id: 'rec-7', name: 'Gildan Youth Softstyle Jersey T-shirt', image: '/assets/categories/cat-tshirt.png' },
      { id: 'rec-8', name: 'Gildan Softstyle Eco Crewneck Sweatshirt', image: '/assets/categories/cat-sweatshirt.png' },
    ],
    []
  );

  // [2025-01-27 16:50:00] 优化数量更新交互反馈
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      showError('Quantity must be at least 1');
      return;
    }
    setUpdating(itemId);
    try {
      await updateItem(itemId, newQuantity);
      info('Cart updated');
    } catch (err: any) {
      showError(err.message || 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  // [2025-01-27 16:50:00] 优化删除交互反馈
  const handleRemove = async (itemId: string) => {
    const item = cart?.items.find(i => i.id === itemId);
    const confirmMessage = `Remove "${item?.productName || 'this item'}" from cart?`;

    if (!window.confirm(confirmMessage)) return;

    setUpdating(itemId);
    try {
      await removeItem(itemId);
      success('Item removed from cart');
      // [2025-01-27 16:50:00] 如果应用了优惠券，重新验证
      if (appliedCoupon) {
        handleApplyCoupon();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  // [2025-01-27 16:50:00] 优化优惠券应用交互反馈
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !cart) {
      showError('Please enter a coupon code');
      return;
    }
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
      success(`Coupon "${result.coupon.code}" applied! Saved $${result.coupon.discountAmount.toFixed(2)}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid coupon code';
      setCouponError(errorMsg);
      setAppliedCoupon(null);
      showError(errorMsg);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // [2025-01-27 16:50:00] 优化移除优惠券交互反馈
  const handleRemoveCoupon = () => {
    const code = appliedCoupon?.code;
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    if (code) {
      info(`Coupon "${code}" removed`);
    }
  };

  // [2025-01-27 16:50:00] 优化邮政编码更新交互反馈
  const handlePostalUpdate = () => {
    if (!postalCode.trim() || postalCode.trim().length < 5) {
      const errorMsg = 'Please enter a valid zip/postal code.';
      setPostalError(errorMsg);
      showError(errorMsg);
      return;
    }
    setPostalError(null);
    success('Postal code updated. Prices will be calculated at checkout.');
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
    <section className="cart-new">
      <div className="cart-new__top">
        <div className="cart-new__breadcrumbs">
          <Link href="/">Custom T-shirts</Link>
          <span>My Cart</span>
        </div>
        <div className="cart-new__actions">
          <a href="tel:8552712660">Talk to a Real Person 855-271-2660</a>
          <Link href="/chat">Chat with a Real Person</Link>
        </div>
      </div>

      <div className="cart-new__hero">
        <h1>My Cart</h1>
        <p className="cart-new__subtitle">Please enter a postal code to get your price.</p>
      </div>

      <div className={`cart-new__alert ${postalError ? 'has-error' : ''}`}>
        <div className="cart-new__alert-icon">!</div>
        <div className="cart-new__alert-content">
          <p>{postalError || 'Great! We\'ll keep this ZIP on file for delivery estimates.'}</p>
          <div className="cart-new__alert-form">
            <label htmlFor="cart-zip" className="sr-only">
              Enter postal code
            </label>
            <input
              id="cart-zip"
              type="text"
              value={postalCode}
              placeholder="Enter postal code"
              onChange={(event) => setPostalCode(event.target.value)}
            />
            <button type="button" onClick={handlePostalUpdate}>
              Update
            </button>
          </div>
        </div>
      </div>

      <div className="cart-new__grid">
        <div className="cart-new__main">
          {cart.items.map((item) => (
            <article key={item.id} className="cart-card">
              <div className="cart-card__media">
                {item.thumbnail ? (
                  <Image 
                    src={item.thumbnail} 
                    alt={item.productName} 
                    width={144} 
                    height={144}
                    onError={(e) => {
                      // [2025-01-29 12:00:00] 图片加载失败时显示占位符
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder && placeholder.classList.contains('cart-card__placeholder')) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                    unoptimized={item.thumbnail.startsWith('http') && !item.thumbnail.includes('storage.googleapis.com')}
                  />
                ) : null}
                <div className="cart-card__placeholder" style={{ display: item.thumbnail ? 'none' : 'flex' }}>
                  {item.thumbnail ? 'Image' : 'Design Preview'}
                </div>
              </div>
              <div className="cart-card__body">
                <div className="cart-card__top">
                  <div>
                    <p className="cart-card__design-name">{item.productName}</p>
                    <button type="button" className="cart-card__link">
                      Edit Design
                    </button>
                  </div>
                  <button
                    type="button"
                    className="cart-card__remove"
                    onClick={() => handleRemove(item.id)}
                    disabled={updating === item.id}
                  >
                    ×
                  </button>
                </div>
                <p className="cart-card__product">
                  {item.productName}
                  <span>{item.variantDescription || 'Heather Dark Grey | Printing'}</span>
                  {/* [2025-01-28 12:40:00] 显示促销活动标签 */}
                  {promotionsData?.[item.productId] && (
                    <span style={{ 
                      display: 'inline-block', 
                      marginLeft: '8px', 
                      padding: '2px 8px', 
                      backgroundColor: '#e74c3c', 
                      color: 'white', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {promotionsData[item.productId].discountType === 'percentage'
                        ? `${promotionsData[item.productId].discountValue}% OFF`
                        : `$${promotionsData[item.productId].discountValue.toFixed(2)} OFF`}
                    </span>
                  )}
                </p>
                <p className="cart-card__meta">
                  Qty {item.quantity}+ <span>XS | 1 |</span>{' '}
                  <button type="button" className="cart-card__link">
                    Edit Sizes
                  </button>{' '}
                  <span>|</span>{' '}
                  <button type="button" className="cart-card__link">
                    Add Another Color
                  </button>
                </p>

                <div className="cart-card__controls">
                  <div className="cart-card__qty">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={updating === item.id || item.quantity <= 1}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => {
                        const nextValue = parseInt(event.target.value, 10) || 1;
                        handleUpdateQuantity(item.id, nextValue);
                      }}
                      disabled={updating === item.id}
                    />
                    <button type="button" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={updating === item.id}>
                      +
                    </button>
                  </div>
                  <div className="cart-card__price">
                    <span>${item.subtotal.toFixed(2)}</span>
                    <small>${item.unitPrice.toFixed(2)} each</small>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <section className="cart-delivery">
            <h3>Delivery Options</h3>
            <div className="cart-delivery__options">
              <div className="cart-delivery__card is-disabled">
                <span>Ship to multiple addresses</span>
              </div>
              <div className="cart-delivery__card is-disabled">
                <span>Only available for orders of 6 or more items</span>
              </div>
            </div>
          </section>

          <section className="cart-upsell">
            <div className="cart-upsell__header">
              <h3>Add Your Design to More Styles</h3>
              <p>Only available for orders of 6 or more items.</p>
            </div>
            <div className="cart-upsell__grid">
              {recommendedProducts.map((product) => (
                <div key={product.id} className="cart-upsell__card">
                  <Image src={product.image} alt={product.name} width={96} height={120} />
                  <p>{product.name}</p>
                  <button type="button">Add product</button>
                </div>
              ))}
              <div className="cart-upsell__cta">
                <div>
                  <p>View more items that your group will love</p>
                  <button type="button">Take a look</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="cart-new__summary">
          <div className="summary-panel">
            <div className="summary-panel__row">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span>${cart.subtotal.toFixed(2)}</span>
            </div>
            {/* [2025-01-28 12:40:00] 显示促销折扣 */}
            {promotionDiscount > 0 && (
              <div className="summary-panel__row" style={{ color: '#e74c3c' }}>
                <span>Promotion Discount</span>
                <span>- ${promotionDiscount.toFixed(2)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="summary-panel__row">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>- ${appliedCoupon.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-panel__row">
              <span>Delivery</span>
              <span>{cart.shipping === 0 ? 'FREE' : `$${cart.shipping.toFixed(2)}`}</span>
            </div>
            <div className="summary-panel__row summary-panel__zip">
              <div>
                <span>Change postal code</span>
                <label htmlFor="summary-zip" className="sr-only">
                  Enter postal code
                </label>
                <input
                  id="summary-zip"
                  type="text"
                  value={postalCode}
                  placeholder="Enter postal code"
                  onChange={(event) => setPostalCode(event.target.value)}
                />
              </div>
              <button type="button" onClick={handlePostalUpdate}>
                Update
              </button>
            </div>
            {postalError && <p className="summary-panel__zip-error">Please enter a valid zip/postal code.</p>}
            <div className="summary-panel__row">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="summary-panel__row summary-panel__total">
              <span>Total</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <Link href="/checkout" className="summary-panel__primary">
              Proceed to Checkout
            </Link>
            <button type="button" className="summary-panel__secondary" onClick={() => setShowCouponForm(!showCouponForm)}>
              {showCouponForm ? 'Hide discount code' : 'Add discount code'}
            </button>
            {showCouponForm && (
              <div className="summary-panel__coupon">
                <label htmlFor="summary-coupon">Enter discount code</label>
                <div>
                  <input
                    id="summary-coupon"
                    type="text"
                    value={couponCode}
                    placeholder="Enter code"
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  />
                  <button type="button" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}>
                    {applyingCoupon ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <p>
                    Coupon <strong>{appliedCoupon.code}</strong> applied — saved ${appliedCoupon.discountAmount.toFixed(2)}
                    <button type="button" onClick={handleRemoveCoupon}>
                      Remove
                    </button>
                  </p>
                )}
                {couponError && <p className="summary-panel__coupon-error">{couponError}</p>}
              </div>
            )}
          </div>

          <div className="summary-panel__badge">
            <p>FREE design review</p>
            <p>FREE standard shipping</p>
            <p>No setup fees</p>
            <p>100% satisfaction guaranteed</p>
          </div>
        </aside>
      </div>

      <div className="cart-new__footer">
        <div>
          <h4>Talk to a Real Person 7 Days a Week</h4>
          <p>8am–Midnight ET Mon-Fri | 10am–6pm ET Saturday | 10am–6pm ET Sunday</p>
        </div>
        <div className="cart-new__footer-contact">
          <a href="tel:8552712660">855-271-2660</a>
          <a href="mailto:service@customink.com">Send us an Email</a>
        </div>
      </div>
    </section>
  );
}
