// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
// [2025-01-27 14:55:00] 移除 Suspense，简化结构以避免 Next.js 解析问题
// [2025-01-27 15:00:00] 添加 params 参数以满足 Next.js 静态导出要求
// [2025-01-27 18:00:00] 添加 SEO 元数据生成
import { ProductDetailContent } from './ProductDetailContent';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 18:00:00] 生成产品详情页基础 SEO 元数据
// 注意：由于是客户端数据获取，这里使用基础元数据模板
// 实际的动态 SEO 会在客户端组件中通过 document.title 更新
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return generateSEOMetadata({
    title: `Product Details - ${params.slug.replace(/-/g, ' ')}`,
    description: 'View product details, pricing, and customization options. Add to cart and start designing your custom merchandise.',
    keywords: ['product', 'custom merchandise', 't-shirt', 'hoodie', 'apparel'],
    url: `https://suvernireplus.com/products/${params.slug}`,
    image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
    type: 'product',
  });
}

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为产品 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  // [2025-11-14 05:48:45] Next.js 14: params 同步，仅用于满足静态导出要求
  // 实际 slug 仍由 ProductDetailContent 内部通过 useParams() 解析
  void params; // [2025-11-14 05:48:45] 明确使用以避免未使用警告
  return <ProductDetailContent />;
}
