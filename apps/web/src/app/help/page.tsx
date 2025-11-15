/**
 * Help Center Page
 * [2025-11-11 22:32:45] Scaffold
 * [2025-11-12 00:06:40] Published quick links and FAQs
 * [2025-01-27 17:20:00] 补充 SEO 元数据
 * [2025-01-27 19:25:00] 完善帮助中心 - 添加更多 FAQ 和搜索功能
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import HelpClient from './HelpClient';

// [2025-01-27 17:20:00] 生成帮助中心页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Help Center - FAQs & Support',
  description: 'Find answers to frequently asked questions about orders, shipping, returns, design lab, and more. Get help with your custom merchandise order.',
  keywords: ['help', 'FAQ', 'support', 'customer service', 'shipping', 'returns', 'order help'],
  url: 'https://suvernireplus.com/help',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function HelpPage() {
  return <HelpClient />;
}
