/**
 * Design Lab Config Stage
* Design Lab 4.0: Config 阶段
 * 
 * 职责：
 * - 加载静态配置（fonts/artwork 分类、images 白名单）
 * - 主题与全局样式
 * - i18n（如果使用）
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ConfigStageProps {
  children: ReactNode;
}

export function ConfigStage({ children }: ConfigStageProps) {
  const [configStatus, setConfigStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
// Design Lab 4.0: 加载静态配置
    // 这里可以加载字体分类、素材库分类等静态配置
    // 目前使用默认配置，失败不影响初始化
    try {
      // 配置加载逻辑（可以异步加载 JSON 文件）
      // 目前使用默认配置，所以直接标记为 ready
      setConfigStatus('ready');
    } catch (err) {
      console.warn('[Config Stage] 配置加载失败，使用默认配置:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // 配置加载失败不影响初始化，使用默认配置
      setConfigStatus('ready');
    }
  }, []);

  if (configStatus === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        background: '#f5f5f5' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
            Loading configuration...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

