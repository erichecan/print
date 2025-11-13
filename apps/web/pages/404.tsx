// [2025-11-11 06:04:29] 自定义 Pages Router 404 页面以替换默认实现

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>页面未找到</h1>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.8 }}>
          你访问的地址不存在。请检查链接是否正确，或者返回首页继续浏览。
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
    </div>
  );
}




