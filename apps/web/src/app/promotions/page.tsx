/**
 * Promotions Page
 * [2025-11-12 00:04:00] Migrated promo highlights from legacy static page
 * [2025-01-27 17:50:00] 补充 SEO 元数据
 * [2025-01-27 20:25:00] 添加活跃优惠券展示
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import PromotionsClient from './PromotionsClient';

// [2025-01-27 17:50:00] 生成促销页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Current Promotions & Special Offers',
  description: 'Save on custom merchandise with bundled pricing, seasonal offers, and exclusive discounts. Team packs, nonprofit pricing, and more.',
  keywords: ['promotions', 'discounts', 'special offers', 'deals', 'savings', 'bundles', 'team packs'],
  url: 'https://suvernireplus.com/promotions',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function PromotionsPage() {
  return <PromotionsClient />;
}

