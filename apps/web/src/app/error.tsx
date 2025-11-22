'use client';
// [2025-11-10 23:55:03] 自定义错误页面以避免构建阶段默认 _error 组件的 SSR 上下文问题

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', background: '#f9f9f9', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#1f2933' }}>出现错误</h1>
        <p style={{ color: '#52606d', lineHeight: 1.6 }}>
          我们在处理请求时遇到问题，请稍后再试。如果问题持续出现，请联系技术团队并提供错误摘要：
        </p>
        {error.digest && (
          <p style={{ marginTop: '1rem', fontFamily: 'monospace', background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', color: '#364152' }}>
            {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            background: '#ff1f3d',
            color: '#fff',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
      </div>
    </div>
  );
}

