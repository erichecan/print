/**
 * Design Lab Layout
* Design Lab 4.0: Boot/Config/Data Prefetch/Canvas Ready/Feature Hydration 分阶段骨架
 */

import { Suspense } from 'react';
import { DesignLabErrorBoundary } from './DesignLabErrorBoundary';
import { BootStage } from './stages/BootStage';
import { ConfigStage } from './stages/ConfigStage';
import { DataPrefetchStage } from './stages/DataPrefetchStage';
import { FeatureHydrationStage } from './stages/FeatureHydrationStage';

export default function DesignLabLayout({ 
  children,
}: { 
  children: React.ReactNode;
}) {
// Design Lab 4.0: 分阶段初始化
  // CanvasReadyStage 将在 DesignLabClient 中处理，因为需要 canvas ref
  return (
    <DesignLabErrorBoundary>
      <Suspense fallback={<DesignLabSkeleton />}>
        <BootStage>
          <ConfigStage>
            <DataPrefetchStage>
              <FeatureHydrationStage>
                {children}
              </FeatureHydrationStage>
            </DataPrefetchStage>
          </ConfigStage>
        </BootStage>
      </Suspense>
    </DesignLabErrorBoundary>
  );
}

function DesignLabSkeleton() {
// 修复：移除 styled-jsx，使用纯内联样式（Server Component 兼容）
  return (
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
  );
}

