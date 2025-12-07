/**
 * Design Gallery Page
 * [2025-11-12 00:04:20] Migrated inspirational design grid from legacy static page
 * [2025-01-27 17:55:00] 补充 SEO 元数据
 * [2025-12-06 20:00:00] 添加社交媒体分享功能 for Issue #142
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import DesignGalleryClient from './DesignGalleryClient';

// [2025-01-27 17:55:00] 生成设计画廊页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Design Gallery - Custom Design Inspiration',
  description: 'Browse our design gallery for inspiration. See custom t-shirt designs, hoodies, promotional products, and creative merchandise ideas.',
  keywords: ['design gallery', 'design inspiration', 'custom designs', 'design ideas', 'creative designs', 'merchandise designs'],
  url: 'https://suvernireplus.com/design-gallery',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function DesignGalleryPage() {
  return <DesignGalleryClient />;
}

