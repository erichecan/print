/**
 * Products Page Error Boundary
 * [2025-12-09 14:45:00] 商品列表页错误处理
 */
'use client';

import { useEffect, useState } from 'react';
import { logServerError, getErrorLogInfo } from '@/lib/error-tracking';
import Link from 'next/link';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [logInfo, setLogInfo] = useState<ReturnType<typeof getErrorLogInfo>>({});

  useEffect(() => {
    const traceId = logServerError(error, {
      path: '/products',
    });
    const info = getErrorLogInfo(error, traceId);
    setLogInfo(info);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2933' }}>无法加载商品列表</h1>
        <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '2rem' }}>
          加载商品列表时出现问题，请稍后重试。
        </p>

        {isDevelopment && error.message && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fee', borderRadius: '8px' }}>
            <p style={{ color: '#c00' }}>{error.message}</p>
          </div>
        )}

        {error.digest && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f1f5f9', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.875rem', color: '#52606d' }}>
              <strong>错误摘要:</strong> <code>{error.digest}</code>
            </p>
            {logInfo.traceId && (
              <p style={{ fontSize: '0.875rem', color: '#52606d', marginTop: '0.5rem' }}>
                <strong>追踪 ID:</strong> <code>{logInfo.traceId}</code>
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ff1f3d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            重试
          </button>
          <Link
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f1f5f9',
              color: '#364152',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

