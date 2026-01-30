/**
 * Offline Order Colors Management Page
* 线下订单颜色管理页面
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

interface Color {
  id: string;
  name: string;
  hexCode: string | null;
}

export default function OfflineOrderColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHex, setEditHex] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [colorToDelete, setColorToDelete] = useState<Color | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, mutate } = useSWR('/api/proxy/admin/offline-order-colors', async (url) => {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch colors');
    return response.json();
  });

  useEffect(() => {
    if (data?.data) {
      setColors(data.data);
      setLoading(false);
    }
  }, [data]);

  const handleCreate = async () => {
    if (!newColorName.trim()) return;
    try {
      await api('/api/proxy/admin/offline-order-colors', {
        method: 'POST',
        body: { name: newColorName.trim(), hexCode: newColorHex.trim() || null },
      });
      setNewColorName('');
      setNewColorHex('');
      mutate();
    } catch (err: any) {
      alert(err.message || '创建失败');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api(`/api/proxy/admin/offline-order-colors/${id}`, {
        method: 'PATCH',
        body: { name: editName.trim(), hexCode: editHex.trim() || null },
      });
      setEditingId(null);
      mutate();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  const handleDelete = (color: Color) => {
    setColorToDelete(color);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!colorToDelete) return;
    try {
      setIsDeleting(true);
      await api(`/api/proxy/admin/offline-order-colors/${colorToDelete.id}`, { method: 'DELETE' });
      setIsDeleteModalOpen(false);
      setColorToDelete(null);
      mutate();
    } catch (err: any) {
      alert(err.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>加载中...</div>;
  if (error) return <div style={{ padding: '2rem' }}>加载失败: {error.message}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>线下订单颜色管理</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
        <h2>添加新颜色</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="text"
            placeholder="颜色名称"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', flex: 1 }}
          />
          <input
            type="text"
            placeholder="十六进制颜色码（可选）"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '200px' }}
          />
          <button
            onClick={handleCreate}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
          >
            添加
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>颜色名称</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>颜色码</th>
            <th style={{ padding: '0.75rem', textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color) => (
            <tr key={color.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.75rem' }}>
                {editingId === color.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
                  />
                ) : (
                  color.name
                )}
              </td>
              <td style={{ padding: '0.75rem' }}>
                {editingId === color.id ? (
                  <input
                    type="text"
                    value={editHex}
                    onChange={(e) => setEditHex(e.target.value)}
                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {color.hexCode && (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          background: color.hexCode,
                          border: '1px solid #ddd',
                        }}
                      />
                    )}
                    {color.hexCode || '—'}
                  </div>
                )}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                {editingId === color.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleUpdate(color.id)}
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
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditingId(color.id);
                        setEditName(color.name);
                        setEditHex(color.hexCode || '');
                      }}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(color)}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer' }}
                    >
                      删除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {colors.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>暂无颜色配置</p>
      )}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="删除颜色"
        itemName={colorToDelete?.name}
        description="确定要删除这个颜色吗？此操作无法撤销。"
      />
    </div>
  );
}

