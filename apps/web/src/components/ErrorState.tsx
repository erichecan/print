/**
 * Error State Component
 * [2025-01-30 12:00:00] 统一的错误状态显示组件
 * 
 * 用途：
 * 1. 显示API错误、网络错误等
 * 2. 提供重试功能
 * 3. 统一的错误UI样式
 */
'use client';

import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  showDetails?: boolean;
  details?: string;
}

export function ErrorState({
  title = '出现错误',
  message,
  onRetry,
  retryLabel = '重试',
  showDetails = false,
  details,
}: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      minHeight: '400px',
    }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '1rem',
      }}>
        ⚠️
      </div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: '#1f2937',
      }}>
        {title}
      </h2>
      <p style={{
        fontSize: '1rem',
        color: '#6b7280',
        marginBottom: '1.5rem',
        maxWidth: '500px',
      }}>
        {message}
      </p>
      {showDetails && details && (
        <details style={{
          marginBottom: '1.5rem',
          textAlign: 'left',
          maxWidth: '500px',
          width: '100%',
        }}>
          <summary style={{
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '0.875rem',
          }}>
            查看详细信息
          </summary>
          <pre style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '0.875rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {details}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ff1f3d',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e3002b';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#ff1f3d';
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
