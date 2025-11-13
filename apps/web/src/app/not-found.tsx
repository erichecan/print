'use client';
// [2025-11-10 23:55:03] 自定义 404 页面以避免默认 _error 组件触发 SSR useContext 异常

import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <html lang="en">
      <body style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 700 }}>404</h1>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8 }}>
            很抱歉，你访问的页面不存在。请检查链接是否正确，或者返回首页继续浏览。
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '2rem',
              background: '#ff1f3d',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            返回首页
          </Link>
        </div>
      </body>
    </html>
  );
}

