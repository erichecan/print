/**
 * Design Lab Page
* Design Lab 4.0: 服务端组件仅做数据拼装与可序列化返回
 */
import { Suspense } from 'react';
import { generateSEOMetadata } from '@/lib/seo';
// 5.0 版本：临时切换到极简版本进行开发
import DesignLabRouter from './DesignLabRouter';
// import DesignLabClient from './DesignLabClient'; // 4.0 版本（已备份）
import type { Metadata } from 'next';
import { getBackendApiBaseUrl } from '@/config/env';

// 生成 Design Lab 页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Design Lab - Online Custom Design Tool',
  description: 'Create custom designs for t-shirts, hoodies, and apparel with our professional online design tool. Upload artwork, add text, and preview your designs instantly.',
  keywords: ['design tool', 'custom design', 't-shirt designer', 'online editor', 'custom apparel designer', 'design lab'],
  url: 'https://suvernireplus.com/design-lab',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

/**
 * 服务端组件：仅做数据拼装与可序列化返回
* Design Lab 4.0: 严格 RSC 边界，不包含客户端 API
 */
export default async function DesignLabPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; colorId?: string; designId?: string; variantId?: string; source?: string }>;
}) {
  // Design Lab 4.0: 服务端预取产品数据（可选，不阻塞）
  const params = await searchParams;
  let initialProductData = null;

  const apiBaseUrl = getBackendApiBaseUrl();

  if (params?.productId || params?.variantId) {
    try {
      const productId = params.productId || (params.variantId ? undefined : null);
      const variantId = params.variantId;

      // 使用服务端 fetch，不依赖客户端 API
      if (variantId) {
        const response = await fetch(`${apiBaseUrl}/products/variant/${variantId}`, {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          initialProductData = await response.json();
        }
      } else if (productId) {
        const response = await fetch(`${apiBaseUrl}/products/${productId}`, {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          initialProductData = await response.json();
        }
      }
    } catch (error) {
      // 服务端预取失败不影响页面加载，客户端会重试
      console.warn('[Design Lab] 服务端预取产品数据失败:', error);
    }
  } else {
    // 直接进入 Design Lab（无 URL 参数）：服务端预取默认产品，消除客户端 API 瀑布
    try {
      const slugRes = await fetch(`${apiBaseUrl}/products/design-lab-default-tee`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });
      if (slugRes.ok) {
        const slugData = await slugRes.json();
        const variants: any[] = slugData.variants || [];
        const whiteVariant = variants.find((v: any) => v.color?.toLowerCase() === 'white');
        const targetVariantId = (whiteVariant ?? variants[0])?.id;
        if (targetVariantId) {
          const variantRes = await fetch(`${apiBaseUrl}/products/variant/${targetVariantId}`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
          });
          if (variantRes.ok) {
            initialProductData = await variantRes.json();
          }
        }
      }
    } catch (error) {
      console.warn('[Design Lab] 服务端预取默认产品失败:', error);
    }
  }

  // Design Lab 4.0: 使用 layout 的分阶段初始化
  // layout.tsx 会自动处理 Boot/Config/Data Prefetch/Feature Hydration 阶段
  // 修复：DesignLabClient5.0 使用 useSearchParams()，必须用 Suspense 包裹
  return (
    <Suspense fallback={
      <section style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
            Preparing the Design Lab…
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            margin: '0 auto'
          }} />
        </div>
      </section>
    }>
      <DesignLabRouter initialProductData={initialProductData} />
    </Suspense>
  );
}
