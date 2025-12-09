/**
 * Empty State Component
 * [2025-12-09] 统一的空状态显示组件
 */

'use client';

import React from 'react';

export interface EmptyStateProps {
  /** 标题 */
  title?: string;
  /** 描述信息 */
  description?: string;
  /** 图标（emoji 或 React 节点） */
  icon?: string | React.ReactNode;
  /** 操作按钮 */
  action?: React.ReactNode;
  /** 自定义样式类名 */
  className?: string;
  /** 最小高度（用于占位） */
  minHeight?: string;
}

/**
 * 统一的空状态组件
 * [2025-12-09] 用于显示列表为空、资源不存在等情况
 */
export function EmptyState({
  title = '暂无数据',
  description,
  icon = '📭',
  action,
  className = '',
  minHeight = '40vh',
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state ${className}`}
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {typeof icon === 'string' ? icon : icon}
      </div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#333',
          marginBottom: '8px',
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            fontSize: '14px',
            color: '#666',
            maxWidth: '500px',
            marginBottom: '24px',
            lineHeight: '1.5',
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
      <style jsx>{`
        .empty-state {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
      `}</style>
    </div>
  );
}

