/**
 * Design Lab Page
 * [2025-11-11 15:47:58] 服务端入口，挂载 Fabric.js 客户端编辑器
 * [2025-01-27 15:10:00] Next.js 15: 直接导入客户端组件，无需 dynamic
 */
import { Suspense } from 'react';
import DesignLabClient from './DesignLabClient';

export default function DesignLabPage() {
  // [2025-11-14 06:07:05] 使用 Suspense 包裹 DesignLabClient 以满足 useSearchParams 要求
  return (
    <Suspense
      fallback={
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <p>Preparing the Design Lab…</p>
        </section>
      }
    >
      <DesignLabClient />
    </Suspense>
  );
}

