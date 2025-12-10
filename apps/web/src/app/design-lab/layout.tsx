/**
 * Design Lab Layout
 * [2025-01-30 23:30:00] Design Lab 4.0: Boot/Config/Data Prefetch/Canvas Ready/Feature Hydration 分阶段骨架
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
  // [2025-01-30 23:30:00] Design Lab 4.0: 分阶段初始化
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
          animation: 'spin 1s linear infinite', 
          margin: '0 auto' 
        }} />
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

