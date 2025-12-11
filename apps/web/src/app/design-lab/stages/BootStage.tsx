/**
 * Design Lab Boot Stage
 * [2025-01-30 23:30:00] Design Lab 4.0: Boot 阶段（超轻量、零业务）
 * 
 * 职责：
 * - 验证必需的环境变量（构建时 fail）
 * - 检测运行环境（浏览器/SSR/构建时）
 * - 挂载全局错误边界
 * - 渲染基础骨架 UI（无业务逻辑）
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';
import { validateEnvConfig } from '@/config/env';

interface BootStageProps {
  children: ReactNode;
}

export function BootStage({ children }: BootStageProps) {
  const [bootStatus, setBootStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // 验证环境变量配置
      validateEnvConfig();
      setBootStatus('ready');
    } catch (err) {
      console.error('[Boot Stage] 环境变量校验失败:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setBootStatus('error');
    }
  }, []);

  if (bootStatus === 'checking') {
    // [2025-01-30 17:40:00] 修复：移除 styled-jsx，使用纯内联样式
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        background: '#f5f5f5' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
            Initializing Design Lab...
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            margin: '0 auto' 
          }} />
        </div>
      </div>
    );
  }

  if (bootStatus === 'error') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        background: '#f5f5f5',
        padding: '2rem'
      }}>
        <div style={{ 
          maxWidth: '600px', 
          background: '#fff', 
          padding: '2rem', 
          borderRadius: '12px', 
          boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#ef4444' }}>
            Environment Configuration Error
          </h1>
          <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {error?.message || '环境变量配置错误，请检查配置后重试。'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

