'use client';

/**
 * Admin Suppliers Page
* Supplier management and inventory sync monitoring for Issue #89
 */
import { useState } from 'react';
import useSWR from 'swr';
import { suppliersApi, Supplier, InventorySync } from '@/lib/api';

export default function AdminSuppliersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSyncHistory, setShowSyncHistory] = useState<string | null>(null);

  const { data: statusData, mutate: mutateStatus } = useSWR('suppliers-sync-status', () => suppliersApi.getSyncStatus());
  const suppliers = statusData?.suppliers || [];

  const handleSync = async (supplierId: string, force = false) => {
    // Confirm dialog removed per user request
    // if (!confirm(`确定要${force ? '强制' : ''}同步库存吗？`)) {
    //   return;
    // }

    try {
      const result = await suppliersApi.sync(supplierId, { force });
      alert(`同步完成！\n处理: ${result.itemsProcessed} 项\n更新: ${result.itemsUpdated} 项\n失败: ${result.itemsFailed} 项`);
      await mutateStatus();
    } catch (error: any) {
      alert(`同步失败: ${error.message || '未知错误'}`);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status?: string | null) => {
    if (!status) return <span className="badge">未知</span>;
    const statusMap: Record<string, { label: string; className: string }> = {
      SUCCESS: { label: '成功', className: 'badge-success' },
      FAILED: { label: '失败', className: 'badge-error' },
      PARTIAL: { label: '部分成功', className: 'badge-warning' },
      PENDING: { label: '待处理', className: 'badge' },
      IN_PROGRESS: { label: '进行中', className: 'badge-info' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'badge' };
    return <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>供应商管理</h1>
          <p className="text-muted">管理供应商 API 集成和库存同步</p>
        </div>
        <button type="button" className="btn" onClick={() => setShowCreateModal(true)}>
          添加供应商
        </button>
      </div>

      <div className="admin-table-wrapper">
        {suppliers.length === 0 ? (
          <div className="admin-table-placeholder">暂无供应商</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>供应商名称</th>
                <th>API URL</th>
                <th>同步间隔</th>
                <th>状态</th>
                <th>最后同步</th>
                <th>同步状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <strong>{supplier.name}</strong>
                    {!supplier.isActive && <span className="badge" style={{ marginLeft: 8 }}>已禁用</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#666' }}>{supplier.apiUrl}</td>
                  <td>{supplier.syncInterval / 60} 分钟</td>
                  <td>{supplier.isActive ? <span className="badge badge-success">启用</span> : <span className="badge">禁用</span>}</td>
                  <td>{formatDate(supplier.lastSyncAt)}</td>
                  <td>{getStatusBadge(supplier.lastSyncStatus)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-icon btn--outline"
                        onClick={() => handleSync(supplier.id, false)}
                        style={{ fontSize: 12 }}
                      >
                        同步
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn--outline"
                        onClick={() => handleSync(supplier.id, true)}
                        style={{ fontSize: 12 }}
                      >
                        强制同步
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn--outline"
                        onClick={() => setShowSyncHistory(showSyncHistory === supplier.id ? null : supplier.id)}
                        style={{ fontSize: 12 }}
                      >
                        历史
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sync History Modal */}
      {showSyncHistory && (
        <SyncHistoryModal
          supplierId={showSyncHistory}
          onClose={() => setShowSyncHistory(null)}
        />
      )}

      {/* Create Supplier Modal */}
      {showCreateModal && (
        <CreateSupplierModal
          onClose={() => {
            setShowCreateModal(false);
            mutateStatus();
          }}
        />
      )}
    </div>
  );
}

function SyncHistoryModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const { data, isLoading } = useSWR(`supplier-sync-history-${supplierId}`, () =>
    suppliersApi.getSyncHistory(supplierId, { limit: 20 })
  );

  const syncs = data?.syncs || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>同步历史</h3>
        {isLoading ? (
          <div>加载中...</div>
        ) : syncs.length === 0 ? (
          <div>暂无同步记录</div>
        ) : (
          <table className="admin-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th>开始时间</th>
                <th>完成时间</th>
                <th>状态</th>
                <th>处理</th>
                <th>更新</th>
                <th>失败</th>
              </tr>
            </thead>
            <tbody>
              {syncs.map((sync: InventorySync) => (
                <tr key={sync.id}>
                  <td>{new Date(sync.startedAt).toLocaleString('zh-CN')}</td>
                  <td>{sync.completedAt ? new Date(sync.completedAt).toLocaleString('zh-CN') : '—'}</td>
                  <td>
                    <span className={`badge badge-${sync.status === 'SUCCESS' ? 'success' : sync.status === 'FAILED' ? 'error' : 'warning'}`}>
                      {sync.status}
                    </span>
                  </td>
                  <td>{sync.itemsProcessed}</td>
                  <td>{sync.itemsUpdated}</td>
                  <td>{sync.itemsFailed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" className="btn btn--outline" onClick={onClose} style={{ marginTop: 16 }}>
          关闭
        </button>
      </div>
    </div>
  );
}

function CreateSupplierModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    apiKey: '',
    apiSecret: '',
    syncInterval: 3600,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await suppliersApi.create(formData);
      onClose();
    } catch (error: any) {
      alert(`创建失败: ${error.message || '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '600px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>添加供应商</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>供应商名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>API URL *</label>
            <input
              type="url"
              required
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>API Key *</label>
            <input
              type="text"
              required
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>API Secret</label>
            <input
              type="password"
              value={formData.apiSecret}
              onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>同步间隔（秒）</label>
            <input
              type="number"
              value={formData.syncInterval}
              onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) || 3600 })}
            />
          </div>
          <div className="admin-form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              启用
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 16 }}>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? '创建中...' : '创建'}
            </button>
            <button type="button" className="btn btn--outline" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

