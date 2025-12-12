/**
 * Product Detail Error Boundary
 * [2025-01-27 19:25:00] 商品详情页错误处理，避免图片失败导致 500
 */
'use client';

import { useEffect } from 'react';
import { logServerError, getErrorLogInfo } from '@/lib/error-tracking';
import { reportServerError } from '@/server/telemetry';
import Link from 'next/link';

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // [2025-01-27 19:25:00] 记录错误并获取追踪信息
    const traceId = logServerError(error, {
      path: typeof window !== 'undefined' ? window.location.pathname : '/products/[slug]',
      method: 'GET',
    });
    
    // [2025-01-27 19:25:00] 上报错误到遥测服务
    reportServerError({
      digest: error.digest,
      traceId,
      route: '/products/[slug]',
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{ 
      display: 'grid', 
      placeItems: 'center', 
      minHeight: '60vh', 
      padding: '2rem',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2933' }}>
          无法加载商品详情
        </h1>
        <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '2rem' }}>
          加载商品详情时出现问题，可能是图片加载失败或网络错误。请稍后重试。
        </p>

        {isDevelopment && error.message && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: '#fee', 
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <p style={{ color: '#c00', margin: 0, fontSize: '0.875rem' }}>
              <strong>错误信息:</strong> {error.message}
            </p>
          </div>
        )}

        {error.digest && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            background: '#f1f5f9', 
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <p style={{ color: '#52606d', margin: '0 0 0.5rem 0' }}>
              <strong>错误摘要:</strong> <code style={{ background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{error.digest}</code>
            </p>
            <p style={{ color: '#52606d', margin: 0, fontSize: '0.75rem' }}>
              如果问题持续，请使用错误摘要联系支持团队。
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            重试
          </button>
          <Link
            href="/products"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f1f5f9',
              color: '#364152',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            返回商品列表
          </Link>
        </div>
      </div>
    </div>
  );
}
