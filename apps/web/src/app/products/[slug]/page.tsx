// [2025-11-19 09:50:00] 商品详情页面包装器
import { ProductDetail } from '@/components/product/detail/ProductDetail';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-11-19] 生成产品详情页基础 SEO 元数据
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return generateSEOMetadata({
    title: `商品详情 - ${params.slug.replace(/-/g, ' ')}`,
    description: '查看商品详情、价格和定制选项。添加到购物车并开始设计您的定制商品。',
    keywords: ['商品', '定制商品', 'T恤', '卫衣', '服装'],
    url: `https://suvernireplus.com/products/${params.slug}`,
    image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
    // [2025-11-19 08:05:00] Next.js Metadata 仅允许 article/website，防止 Invalid OpenGraph type 错误
    type: 'article',
  });
}

// [2025-11-19] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  return [];
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  void params; // 满足静态导出要求，实际 slug 由组件内部解析
  return <ProductDetail />;
}
