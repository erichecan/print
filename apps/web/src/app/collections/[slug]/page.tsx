/**
 * Collection Detail Page
 * [2025-11-11 22:29:20] TODO scaffold
 * [2025-11-12 00:02:00] Fetches collection hero and product grid from backend
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:06:54] 使用 Next Image 提升性能
import { notFound } from 'next/navigation';
// [2025-11-15 11:20:00] 使用集中管理的 API 配置
import { API_BASE_URL } from '@/lib/api-config';

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

async function fetchCollection(slug: string) {
  const response = await fetch(`${API_BASE_URL}/collections/${slug}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load collection (${response.status})`);
  }

  return (await response.json()) as CollectionDetail;
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
  
  // 注意：由于这是静态导出，我们需要在客户端获取数据
  // 这里暂时返回空，实际数据获取在客户端组件中处理
  return <div>Collection: {slug}</div>;
}