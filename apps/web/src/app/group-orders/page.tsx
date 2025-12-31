/**
 * Group Order Form Page
* 使用 frontend-design 设计 Group Order Form 页面，参考 Custom Ink
 */
import { generateSEOMetadata } from '@/lib/seo';
import { GroupOrderFormClient } from './GroupOrderFormClient';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Group Orders Made Easy - Collect Sizes & Payments Online',
  description: 'Easily collect sizes and payments with our online Group Order Form. Let everyone place their own orders, find sizes, and pay for items.',
  keywords: ['group orders', 'bulk orders', 'team orders', 'custom apparel', 'group ordering'],
  url: 'https://suvernireplus.com/group-orders',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

export default function GroupOrderFormPage() {
  return <GroupOrderFormClient />;
}

