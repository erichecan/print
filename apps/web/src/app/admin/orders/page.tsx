'use client';

/**
 * Admin Orders Page - Unified Order Management
* 订单列表与筛选
* 还原 prototype/admin/admin/orders.html 布局
* 添加批量订单处理功能 (Issue #87)
* 统一订单管理：合并线上订单（Order）和线下订单（OfflineOrder）
 */
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { unifiedOrdersApi, UnifiedOrderDTO, UnifiedOrderListParams } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const TYPE_OPTIONS = [
  { label: 'All Orders', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Refunded', value: 'refunded' },
];

export default function AdminOrdersPage() {
  const { warning: showWarningToast } = useToast();
  const [filters, setFilters] = useState<UnifiedOrderListParams>({
    page: 1,
    pageSize: 20,
    type: 'all',
    status: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
// Batch selection state for Issue #87
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [batchUpdateStatus, setBatchUpdateStatus] = useState<string>('');

  const swrKey = useMemo(() => ['unified-orders', filters], [filters]);
  const { data, isLoading, mutate, error } = useSWR(swrKey, ([, params]: [string, UnifiedOrderListParams]) =>
    unifiedOrdersApi.list(params)
  );

  const orders = data?.data ?? [];
  const pagination = data?.pagination;
  const warnings = data?.meta?.warnings;

// 显示警告信息
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      if (warnings.includes('onlineQueryFailed')) {
        showWarningToast('部分线上订单查询失败，列表可能不完整');
      }
      if (warnings.includes('offlineQueryFailed')) {
        showWarningToast('部分线下订单查询失败，列表可能不完整');
      }
    }
  }, [warnings, showWarningToast]);

// Batch selection handlers for Issue #87
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map((order) => order.compositeId)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleSelectOrder = (compositeId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(compositeId);
    } else {
      newSelected.delete(compositeId);
    }
    setSelectedOrderIds(newSelected);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

// 批量导出（使用统一订单API）
  const handleBatchExport = async () => {
    try {
      await unifiedOrdersApi.export({
        type: filters.type,
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Failed to export orders: ${error.message || 'Unknown error'}`);
    }
  };

  const handleFilterChange = (key: 'type' | 'status') => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      [key]: event.target.value,
    }));
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim() || undefined,
    }));
  };

// 批量更新处理（注意：统一订单的批量更新需要按类型分发）
  const handleBatchUpdate = async () => {
    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order');
      return;
    }

    if (!batchUpdateStatus) {
      alert('Please select a status to update');
      return;
    }

    const count = selectedOrderIds.size;
    if (!confirm(`Update ${count} order(s)? Note: Status updates will be applied based on order type.`)) {
      return;
    }

    setIsBatchUpdating(true);
    try {
      // 分离线上和线下订单
      const onlineIds: string[] = [];
      const offlineIds: string[] = [];

      selectedOrderIds.forEach((compositeId) => {
        if (compositeId.startsWith('online-')) {
          onlineIds.push(compositeId.replace('online-', ''));
        } else if (compositeId.startsWith('offline-')) {
          offlineIds.push(compositeId.replace('offline-', ''));
        }
      });

      // 分别更新（这里需要调用对应的API）
      // TODO: 实现批量更新逻辑，根据订单类型调用不同的API
      // 目前先提示用户
      alert(
        `Batch update for ${count} orders (${onlineIds.length} online, ${offlineIds.length} offline) is not yet fully implemented. Please update orders individually.`
      );

      setSelectedOrderIds(new Set());
      setBatchUpdateStatus('');
      await mutate();
    } catch (error: any) {
      console.error('Batch update error:', error);
      alert(`Failed to update orders: ${error.message || 'Unknown error'}`);
    } finally {
      setIsBatchUpdating(false);
    }
  };

// 获取订单详情链接
// 修复：offline 订单应该链接到 sales 订单详情页面
  const getOrderDetailLink = (order: UnifiedOrderDTO) => {
    if (order.type === 'online') {
      return `/admin/orders/${order.id}`;
    } else {
      return `/offline-orders/sales/orders/${order.id}`;
    }
  };

  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const formatCurrency = (value: number, currency?: string) =>
    `${value.toFixed(2)}${currency ? ` ${currency}` : ''}`;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="orders">Orders</h1>
          <p className="text-muted">Track fulfillment progress and customer activity</p>
        </div>
      </div>

      <div className="admin-filters admin-filters--wrap">
        <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            placeholder="Search order #, name, email, phone, notes..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            minLength={2}
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select value={filters.type || 'all'} onChange={handleFilterChange('type')}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={filters.status || 'all'} onChange={handleFilterChange('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setFilters((prev) => ({
                ...prev,
                page: 1,
                dateFrom: e.target.value || undefined,
              }));
            }}
            placeholder="From"
            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setFilters((prev) => ({
                ...prev,
                page: 1,
                dateTo: e.target.value || undefined,
              }));
            }}
            placeholder="To"
            style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>
        <button type="button" className="btn" onClick={handleBatchExport} disabled={isLoading}>
          Export CSV
        </button>
      </div>

{/* Batch operations toolbar for Issue #87 */}
      {selectedOrderIds.size > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <strong style={{ color: '#374151' }}>
            {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''} selected
          </strong>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={batchUpdateStatus}
              onChange={(e) => setBatchUpdateStatus(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">Update Status...</option>
              {STATUS_OPTIONS.filter((opt) => opt.value !== 'all').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBatchUpdate}
              disabled={isBatchUpdating || !batchUpdateStatus}
              style={{
                padding: '6px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isBatchUpdating || !batchUpdateStatus ? 'not-allowed' : 'pointer',
                opacity: isBatchUpdating || !batchUpdateStatus ? 0.6 : 1,
                fontSize: '14px',
              }}
            >
              {isBatchUpdating ? 'Updating...' : 'Update Selected'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOrderIds(new Set());
                setBatchUpdateStatus('');
              }}
              style={{
                padding: '6px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="admin-table-placeholder">No orders found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Type</th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: UnifiedOrderDTO) => (
                <tr key={order.compositeId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.compositeId)}
                      onChange={(e) => handleSelectOrder(order.compositeId, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span
                      className={`badge ${order.type === 'online' ? 'badge-primary' : 'badge-secondary'}`}
                      style={{
                        backgroundColor: order.type === 'online' ? '#3b82f6' : '#6b7280',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                    >
                      {order.type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>
                    <Link href={getOrderDetailLink(order)}>#{order.orderNo}</Link>
                  </td>
                  <td>{order.customerName || '—'}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      {order.customerEmail && <div>{order.customerEmail}</div>}
                      {order.customerPhone && <div style={{ color: '#6b7280' }}>{order.customerPhone}</div>}
                      {!order.customerEmail && !order.customerPhone && '—'}
                    </div>
                  </td>
                  <td>{order.itemsCount} items</td>
                  <td>
                    {order.totalAmount > 0 ? `${order.currency || 'CAD'} ${formatCurrency(order.totalAmount)}` : '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link
                      href={getOrderDetailLink(order)}
                      className="btn-icon btn--outline"
                      style={{ fontSize: 12 }}
                      {...(order.type === 'offline' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={pagination.page === 1} onClick={() => goToPage(pagination.page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} / {pagination.totalPages} (Total: {pagination.total} orders)
          </span>
          <button
            type="button"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}



