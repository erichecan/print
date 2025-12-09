/**
 * Error State Component
 * [2025-12-09] 统一的错误状态显示组件，支持重试
 */

'use client';

import React from 'react';

export interface ErrorStateProps {
  /** 错误消息 */
  error?: string | Error | null;
  /** 错误标题（可选） */
  title?: string;
  /** 是否可重试 */
  retryable?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 最小高度（用于占位） */
  minHeight?: string;
}

/**
 * 统一的错误状态组件
 * [2025-12-09] 用于显示 API 错误、网络错误等
 */
export function ErrorState({
  error,
  title = '出错了',
  retryable = true,
  onRetry,
  className = '',
  minHeight = '40vh',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : '发生未知错误，请稍后重试';

  return (
    <div
      className={`error-state ${className}`}
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#ef4444',
          marginBottom: '8px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: '#666',
          maxWidth: '500px',
          marginBottom: '24px',
          lineHeight: '1.5',
        }}
      >
        {errorMessage}
      </p>
      {retryable && onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#fff',
            backgroundColor: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
          }}
        >
          重试
        </button>
      )}
      <style jsx>{`
        .error-state {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
      `}</style>
    </div>
  );
}

