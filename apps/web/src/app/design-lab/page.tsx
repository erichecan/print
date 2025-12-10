/**
 * Design Lab Page
 * [2025-01-30 23:00:00] Design Lab 4.0: 服务端组件仅做数据拼装与可序列化返回
 */
import { Suspense } from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import DesignLabClient from './DesignLabClient';
import type { Metadata } from 'next';
import { getBackendApiBaseUrl } from '@/config/env';

// [2025-01-27 17:05:00] 生成 Design Lab 页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Design Lab - Online Custom Design Tool',
  description: 'Create custom designs for t-shirts, hoodies, and apparel with our professional online design tool. Upload artwork, add text, and preview your designs instantly.',
  keywords: ['design tool', 'custom design', 't-shirt designer', 'online editor', 'custom apparel designer', 'design lab'],
  url: 'https://suvernireplus.com/design-lab',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

/**
 * 服务端组件：仅做数据拼装与可序列化返回
 * [2025-01-30 23:00:00] Design Lab 4.0: 严格 RSC 边界，不包含客户端 API
 */
export default async function DesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; colorId?: string; designId?: string; variantId?: string }>;
}) {
  // [2025-01-30 23:00:00] Design Lab 4.0: 服务端预取产品数据（可选，不阻塞）
  const params = await searchParams;
  let initialProductData = null;
  
  if (params?.productId || params?.variantId) {
    try {
      const apiBaseUrl = getBackendApiBaseUrl();
      const productId = params.productId || (params.variantId ? undefined : null);
      const variantId = params.variantId;
      
      // 使用服务端 fetch，不依赖客户端 API
      if (variantId) {
        const response = await fetch(`${apiBaseUrl}/products/variant/${variantId}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          initialProductData = await response.json();
        }
      } else if (productId) {
        const response = await fetch(`${apiBaseUrl}/products/${productId}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          initialProductData = await response.json();
        }
      }
    } catch (error) {
      // 服务端预取失败不影响页面加载，客户端会重试
      console.warn('[Design Lab] 服务端预取产品数据失败:', error);
    }
  }

  return (
    <Suspense
      fallback={
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <p>Preparing the Design Lab…</p>
        </section>
      }
    >
      <DesignLabClient initialProductData={initialProductData} />
    </Suspense>
  );
}

