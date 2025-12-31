/**
 * Promotions Page
* Migrated promo highlights from legacy static page
* 补充 SEO 元数据
* 添加活跃优惠券展示
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import PromotionsClient from './PromotionsClient';

// 生成促销页面 SEO 元数据
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

