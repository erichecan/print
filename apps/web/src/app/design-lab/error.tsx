/**
 * Design Lab Error Page
 * [2025-01-30 21:15:00] Next.js 错误页面组件
 */
'use client';

export default function DesignLabError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ 
      display: 'grid', 
      placeItems: 'center', 
      minHeight: '60vh', 
      background: '#f9f9f9', 
      padding: '2rem' 
    }}>
      <div style={{ 
        maxWidth: '480px', 
        background: '#fff', 
        padding: '2rem', 
        borderRadius: '12px', 
        boxShadow: '0 12px 30px rgba(0,0,0,0.08)' 
      }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#1f2933' }}>
          Design Lab Error
        </h1>
        <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '1rem' }}>
          设计实验室加载时出现错误。请尝试刷新页面或返回首页。
        </p>
        {error.digest && (
          <p style={{ 
            marginTop: '1rem', 
            fontFamily: 'monospace', 
            background: '#f1f5f9', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            color: '#364152',
            fontSize: '0.875rem'
          }}>
            Error ID: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === 'development' && error.message && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#52606d' }}>Error Details (Development)</summary>
            <pre style={{ 
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '0.75rem',
              overflow: 'auto'
            }}>
              {error.message}
            </pre>
          </details>
        )}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              flex: 1,
              background: '#0066CC',
              color: '#fff',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            重试
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            style={{
              flex: 1,
              background: '#f1f5f9',
              color: '#364152',
              border: '1px solid #e2e8f0',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}

