/**
 * Empty State Component
* 统一的空状态显示组件
 * 
 * 用途：
 * 1. 显示空列表、空搜索结果等
 * 2. 提供操作建议
 */
'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: string;
}

export function EmptyState({
  title,
  message,
  action,
  icon = '📦',
}: EmptyStateProps) {
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
        {icon}
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
        marginBottom: action ? '1.5rem' : '0',
        maxWidth: '500px',
      }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#B40C1C',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e3002b';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#B40C1C';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
