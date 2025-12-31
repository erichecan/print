/**
 * Canvas Loading Error Component
* Design Lab Canvas加载错误显示组件
 * 
 * 用途：
 * 1. 显示Canvas初始化失败的错误信息
 * 2. 提供重试功能
 * 3. 提供故障排查建议
 */
'use client';

import React from 'react';
import { ErrorState } from '@/components/ErrorState';

interface CanvasLoadingErrorProps {
  error: Error | string;
  onRetry?: () => void;
  showDetails?: boolean;
}

export function CanvasLoadingError({
  error,
  onRetry,
  showDetails = false,
}: CanvasLoadingErrorProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '600px',
      padding: '2rem',
    }}>
      <ErrorState
        title="设计画布加载失败"
        message="无法初始化设计画布。这可能是由于网络问题或浏览器兼容性问题导致的。"
        onRetry={onRetry}
        retryLabel="重试"
        showDetails={showDetails}
        details={errorStack || errorMessage}
      />
      
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '0.75rem',
          color: '#1f2937',
        }}>
          故障排查建议：
        </h3>
        <ul style={{
          listStyle: 'disc',
          paddingLeft: '1.5rem',
          color: '#6b7280',
          fontSize: '0.875rem',
          lineHeight: '1.75',
        }}>
          <li>检查网络连接是否正常</li>
          <li>尝试刷新页面（Ctrl+R 或 Cmd+R）</li>
          <li>清除浏览器缓存后重试</li>
          <li>如果问题持续，请尝试使用其他浏览器</li>
          <li>检查浏览器控制台是否有其他错误信息</li>
        </ul>
      </div>
    </div>
  );
}

