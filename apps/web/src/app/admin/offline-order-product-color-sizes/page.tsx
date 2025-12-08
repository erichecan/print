/**
 * Offline Order Product-Color-Size Availability Management Page
 * [2025-12-07 05:45:00] 线下订单可用性配置页面
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';

interface AvailabilityConfig {
  id: string;
  productId: string;
  colorId: string;
  size: string;
  isAvailable: boolean;
  product?: { name: string };
  color?: { name: string };
}

export default function OfflineOrderProductColorSizesPage() {
  const [configs, setConfigs] = useState<AvailabilityConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const { data, error, mutate } = useSWR('/api/proxy/admin/offline-order-product-color-sizes', async (url) => {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch availability configs');
    return response.json();
  });

  useEffect(() => {
    if (data?.data) {
      setConfigs(data.data);
      setLoading(false);
    }
  }, [data]);

  const handleToggle = async (id: string, currentValue: boolean) => {
    try {
      await api(`/api/proxy/admin/offline-order-product-color-sizes/${id}`, {
        method: 'PATCH',
        body: { isAvailable: !currentValue },
      });
      mutate();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>加载中...</div>;
  if (error) return <div style={{ padding: '2rem' }}>加载失败: {error.message}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>线下订单可用性配置</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>配置产品-颜色-尺码组合的可用性</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>产品</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>颜色</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>尺码</th>
            <th style={{ padding: '0.75rem', textAlign: 'center' }}>可用性</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.75rem' }}>{config.product?.name || config.productId}</td>
              <td style={{ padding: '0.75rem' }}>{config.color?.name || config.colorId}</td>
              <td style={{ padding: '0.75rem' }}>{config.size}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: config.isAvailable ? '#ecfdf3' : '#fef2f2',
                    color: config.isAvailable ? '#15803d' : '#b91c1c',
                  }}
                >
                  {config.isAvailable ? '可用' : '不可用'}
                </span>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                <button
                  onClick={() => handleToggle(config.id, config.isAvailable)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: config.isAvailable ? '#ef4444' : '#10b981',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {config.isAvailable ? '设为不可用' : '设为可用'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {configs.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>暂无可用性配置</p>
      )}
    </div>
  );
}

