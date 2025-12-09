// [2025-11-19 09:50:00] 商品详情页面包装器
// [2025-12-06 21:00:00] 优化 SEO 元数据，从 API 获取实际产品信息 for Issue #154
import { ProductDetail } from '@/components/product/detail/ProductDetail';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
// [2025-12-09] 修复：不在模块顶层导入 API_BASE_URL，改为在函数内动态导入

// [2025-12-06 21:00:00] 从 API 获取产品信息用于 SEO 元数据 for Issue #154
// [2025-12-09] 修复：在服务端组件中正确获取 API_BASE_URL
async function getProductForSEO(slug: string) {
  try {
    // [2025-12-09] 在服务端组件中，使用 getApiBaseUrlValue 确保正确获取环境变量
    const { getApiBaseUrlValue } = await import('@/lib/api-config');
    const apiBaseUrl = getApiBaseUrlValue();
    
    const response = await fetch(`${apiBaseUrl}/products/${slug}`, {
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

// [2025-11-19] 生成产品详情页基础 SEO 元数据
// [2025-12-06 21:00:00] 优化为从 API 获取实际产品信息 for Issue #154
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductForSEO(params.slug);
  
  if (product) {
    const productName = product.name || params.slug.replace(/-/g, ' ');
    const description = product.description || `Custom ${productName} - Design your own custom apparel. Free shipping, satisfaction guaranteed.`;
    const image = product.images?.[0]?.url || product.imageUrl || 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg';
    const fullImageUrl = image.startsWith('http') ? image : `https://suvernireplus.com${image}`;
    
    return generateSEOMetadata({
      title: productName,
      description: description.substring(0, 160), // 限制描述长度
      keywords: [
        productName.toLowerCase(),
        'custom apparel',
        'custom t-shirt',
        product.category?.name?.toLowerCase() || '',
        product.brand?.name?.toLowerCase() || '',
      ].filter(Boolean),
      url: `https://suvernireplus.com/products/${params.slug}`,
      image: fullImageUrl,
      type: 'article',
    });
  }
  
  // 回退到默认元数据
  return generateSEOMetadata({
    title: `商品详情 - ${params.slug.replace(/-/g, ' ')}`,
    description: '查看商品详情、价格和定制选项。添加到购物车并开始设计您的定制商品。',
    keywords: ['商品', '定制商品', 'T恤', '卫衣', '服装'],
    url: `https://suvernireplus.com/products/${params.slug}`,
    image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
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
