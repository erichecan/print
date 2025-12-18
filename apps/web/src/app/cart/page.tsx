/**
 * Cart Page
 * [2025-11-05 00:25:00]
 * [2025-01-27 20:00:00] 添加优惠券功能
 * [2025-11-16 12:32:00] 对齐原型化购物车布局与摘要
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // [2025-12-08] 修复：使用 router.push 替代 Link 避免 RSC 路由问题
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
  const router = useRouter(); // [2025-12-08] 修复：使用 router.push 替代 Link 避免 RSC 路由问题
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const { success, error: showError, info } = useToast(); // [2025-01-27 16:50:00] Toast 通知
  const [updating, setUpdating] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState('');
  // [2025-12-13 14:30:00] 修复：初始值为空，仅在用户点击 Update 且输入无效时才显示错误
  const [postalError, setPostalError] = useState('');
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [navigatingToCheckout, setNavigatingToCheckout] = useState(false); // [2025-12-08] 防止重复点击
  
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
  // [2025-12-13 14:30:00] 修复：仅在用户点击 Update 且输入无效时才显示错误
  const handlePostalUpdate = () => {
    if (!postalCode.trim() || postalCode.trim().length < 5) {
      const errorMsg = 'Please enter a valid zip/postal code.';
      setPostalError(errorMsg);
      showError(errorMsg);
      return;
    }
    // [2025-12-13 14:30:00] 修复：清除错误提示（使用空字符串而非 null）
    setPostalError('');
    success('Postal code updated. Prices will be calculated at checkout.');
  };

  const calculateTotal = () => {
    if (!cart) return 0;
    const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    return Math.max(0, cart.total - discount);
  };

  // [2025-12-13 15:55:00] CustomInk风格：优化空购物车状态显示
  const renderEmptyState = () => (
    <section className="cart-new">
      <div className="cart-new__top">
        <div className="cart-new__breadcrumbs">
          <Link href="/">Custom T-shirts</Link>
          <span>My Cart</span>
        </div>
      </div>
      <div className="cart-new__hero">
        <h1>My Cart</h1>
      </div>
      <div className="cart-empty-state" style={{
        maxWidth: '600px',
        margin: '64px auto',
        textAlign: 'center',
        padding: '48px 24px',
        background: 'var(--color-bg)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.3 }}>🛒</div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: 'var(--color-text)', 
          marginBottom: '12px' 
        }}>
          Your cart is empty
        </h2>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-text-muted)', 
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          Start adding items to your cart to get started!
        </p>
        <Link 
          href="/products" 
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '16px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-600)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 31, 61, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );

  // [2025-12-13 15:55:00] CustomInk风格：优化加载状态显示
  if (isLoading) {
    return (
      <section className="cart-new">
        <div className="cart-new__top">
          <div className="cart-new__breadcrumbs">
            <Link href="/">Custom T-shirts</Link>
            <span>My Cart</span>
          </div>
        </div>
        <div className="cart-new__hero">
          <h1>My Cart</h1>
        </div>
        <div style={{
          maxWidth: '600px',
          margin: '64px auto',
          textAlign: 'center',
          padding: '48px 24px'
        }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '4px solid var(--color-bg-subtle)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '24px'
          }} />
          <p style={{ 
            fontSize: '16px', 
            color: 'var(--color-text-muted)',
            margin: 0
          }}>
            Loading cart...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
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
          <a href="tel:4169166352">Talk to a Real Person 416 916 6352</a>
          <Link href="/chat">Chat with a Real Person</Link>
        </div>
      </div>

      <div className="cart-new__hero">
        <h1>My Cart</h1>
        {/* [2025-12-13 14:30:00] 删除：移除顶部重复的邮编提示文案 */}
      </div>

      {/* [2025-12-13 14:30:00] 删除：移除顶部红框邮编输入模块，邮编输入仅保留在右侧 Summary 区域 */}

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
                {/* [2025-12-13 15:50:00] 图片占位符：当图片加载失败或无图片时显示 */}
                <div 
                  className="cart-card__placeholder" 
                  style={{ 
                    display: item.thumbnail ? 'none' : 'flex',
                    position: 'absolute',
                    inset: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500
                  }}
                >
                  {item.thumbnail ? 'Image' : 'Design Preview'}
                </div>
              </div>
              <div className="cart-card__body">
                <div className="cart-card__top">
                  <div>
                    <p className="cart-card__design-name">{item.productName}</p>
                    {/* [2025-12-13 15:45:00] 暂时隐藏 Edit Design 按钮（功能待实现） */}
                    {/* <button type="button" className="cart-card__link">
                      Edit Design
                    </button> */}
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
                  {/* [2025-12-13 15:55:00] CustomInk风格：优化促销标签样式 */}
                  {promotionsData?.[item.productId] && (
                    <span className="cart-card__promotion-badge">
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

          {/* [2025-12-13 15:45:00] 注释掉 Delivery Options 板块（暂时下线） */}
          {/* <section className="cart-delivery">
            <h3>Delivery Options</h3>
            <div className="cart-delivery__options">
              <div className="cart-delivery__card is-disabled">
                <span>Ship to multiple addresses</span>
              </div>
              <div className="cart-delivery__card is-disabled">
                <span>Only available for orders of 6 or more items</span>
              </div>
            </div>
          </section> */}

          {/* [2025-12-13 15:45:00] 注释掉 Add Your Design to More Styles 板块（暂时下线） */}
          {/* <section className="cart-upsell">
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
          </section> */}
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
            <button
              type="button"
              className="summary-panel__primary"
              onClick={() => {
                // [2025-12-08] 修复：使用 router.push 替代 Link，避免 RSC 路由问题和 404 错误
                if (navigatingToCheckout) return; // 防止重复点击
                setNavigatingToCheckout(true);
                
                try {
                  // 埋点：记录 Checkout 按钮点击
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    try {
                      (window as any).gtag('event', 'begin_checkout', {
                        currency: 'CAD',
                        value: calculateTotal(),
                        items: cart?.items.map(item => ({
                          item_id: item.variantId,
                          item_name: item.productName,
                          quantity: item.quantity,
                          price: item.unitPrice,
                        })) || [],
                      });
                    } catch (e) {
                      console.warn('[CartPage] Failed to track checkout analytics:', e);
                    }
                  }
                  
                  // 使用绝对路径，确保正确导航
                  router.push('/checkout');
                } catch (error) {
                  console.error('[CartPage] Failed to navigate to checkout:', error);
                  // 错误上报
                  if (typeof window !== 'undefined' && (window as any).Sentry) {
                    try {
                      (window as any).Sentry.captureException(error, {
                        tags: { feature: 'cart-checkout' },
                        extra: { cartItemCount: cart?.itemCount || 0 },
                      });
                    } catch (e) {
                      console.warn('[CartPage] Failed to report to Sentry:', e);
                    }
                  }
                  showError('Failed to navigate to checkout. Please try again.');
                  setNavigatingToCheckout(false);
                }
              }}
              disabled={navigatingToCheckout || !cart || cart.items.length === 0}
              aria-label={navigatingToCheckout ? 'Processing checkout...' : 'Proceed to checkout'}
            >
              {navigatingToCheckout ? 'Loading...' : 'Proceed to Checkout'}
            </button>
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
          <a href="tel:4169166352">416 916 6352</a>
          <a href="mailto:service@customink.com">Send us an Email</a>
        </div>
      </div>
    </section>
  );
}
