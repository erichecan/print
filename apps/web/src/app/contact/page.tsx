/**
 * Contact Page
* Scaffold
* Added support channels and response time details
* 补充 SEO 元数据
* 添加联系表单提交功能
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import ContactClient from './ContactClient';

// 生成联系页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Contact Us - Get Help with Your Order',
  description: 'Need help with an order, artwork, or shipping? Contact Suvernire Plus by phone, email, or live chat. Our merch specialists are available seven days a week.',
  keywords: ['contact', 'customer service', 'support', 'help', 'order support', 'customer care'],
  url: 'https://suvernireplus.com/contact',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function ContactPage() {
  return <ContactClient />;
}
