/**
 * Design Lab Data Prefetch Stage
* Design Lab 4.0: Data Prefetch 阶段
 * 
 * 职责：
 * - 从 URL 参数获取 productId、colorId、designId
 * - 加载产品信息（如果 productId 存在）
 * - 加载产品颜色列表（如果 productId 存在）
 * - 加载设计数据（如果 designId 存在）
 * - 获取用户会话（可选，不阻塞）
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { productsApi, designLabApi } from '@/lib/api';

interface DataPrefetchStageProps {
  children: ReactNode;
  initialProductData?: any;
}

export function DataPrefetchStage({ children, initialProductData }: DataPrefetchStageProps) {
  const searchParams = useSearchParams();
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [prefetchedData, setPrefetchedData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const productId = searchParams.get('productId');
        const variantId = searchParams.get('variantId');
        const colorId = searchParams.get('colorId');
        const designId = searchParams.get('designId');

        const data: any = {
          product: initialProductData || null,
          color: null,
          design: null,
        };

        // 如果服务端已预取产品数据，直接使用
        if (initialProductData) {
          data.product = initialProductData;
        } else if (productId || variantId) {
          // 客户端加载产品数据
          try {
            if (variantId) {
              data.product = await productsApi.getByVariant(variantId);
            } else if (productId) {
              data.product = await productsApi.getBySlug(productId);
            }
          } catch (err) {
            console.warn('[Data Prefetch Stage] 产品数据加载失败，使用默认产品:', err);
            // 使用默认产品，不阻塞初始化
          }
        }

        // 加载设计数据（如果存在）
        if (designId) {
          try {
            data.design = await designLabApi.getDesign(designId);
          } catch (err) {
            console.warn('[Data Prefetch Stage] 设计数据加载失败:', err);
            // 设计加载失败，创建空白设计
          }
        }

        setPrefetchedData(data);
        setDataStatus('ready');
      } catch (err) {
        console.error('[Data Prefetch Stage] 数据预取失败:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // 数据预取失败不影响初始化，使用默认数据
        setPrefetchedData(null);
        setDataStatus('ready');
      }
    };

    loadData();
  }, [searchParams, initialProductData]);

  if (dataStatus === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        background: '#f5f5f5' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
            Loading design data...
          </div>
        </div>
      </div>
    );
  }

  // 将预取的数据通过 context 或 props 传递给子组件
  // 目前直接渲染子组件，数据通过 DesignLabClient 的 props 传递
  return <>{children}</>;
}

