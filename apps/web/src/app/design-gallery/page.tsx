/**
 * Design Gallery Page
* Migrated inspirational design grid from legacy static page
* 补充 SEO 元数据
* 添加社交媒体分享功能 for Issue #142
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import DesignGalleryClient from './DesignGalleryClient';

// 生成设计画廊页面 SEO 元数据
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

