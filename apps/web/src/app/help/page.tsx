/**
 * Help Center Page
* Scaffold
* Published quick links and FAQs
* 补充 SEO 元数据
* 完善帮助中心 - 添加更多 FAQ 和搜索功能
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import HelpClient from './HelpClient';

// 生成帮助中心页面 SEO 元数据
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
