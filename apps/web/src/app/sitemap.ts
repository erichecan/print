/**
 * Sitemap generation for SEO
 * [2025-12-01 12:45:00] 实现动态 sitemap.xml，包含所有主要页面 URL
 * [2025-12-06 21:00:00] 添加动态产品页面 for Issue #154
 */
import { MetadataRoute } from 'next';
import { API_BASE_URL } from '@/lib/api-config';

// [2025-12-01 12:45:00] 获取站点基础 URL
function getSiteUrl(): string {
  // 优先使用环境变量
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/+$/, ''); // 移除末尾斜杠
  }
  
  // SSR/构建时回退
  return 'https://suvernireplus.com';
}

// [2025-12-06 21:00:00] 获取所有产品用于动态 sitemap for Issue #154
async function getAllProducts(): Promise<Array<{ slug: string; updatedAt?: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/products?limit=1000&includeOutOfStock=false`, {
      next: { revalidate: 3600 }, // 缓存 1 小时
    });
    
    if (!response.ok) {
      console.error('[Sitemap] Failed to fetch products:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return (data.data || data || []).map((product: any) => ({
      slug: product.slug,
      updatedAt: product.updatedAt || product.updated_at,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching products:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();
  
  // [2025-12-01 12:45:00] 核心静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/design-lab`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/promotions`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/design-gallery`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/shipping-info`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/size-guide`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
  
  // [2025-12-06 21:00:00] 动态添加产品页面 for Issue #154
  const products = await getAllProducts();
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  
  return [...staticPages, ...productPages];
}

