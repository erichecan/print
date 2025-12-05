/**
 * Design Lab Page
 * [2025-11-11 15:47:58] 服务端入口，挂载 Fabric.js 客户端编辑器
 * [2025-01-27 15:10:00] Next.js 15: 直接导入客户端组件，无需 dynamic
 * [2025-01-27 17:05:00] 补充 SEO 元数据
 * [2025-01-28 03:15:00] 添加错误边界处理
 * [2025-01-30 20:30:00] 恢复使用 DesignLabClient 组件
 */
import { Suspense } from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import { DesignLabErrorBoundary } from './DesignLabErrorBoundary';
import DesignLabClient from './DesignLabClient';
import type { Metadata } from 'next';

// [2025-01-27 17:05:00] 生成 Design Lab 页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Design Lab - Online Custom Design Tool',
  description: 'Create custom designs for t-shirts, hoodies, and apparel with our professional online design tool. Upload artwork, add text, and preview your designs instantly.',
  keywords: ['design tool', 'custom design', 't-shirt designer', 'online editor', 'custom apparel designer', 'design lab'],
  url: 'https://suvernireplus.com/design-lab',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

export default function DesignLabPage() {
  // [2025-11-14 06:07:05] 使用 Suspense 包裹 DesignLabClient 以满足 useSearchParams 要求
  // [2025-01-28 03:15:00] 添加错误边界处理
  // [2025-01-30 20:30:00] 恢复使用 DesignLabClient 组件
  return (
    <Suspense
      fallback={
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <p>Preparing the Design Lab…</p>
        </section>
      }
    >
      <DesignLabErrorBoundary>
        <DesignLabClient />
      </DesignLabErrorBoundary>
    </Suspense>
  );
}

