/**
 * Offline Order Size Fees Management Page
 * [2025-12-07 05:45:00] 线下订单尺码费用管理页面
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';

interface SizeFee {
  id: string;
  size: string;
  additionalFee: number;
}

const ALLOWED_SIZES = ['2XL', '3XL', '4XL', '5XL'];

export default function OfflineOrderSizeFeesPage() {
  const [sizeFees, setSizeFees] = useState<SizeFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState('');

  const { data, error, mutate } = useSWR('/api/proxy/admin/offline-order-size-fees', async (url) => {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch size fees');
    return response.json();
  });

  useEffect(() => {
    if (data?.data) {
      setSizeFees(data.data);
      setLoading(false);
    }
  }, [data]);

  const handleUpdate = async (id: string, size: string, fee: number) => {
    try {
      await api(`/api/proxy/admin/offline-order-size-fees/${id}`, {
        method: 'PATCH',
        body: { size, additionalFee: fee },
      });
      setEditingId(null);
      mutate();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  const handleBatchUpdate = async () => {
    const updates = sizeFees.map((sf) => ({
      id: sf.id,
      size: sf.size,
      additionalFee: parseFloat(editFee) || 0,
    }));

    try {
      await api('/api/proxy/admin/offline-order-size-fees', {
        method: 'PATCH',
        body: { sizeFees: updates },
      });
      mutate();
    } catch (err: any) {
      alert(err.message || '批量更新失败');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>加载中...</div>;
  if (error) return <div style={{ padding: '2rem' }}>加载失败: {error.message}</div>;

  // 确保所有尺码都有配置
  const allSizeFees = ALLOWED_SIZES.map((size) => {
    const existing = sizeFees.find((sf) => sf.size === size);
    return existing || { id: '', size, additionalFee: 0 };
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>线下订单尺码费用配置</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>配置大尺码（2XL-5XL）的额外费用</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>尺码</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>额外费用 (CAD)</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {allSizeFees.map((sf) => (
            <tr key={sf.size} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>{sf.size}</td>
              <td style={{ padding: '0.75rem' }}>
                {editingId === sf.id ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFee}
                    onChange={(e) => setEditFee(e.target.value)}
                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd', width: '120px' }}
                  />
                ) : (
                  `$${sf.additionalFee.toFixed(2)}`
                )}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                {editingId === sf.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleUpdate(sf.id, sf.size, parseFloat(editFee) || 0)}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer' }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(sf.id);
                      setEditFee(sf.additionalFee.toString());
                    }}
                    style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                  >
                    编辑
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

