/**
 * Offline Order Size Fees Management Page
 * 线下订单尺码费用管理页面
 * [2026-01-06] 重构：支持完整的CRUD功能，包括添加、编辑、删除、排序
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminOfflineOrdersApi, OfflineOrderSizeFee } from '@/lib/api';

interface SizeFeeEditState {
  id: string | null;
  size: string;
  sizeType: 'Youth' | 'Adult' | 'Other';
  additionalFee: string;
  displayOrder: string;
  isActive: boolean;
}

export default function OfflineOrderSizeFeesPage() {
  const [sizeFees, setSizeFees] = useState<OfflineOrderSizeFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Youth' | 'Adult' | 'Other'>('All');
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string>('');

  const [editForm, setEditForm] = useState<SizeFeeEditState>({
    id: null,
    size: '',
    sizeType: 'Adult',
    additionalFee: '0',
    displayOrder: '0',
    isActive: true,
  });

  const { data, error: fetchError, mutate } = useSWR(
    '/api/proxy/admin/offline-order-size-fees',
    async () => {
      const response = await adminOfflineOrdersApi.getSizeFees();
      return response;
    }
  );

  useEffect(() => {
    if (data?.data) {
      setSizeFees(data.data);
      setLoading(false);
    }
    if (fetchError) {
      setError(fetchError.message || '加载失败');
      setLoading(false);
    }
  }, [data, fetchError]);

  const handleStartEdit = (sizeFee: OfflineOrderSizeFee) => {
    setEditingId(sizeFee.id || null);
    setEditForm({
      id: sizeFee.id,
      size: sizeFee.size,
      sizeType: sizeFee.sizeType || 'Adult',
      additionalFee: sizeFee.additionalFee.toString(),
      displayOrder: (sizeFee.displayOrder || 0).toString(),
      isActive: sizeFee.isActive !== false,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      id: null,
      size: '',
      sizeType: 'Adult',
      additionalFee: '0',
      displayOrder: '0',
      isActive: true,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      setError('');
      await adminOfflineOrdersApi.updateSizeFee(editingId, {
        size: editForm.size.trim(),
        sizeType: editForm.sizeType,
        additionalFee: parseFloat(editForm.additionalFee) || 0,
        displayOrder: parseInt(editForm.displayOrder, 10) || 0,
        isActive: editForm.isActive,
      });
      setEditingId(null);
      mutate();
    } catch (err: any) {
      setError(err.message || '更新失败');
    }
  };

  const handleCreate = async () => {
    if (!editForm.size.trim()) {
      setError('尺码名称不能为空');
      return;
    }

    try {
      setError('');
      await adminOfflineOrdersApi.createSizeFee({
        size: editForm.size.trim(),
        sizeType: editForm.sizeType,
        additionalFee: parseFloat(editForm.additionalFee) || 0,
        displayOrder: parseInt(editForm.displayOrder, 10) || 0,
        isActive: editForm.isActive,
      });
      setShowAddForm(false);
      setEditForm({
        id: null,
        size: '',
        sizeType: 'Adult',
        additionalFee: '0',
        displayOrder: '0',
        isActive: true,
      });
      mutate();
    } catch (err: any) {
      setError(err.message || '创建失败');
    }
  };

  const handleDelete = async (id: string, size: string) => {
    if (!confirm(`确定要删除尺码 "${size}" 吗？`)) {
      return;
    }

    try {
      setError('');
      await adminOfflineOrdersApi.deleteSizeFee(id);
      mutate();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  // 过滤和排序尺码
  const filteredSizeFees = sizeFees
    .filter((sf) => {
      if (!showInactive && !sf.isActive) return false;
      if (filterType !== 'All' && sf.sizeType !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.size.localeCompare(b.size);
    });

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          线下订单尺码费用配置
        </h1>
        <p style={{ color: '#6b7280' }}>
          管理所有尺码的名称、类型、费用和显示顺序
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '0.375rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* 操作栏 */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditForm({
              id: null,
              size: '',
              sizeType: 'Adult',
              additionalFee: '0',
              displayOrder: '0',
              isActive: true,
            });
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: '#10b981',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          + 添加新尺码
        </button>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
          }}
        >
          <option value="All">所有类型</option>
          <option value="Youth">Youth（童装）</option>
          <option value="Adult">Adult（成人）</option>
          <option value="Other">Other（其他）</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span>显示已停用</span>
        </label>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div
          style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          }}
        >
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>添加新尺码</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                尺码名称 *
              </label>
              <input
                type="text"
                value={editForm.size}
                onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                placeholder="例如: 6XL"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                类型
              </label>
              <select
                value={editForm.sizeType}
                onChange={(e) => setEditForm({ ...editForm, sizeType: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                }}
              >
                <option value="Adult">Adult（成人）</option>
                <option value="Youth">Youth（童装）</option>
                <option value="Other">Other（其他）</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                额外费用 (CAD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.additionalFee}
                onChange={(e) => setEditForm({ ...editForm, additionalFee: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                显示顺序
              </label>
              <input
                type="number"
                min="0"
                value={editForm.displayOrder}
                onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <span>启用</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCreate}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              创建
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditForm({
                  id: null,
                  size: '',
                  sizeType: 'Adult',
                  additionalFee: '0',
                  displayOrder: '0',
                  isActive: true,
                });
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 尺码列表表格 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>尺码</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>类型</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>额外费用 (CAD)</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>显示顺序</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>状态</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSizeFees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  没有找到尺码配置
                </td>
              </tr>
            ) : (
              filteredSizeFees.map((sf) => {
                const isEditing = editingId === sf.id;
                return (
                  <tr
                    key={sf.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: !sf.isActive ? '#fef2f2' : 'white',
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.size}
                          onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #d1d5db',
                            width: '100px',
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: '600' }}>{sf.size}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <select
                          value={editForm.sizeType}
                          onChange={(e) => setEditForm({ ...editForm, sizeType: e.target.value as any })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #d1d5db',
                          }}
                        >
                          <option value="Adult">Adult</option>
                          <option value="Youth">Youth</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <span>{sf.sizeType || 'Adult'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.additionalFee}
                          onChange={(e) => setEditForm({ ...editForm, additionalFee: e.target.value })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #d1d5db',
                            width: '100px',
                          }}
                        />
                      ) : (
                        <span>${sf.additionalFee.toFixed(2)}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editForm.displayOrder}
                          onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #d1d5db',
                            width: '80px',
                          }}
                        />
                      ) : (
                        <span>{sf.displayOrder || 0}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        />
                      ) : (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            backgroundColor: sf.isActive ? '#d1fae5' : '#fee2e2',
                            color: sf.isActive ? '#065f46' : '#991b1b',
                            fontSize: '0.875rem',
                          }}
                        >
                          {sf.isActive ? '启用' : '停用'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              border: 'none',
                              background: '#10b981',
                              color: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db',
                              background: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleStartEdit(sf)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              border: '1px solid #d1d5db',
                              background: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            编辑
                          </button>
                          {sf.id && (
                            <button
                              onClick={() => handleDelete(sf.id!, sf.size)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                border: '1px solid #fca5a5',
                                background: 'white',
                                color: '#dc2626',
                                cursor: 'pointer',
                              }}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
