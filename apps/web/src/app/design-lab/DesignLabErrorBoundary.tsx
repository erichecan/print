/**
 * Design Lab Error Boundary
 * [2025-01-28 03:50:00] 客户端错误边界组件，用于捕获 Design Lab 的错误
 */
'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function DesignLabErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Design Lab Error</h1>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              An error occurred while loading the Design Lab. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Refresh Page
            </button>
          </div>
        </section>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

