/**
 * Design Lab Canvas Ready Stage
 * [2025-01-30 23:30:00] Design Lab 4.0: Canvas Ready 阶段
 * 
 * 职责：
 * - 动态导入 Fabric.js
 * - 初始化 Fabric Canvas 实例
 * - 配置画布属性（尺寸、DPI、缩放）
 * - 加载产品背景图
 * - 恢复设计数据到画布（如果存在）
 * - 绑定画布事件（选择、拖拽、缩放等）
 */

'use client';

import { useEffect, useState, ReactNode, useRef } from 'react';
import { canvasEngine, CanvasEventType } from '@/design/canvas/engine';

interface CanvasReadyStageProps {
  children: ReactNode | ((canvas: any) => ReactNode);
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onCanvasReady?: (canvas: any) => void;
  /** 产品图片加载选项 [2025-01-30 20:30:00] */
  productImageOptions?: {
    colorName?: string | null;
    view: 'front' | 'back' | 'sleeve';
    useAPI?: boolean;
  };
  /** Git SHA [2025-01-30 20:30:00] */
  gitSha?: string;
}

export function CanvasReadyStage({ 
  children, 
  canvasRef, 
  onCanvasReady,
  productImageOptions,
  gitSha,
}: CanvasReadyStageProps) {
  const [canvasStatus, setCanvasStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);
  const fabricModuleRef = useRef<any>(null);

  useEffect(() => {
    const initCanvas = async () => {
      if (!canvasRef.current) {
        console.warn('[Canvas Ready Stage] Canvas ref not available');
        return;
      }

      try {
        // 1. 动态导入 Fabric.js
        if (!fabricModuleRef.current) {
          const fabric = await import('fabric');
          fabricModuleRef.current = fabric.fabric;
        }

        // 2. 初始化画布引擎（可选加载产品主图）
        await canvasEngine.initialize(canvasRef.current, fabricModuleRef.current, {
          loadProductImage: !!productImageOptions,
          productImageOptions,
          gitSha,
        });

        // 3. 监听画布就绪事件
        canvasEngine.on(CanvasEventType.READY, (event) => {
          const canvas = canvasEngine.getCanvas();
          if (canvas && onCanvasReady) {
            onCanvasReady(canvas);
          }
          setCanvasStatus('ready');
        });

        // 4. 监听错误事件
        canvasEngine.on(CanvasEventType.ERROR, (event) => {
          console.error('[Canvas Ready Stage] 画布初始化错误:', event.payload);
          setError(event.payload?.error || new Error('Canvas initialization failed'));
          setCanvasStatus('error');
        });

      } catch (err) {
        console.error('[Canvas Ready Stage] 画布初始化失败:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setCanvasStatus('error');
      }
    };

    initCanvas();

    return () => {
      // 清理资源
      canvasEngine.dispose();
    };
  }, [canvasRef, onCanvasReady]);

  if (canvasStatus === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        background: '#f5f5f5' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
            Initializing canvas...
          </div>
        </div>
      </div>
    );
  }

  if (canvasStatus === 'error') {
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
            Canvas Initialization Error
          </h1>
          <p style={{ color: '#52606d', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {error?.message || '画布初始化失败，请刷新页面重试。'}
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
              fontSize: '1rem',
              marginRight: '1rem'
            }}
          >
            Reload Page
          </button>
          <button
            onClick={() => setCanvasStatus('loading')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

