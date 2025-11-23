/**
 * About Page
 * [2025-11-11 22:30:10] Scaffold
 * [2025-11-12 00:05:20] Ported mission, timeline, and team highlights from legacy static page
 * [2025-01-27 17:10:00] 补充 SEO 元数据
 * [2025-01-28 06:40:00] Updated to use CMS content via AboutClient component
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { AboutClient } from '@/components/about/AboutClient';

// [2025-01-27 17:10:00] 生成关于页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'About Us - Custom Merchandise Experts',
  description: 'Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create meaningful custom merchandise. Quality without compromise, on-time delivery.',
  keywords: ['about us', 'custom merchandise', 'custom apparel', 'team', 'company', 'mission'],
  url: 'https://suvernireplus.com/about',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function AboutPage() {
  return <AboutClient />;
}
