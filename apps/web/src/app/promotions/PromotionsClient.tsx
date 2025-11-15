/**
 * Promotions Client Component
 * [2025-01-27 20:25:00] 促销页面客户端组件（处理动态数据获取）
 */
'use client';

import { useState, useEffect } from 'react';
import { couponApi } from '@/lib/api';
import Link from 'next/link';

interface ActiveCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
}

export default function PromotionsClient() {
  const [activeCoupons, setActiveCoupons] = useState<ActiveCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  useEffect(() => {
    // [2025-01-27 20:25:00] 获取活跃优惠券
    const loadCoupons = async () => {
      try {
        const result = await couponApi.getActive();
        setActiveCoupons(result.coupons);
      } catch (error) {
        console.error('Failed to load coupons:', error);
      } finally {
        setLoadingCoupons(false);
      }
    };

    loadCoupons();
  }, []);

  const formatDiscount = (coupon: ActiveCoupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    } else {
      return `$${coupon.value.toFixed(2)} OFF`;
    }
  };

  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px' }}>
      <header style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <h1>Current Promotions</h1>
        <p>
          Save on custom merch with bundled pricing, seasonal offers, and exclusive partner perks. All
          promotions include our standard free shipping and 100% satisfaction guarantee.
        </p>
      </header>

      {/* [2025-01-27 20:25:00] 活跃优惠券展示 */}
      {loadingCoupons ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading promotions...
        </div>
      ) : activeCoupons.length > 0 ? (
        <section style={{ display: 'grid', gap: '20px' }}>
          <h2>Active Coupon Codes</h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {activeCoupons.map((coupon) => (
              <article
                key={coupon.id}
                style={{
                  border: '2px solid #e3f2fd',
                  borderRadius: '12px',
                  padding: '24px',
                  background: '#f8f9fa',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#2196f3',
                    color: 'white',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '0 0 0 8px',
                  }}
                >
                  {formatDiscount(coupon)}
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <code
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#2196f3',
                        background: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        letterSpacing: '2px',
                      }}
                    >
                      {coupon.code}
                    </code>
                  </div>
                  {coupon.minOrderValue && (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '8px 0' }}>
                      Minimum order: ${coupon.minOrderValue.toFixed(2)}
                    </p>
                  )}
                  {coupon.maxDiscount && coupon.type === 'percentage' && (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '8px 0' }}>
                      Maximum discount: ${coupon.maxDiscount.toFixed(2)}
                    </p>
                  )}
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '8px 0' }}>
                    Valid until: {new Date(coupon.endDate).toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <Link
                    href="/cart"
                    style={{
                      display: 'inline-block',
                      marginTop: '12px',
                      padding: '10px 20px',
                      background: '#2196f3',
                      color: 'white',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    Use This Code →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* [2025-01-27 20:25:00] 促销活动 */}
      <section style={{ display: 'grid', gap: '20px' }}>
        <h2>Special Offers</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>📦</span>
              Team Pack Bundle
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>
              Order 50+ items and unlock tiered discounts up to 20% off apparel and drinkware.
            </p>
            <ul style={{ color: '#6b7280', marginLeft: '20px', marginBottom: '12px' }}>
              <li>50-99 items: 10% off</li>
              <li>100-249 items: 15% off</li>
              <li>250+ items: 20% off</li>
            </ul>
            <Link href="/products" style={{ color: '#2196f3', fontWeight: 600 }}>
              Shop Now →
            </Link>
          </article>
          
          <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>❤️</span>
              Nonprofit Pricing
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>
              Eligible nonprofits receive an automatic 10% discount—contact support to activate your account.
            </p>
            <Link href="/contact" style={{ color: '#2196f3', fontWeight: 600 }}>
              Contact Us →
            </Link>
          </article>
          
          <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>🎁</span>
              Refer & Save
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>
              Refer a new customer and both of you receive $50 off your next custom merch project.
            </p>
            <Link href="/contact" style={{ color: '#2196f3', fontWeight: 600 }}>
              Learn More →
            </Link>
          </article>
        </div>
      </section>

      {/* [2025-01-27 20:25:00] 提示信息 */}
      <section
        style={{
          background: '#e3f2fd',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #90caf9',
        }}
      >
        <p style={{ margin: 0, color: '#1565c0' }}>
          <strong>💡 Tip:</strong> Coupon codes can be applied at checkout. Make sure to enter the code exactly
          as shown. Some offers may have minimum order requirements or expiration dates.
        </p>
      </section>
    </section>
  );
}

