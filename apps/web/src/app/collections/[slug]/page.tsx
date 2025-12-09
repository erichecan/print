/**
 * Collection Detail Page
 * [2025-11-11 22:29:20] TODO scaffold
 * [2025-11-12 00:02:00] Fetches collection hero and product grid from backend
 * [2025-01-27 18:05:00] 补充 SEO 元数据
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:06:54] 使用 Next Image 提升性能
import { notFound, redirect } from 'next/navigation';
// [2025-12-09] 修复：使用相对路径，通过 Next.js API 路由代理
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 18:05:00] 生成分类页面 SEO 元数据
// 注意：由于是客户端数据获取，这里使用基础元数据模板
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const categoryName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return generateSEOMetadata({
    title: `${categoryName} - Custom Products Collection`,
    description: `Browse our ${categoryName} collection. Custom ${categoryName} with free shipping and satisfaction guarantee.`,
    keywords: [categoryName, 'custom products', 'custom merchandise', 'apparel', 'promotional products'],
    url: `https://suvernireplus.com/collections/${params.slug}`,
    image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
  });
}

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price?: number;
  basePrice?: number;
  primaryImage?: {
    url: string | null;
    alt: string | null;
  };
};

type CollectionDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  heroImage?: {
    url: string | null;
    alt: string | null;
  };
  products?: ProductListItem[];
};

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

// [2025-12-09] 修复：使用相对路径，通过 Next.js API 路由代理
async function fetchCollection(slug: string) {
  // [2025-12-09] 使用相对路径，通过 Next.js API 路由代理到后端
  // 这样可以确保在服务端组件中正确获取数据，避免环境变量问题
  const apiUrl = `/api/collections/${slug}`;
  
  try {
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CollectionPage] Failed to fetch collection:', {
        slug,
        status: response.status,
        error: errorText.substring(0, 200),
      });
      throw new Error(`Failed to load collection (${response.status})`);
    }

    return (await response.json()) as CollectionDetail;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CollectionPage] Error fetching collection:', {
      slug,
      error: errorMessage,
    });
    throw error;
  }
}

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为分类 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  // [2025-01-27 15:55:00] Next.js 14: params 是同步的
  const { slug } = params;
  
  // [2025-01-30 12:00:00] 特殊处理：promotional-products 重定向到新的页面路由
  if (slug === 'promotional-products') {
    redirect('/promotional-products');
  }
  
  // 注意：由于这是静态导出，我们需要在客户端获取数据
  // 这里暂时返回空，实际数据获取在客户端组件中处理
  return <div>Collection: {slug}</div>;
}