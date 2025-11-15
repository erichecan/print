/**
 * Promotions Page
 * [2025-11-12 00:04:00] Migrated promo highlights from legacy static page
 * [2025-01-27 17:50:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:50:00] 生成促销页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Current Promotions & Special Offers',
  description: 'Save on custom merchandise with bundled pricing, seasonal offers, and exclusive discounts. Team packs, nonprofit pricing, and more.',
  keywords: ['promotions', 'discounts', 'special offers', 'deals', 'savings', 'bundles', 'team packs'],
  url: 'https://suvernireplus.com/promotions',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function PromotionsPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px' }}>
      <h1>Current Promotions</h1>
      <p>
        Save on custom merch with bundled pricing, seasonal offers, and exclusive partner perks. All
        promotions include our standard free shipping and 100% satisfaction guarantee.
      </p>
      <div style={{ display: 'grid', gap: '16px' }}>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2>Team Pack Bundle</h2>
          <p>Order 50+ items and unlock tiered discounts up to 20% off apparel and drinkware.</p>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2>Nonprofit Pricing</h2>
          <p>
            Eligible nonprofits receive an automatic 10% discount—contact support to activate your account.
          </p>
        </article>
        <article style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2>Refer & Save</h2>
          <p>Refer a new customer and both of you receive $50 off your next custom merch project.</p>
        </article>
      </div>
    </section>
  );
}

