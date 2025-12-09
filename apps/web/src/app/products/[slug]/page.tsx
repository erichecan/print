// [2025-11-19 09:50:00] 商品详情页面包装器
// [2025-12-06 21:00:00] 优化 SEO 元数据，从 API 获取实际产品信息 for Issue #154
// [2025-12-09 23:50:00] 使用 safeFetch 和 cleanForSerialization
import { ProductDetail } from '@/components/product/detail/ProductDetail';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { safeFetch, HttpError, TimeoutError, NetworkError } from '@/lib/fetchers/safeFetch';
import { cleanForSerialization } from '@/lib/serialize';

// [2025-12-06 21:00:00] 从 API 获取产品信息用于 SEO 元数据 for Issue #154
// [2025-12-09 23:50:00] 使用 safeFetch 统一错误处理
async function getProductForSEO(slug: string) {
  try {
    // [2025-12-09] 在服务端组件中，使用相对路径通过 Next.js API 路由代理
    const apiUrl = `/api/products/${slug}`;
    
    // [2025-12-09 23:50:00] 使用 safeFetch 替代普通 fetch
    const product = await safeFetch<any>(apiUrl, {
      cache: 'no-store',
      next: { revalidate: 3600 }, // 缓存 1 小时
      timeout: 5000, // 5 秒超时
      retries: 1,
    });
    
    // [2025-12-09 23:50:00] 清理数据，确保可序列化
    return cleanForSerialization(product);
  } catch (error: unknown) {
    // [2025-12-09 23:50:00] 详细错误日志
    if (error instanceof HttpError) {
      console.warn('[Product SEO] HTTP error fetching product for SEO:', {
        slug,
        status: error.status,
        message: error.message,
      });
    } else if (error instanceof TimeoutError) {
      console.warn('[Product SEO] Timeout fetching product for SEO:', {
        slug,
        timeout: error.timeoutMs,
      });
    } else if (error instanceof NetworkError) {
      console.warn('[Product SEO] Network error fetching product for SEO:', {
        slug,
        message: error.message,
      });
    } else {
      console.error('[Product SEO] Unknown error fetching product:', {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return null;
  }
}

// [2025-11-19] 生成产品详情页基础 SEO 元数据
// [2025-12-06 21:00:00] 优化为从 API 获取实际产品信息 for Issue #154
// [2025-12-09 14:30:00] 修复：Next.js 15 中 params 可能是 Promise，需要 await
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> | { slug: string } }): Promise<Metadata> {
  // [2025-12-09 14:30:00] 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const slug = resolvedParams.slug;
  
  try {
    const product = await getProductForSEO(slug);
    
    if (product) {
      const productName = product.name || slug.replace(/-/g, ' ');
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
        url: `https://suvernireplus.com/products/${slug}`,
        image: fullImageUrl,
        type: 'article',
      });
    }
  } catch (error) {
    // [2025-12-09 14:30:00] 如果获取产品信息失败，使用默认元数据
    console.error('[Product SEO] Error in generateMetadata:', error);
  }
  
  // 回退到默认元数据
  return generateSEOMetadata({
    title: `商品详情 - ${slug.replace(/-/g, ' ')}`,
    description: '查看商品详情、价格和定制选项。添加到购物车并开始设计您的定制商品。',
    keywords: ['商品', '定制商品', 'T恤', '卫衣', '服装'],
    url: `https://suvernireplus.com/products/${slug}`,
    image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
    type: 'article',
  });
}

// [2025-11-19] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  return [];
}

// [2025-12-09 14:30:00] 修复：Next.js 15 中 params 可能是 Promise，需要 await
// [2025-12-09 23:50:00] 添加顶层错误处理，抛给 error.tsx
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  try {
    // [2025-12-09 14:30:00] 处理 params 可能是 Promise 的情况
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const slug = resolvedParams.slug;
    
    // [2025-12-09 23:50:00] 实际 slug 由 ProductDetail 组件内部通过 useParams 解析
    // ProductDetail 是客户端组件，在客户端获取数据，所以这里不需要传递数据
    return <ProductDetail />;
  } catch (error: unknown) {
    // [2025-12-09 23:50:00] 顶层错误处理，抛出错误给 error.tsx
    console.error('[ProductDetailPage] Error in page component:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // 抛出错误，让 Next.js 的 error.tsx 处理
  }
}
