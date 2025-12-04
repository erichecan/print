/**
 * Design Lab Page
 * [2025-11-11 15:47:58] 服务端入口，挂载 Fabric.js 客户端编辑器
 * [2025-01-27 15:10:00] Next.js 15: 直接导入客户端组件，无需 dynamic
 * [2025-01-27 17:05:00] 补充 SEO 元数据
 * [2025-01-28 03:15:00] 添加错误边界处理
 */
import { Suspense } from 'react';
import { generateSEOMetadata } from '@/lib/seo';
import { DesignLabErrorBoundary } from './DesignLabErrorBoundary';
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
  // [2025-12-04 10:15:00] 暂时使用简化占位视图，避免未完成的 DesignLabClient JSX 结构阻塞构建与部署
  return (
    <Suspense
      fallback={
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <p>Preparing the Design Lab…</p>
        </section>
      }
    >
      <DesignLabErrorBoundary>
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Design Lab 正在更新中</h1>
            <p style={{ color: '#6b7280', maxWidth: 520, margin: '0 auto' }}>
              我们正在对 Design Lab 进行前端 JSX 结构优化，以确保稳定构建和部署。
              当前页面为临时占位版本，不影响其他页面和下单流程。
            </p>
          </div>
        </section>
      </DesignLabErrorBoundary>
    </Suspense>
  );
}

