/**
 * Account Error Boundary
 * [2025-01-27 15:00:00] 账户页面错误边界组件
 */
'use client';

import { useEffect } from 'react';

interface AccountErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AccountError({ error, reset }: AccountErrorProps) {
  useEffect(() => {
    // [2025-01-27 15:00:00] 错误仅在控制台打印
    console.error('[Account] error:', error);
  }, [error]);

  return (
    <div style={{
      padding: '48px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '16px',
        color: '#1f2937',
      }}>
        出现错误
      </h2>
      <p style={{
        fontSize: '16px',
        color: '#666',
        marginBottom: '24px',
      }}>
        请稍后重试。如果问题持续，请联系支持团队。
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
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
    </div>
  );
}
