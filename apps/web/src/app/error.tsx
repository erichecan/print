'use client';
// [2025-11-10 23:55:03] 自定义错误页面以避免构建阶段默认 _error 组件的 SSR 上下文问题
// [2025-12-09 14:45:00] 增强错误追踪和日志关联功能

import { useEffect, useState } from 'react';
import { logServerError, getErrorLogInfo } from '@/lib/error-tracking';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [logInfo, setLogInfo] = useState<ReturnType<typeof getErrorLogInfo>>({});

  useEffect(() => {
    // 记录错误并获取追踪信息
    const traceId = logServerError(error, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    const info = getErrorLogInfo(error, traceId);
    setLogInfo(info);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', background: '#f9f9f9', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#1f2933' }}>出现错误</h1>
        <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '1rem' }}>
          我们在处理请求时遇到问题，请稍后再试。如果问题持续出现，请联系技术团队。
        </p>

        {/* 开发环境显示详细错误信息 */}
        {isDevelopment && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee', borderRadius: '8px', border: '1px solid #fcc' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#c00' }}>开发环境错误详情：</p>
            <pre style={{ fontSize: '0.875rem', overflow: 'auto', color: '#333' }}>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        {/* 错误追踪信息 */}
        {(error.digest || logInfo.traceId) && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#364152' }}>错误追踪信息：</p>
            {error.digest && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#52606d' }}>Digest:</span>
                <code style={{ marginLeft: '0.5rem', fontFamily: 'monospace', color: '#364152' }}>{error.digest}</code>
              </div>
            )}
            {logInfo.traceId && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#52606d' }}>Trace ID:</span>
                <code style={{ marginLeft: '0.5rem', fontFamily: 'monospace', color: '#364152' }}>{logInfo.traceId}</code>
              </div>
            )}
            {logInfo.consoleLink && (
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={logInfo.consoleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  在 GCP 控制台查看日志 →
                </a>
              </div>
            )}
          </div>
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
            fontWeight: 'bold',
          }}
        >
          重试
        </button>
      </div>
    </div>
  );
}

