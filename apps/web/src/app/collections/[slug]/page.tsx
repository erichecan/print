/**
 * Collection Detail Page
* TODO scaffold
* Fetches collection hero and product grid from backend
* 补充 SEO 元数据
 */

import Link from 'next/link';
import Image from 'next/image'; // 使用 Next Image 提升性能
import { notFound, redirect } from 'next/navigation';
// 修复：使用相对路径，通过 Next.js API 路由代理
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// 生成分类页面 SEO 元数据
// 注意：由于是客户端数据获取，这里使用基础元数据模板
// 修复：Next.js 15 中 params 可能是 Promise，需要 await
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> | { slug: string } }): Promise<Metadata> {
// 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const slug = resolvedParams.slug;
  const categoryName = slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return generateSEOMetadata({
    title: `${categoryName} - Custom Products Collection`,
    description: `Browse our ${categoryName} collection. Custom ${categoryName} with free shipping and satisfaction guarantee.`,
    keywords: [categoryName, 'custom products', 'custom merchandise', 'apparel', 'promotional products'],
    url: `https://suvernireplus.com/collections/${slug}`,
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

// 修复：使用相对路径，通过 Next.js API 路由代理
async function fetchCollection(slug: string) {
// 使用相对路径，通过 Next.js API 路由代理到后端
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

// 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为分类 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

// 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
// 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const { slug } = resolvedParams;
  
// 特殊处理：promotional-products 重定向到新的页面路由
  if (slug === 'promotional-products') {
    redirect('/promotional-products');
  }
  
  // 注意：由于这是静态导出，我们需要在客户端获取数据
  // 这里暂时返回空，实际数据获取在客户端组件中处理
  return <div>Collection: {slug}</div>;
}