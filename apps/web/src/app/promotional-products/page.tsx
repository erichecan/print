/**
 * 促销产品页面
* 展示所有促销产品类别，参考 Custom Ink 的设计风格
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// 动态导入客户端组件
const PromotionalProductsClient = dynamic(
  () => import('./PromotionalProductsClient'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        padding: '80px 0', 
        textAlign: 'center',
        fontSize: '1.25rem',
        color: 'var(--color-text-muted)'
      }}>
        Loading promotional products...
      </div>
    )
  }
);

// 生成 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Promotional Products - Marketing Swag & Corporate Merch',
  description: 'Browse our wide selection of custom promotional products and marketing swag. Upload your logo or design your own promotional items. Perfect for trade shows, client gifts, and employee appreciation.',
  keywords: [
    'promotional products',
    'custom promotional items',
    'marketing swag',
    'corporate merchandise',
    'promotional gifts',
    'custom swag',
    'branded products',
    'promotional merchandise'
  ],
  url: 'https://suvernireplus.com/promotional-products',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

export default function PromotionalProductsPage() {
  return (
    <main>
      <PromotionalProductsClient />
    </main>
  );
}

