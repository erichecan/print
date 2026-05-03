// 商品详情页面包装器
// 优化 SEO 元数据，从 API 获取实际产品信息 for Issue #154
import { ProductDetail } from '@/components/product/detail/ProductDetail';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import type { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/api-config';

// 从 API 获取产品信息用于 SEO 元数据 for Issue #154
async function getProductForSEO(slug: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
      next: { revalidate: 3600 }, // 缓存 1 小时
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Product SEO] Error fetching product:', error);
    return null;
  }
}

// 生成产品详情页基础 SEO 元数据
// 优化为从 API 获取实际产品信息 for Issue #154
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductForSEO(params.slug);

  if (product) {
    const productName = product.name || params.slug.replace(/-/g, ' ');
    const description = product.description || `Custom ${productName} - Design your own custom apparel. Free shipping, satisfaction guaranteed.`;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suvernireplus.com';
    const image = product.images?.[0]?.url || product.imageUrl || `${SITE_URL}/assets/hero/hero-card-tee.jpg`;
    const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;

    return generateSEOMetadata({
      title: productName,
      description: description.substring(0, 160),
      keywords: [
        productName.toLowerCase(),
        'custom apparel',
        'custom t-shirt',
        product.category?.name?.toLowerCase() || '',
        product.brand?.name?.toLowerCase() || '',
      ].filter(Boolean),
      url: `${SITE_URL}/products/${params.slug}`,
      image: fullImageUrl,
      type: 'article',
    });
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suvernireplus.com';
  return generateSEOMetadata({
    title: `${params.slug.replace(/-/g, ' ')} - Custom Merchandise`,
    description: 'View product details, pricing, and customization options. Add to cart and start designing your custom merchandise.',
    keywords: ['custom apparel', 'custom merchandise', 't-shirt', 'hoodie', 'promotional products'],
    url: `${SITE_URL}/products/${params.slug}`,
    image: `${SITE_URL}/assets/hero/hero-card-tee.jpg`,
    type: 'article',
  });
}

// 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  return [];
}

import { Suspense } from 'react';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suvernireplus.com';
  const productName = params.slug.replace(/-/g, ' ');
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Products', url: `${SITE_URL}/products` },
    { name: productName, url: `${SITE_URL}/products/${params.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Suspense fallback={<div className="container mx-auto p-8 text-center">Loading product...</div>}>
        <ProductDetail />
      </Suspense>
    </>
  );
}
