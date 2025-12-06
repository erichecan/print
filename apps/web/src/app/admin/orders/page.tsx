'use client';

/**
 * Admin Orders Page
 * [2025-11-12 01:25:45] 订单列表与筛选
 * [2025-11-15 16:28:00] 还原 prototype/admin/admin/orders.html 布局
 * [2025-12-06 16:40:00] 添加批量订单处理功能 (Issue #87)
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { adminOrdersApi, AdminOrderSummary, AdminOrderListParams } from '@/lib/api';

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

const PAYMENT_OPTIONS = [
  { label: 'All payments', value: '' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export default function AdminOrdersPage() {
  const [filters, setFilters] = useState<AdminOrderListParams>({
    page: 1,
    limit: 20,
    status: '',
    paymentStatus: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  // [2025-12-06 16:40:00] Batch selection state for Issue #87
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [batchUpdateStatus, setBatchUpdateStatus] = useState<string>('');
  const [batchUpdatePaymentStatus, setBatchUpdatePaymentStatus] = useState<string>('');

  const swrKey = useMemo(() => ['admin-orders', filters], [filters]);
  const { data, isLoading, mutate } = useSWR(swrKey, ([, params]: [string, AdminOrderListParams]) => adminOrdersApi.list(params));

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  // [2025-12-06 16:40:00] Batch selection handlers for Issue #87
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map((order) => order.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

  // [2025-12-06 16:40:00] Batch update handler for Issue #87
  const handleBatchUpdate = async () => {
    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order');
      return;
    }

    if (!batchUpdateStatus && !batchUpdatePaymentStatus) {
      alert('Please select at least one status to update');
      return;
    }

    const count = selectedOrderIds.size;
    if (!confirm(`Update ${count} order(s)?`)) {
      return;
    }

    setIsBatchUpdating(true);
    try {
      await adminOrdersApi.batchUpdateStatus(Array.from(selectedOrderIds), {
        status: batchUpdateStatus || undefined,
        paymentStatus: batchUpdatePaymentStatus || undefined,
      });
      setSelectedOrderIds(new Set());
      setBatchUpdateStatus('');
      setBatchUpdatePaymentStatus('');
      await mutate();
      alert(`Successfully updated ${count} order(s)`);
    } catch (error: any) {
      console.error('Batch update error:', error);
      alert(`Failed to update orders: ${error.message || 'Unknown error'}`);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // [2025-12-06 16:40:00] Batch export handler for Issue #87
  const handleBatchExport = async () => {
    try {
      const orderIds = selectedOrderIds.size > 0 ? Array.from(selectedOrderIds) : undefined;
      await adminOrdersApi.exportOrders({
        orderIds,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        search: filters.search || undefined,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Failed to export orders: ${error.message || 'Unknown error'}`);
    }
  };

  const handleFilterChange = (key: 'status' | 'paymentStatus') => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      [key]: event.target.value || undefined,
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
            placeholder="Search order # or email"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select value={filters.status || ''} onChange={handleFilterChange('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all-status'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={filters.paymentStatus || ''} onChange={handleFilterChange('paymentStatus')}>
          {PAYMENT_OPTIONS.map((option) => (
            <option key={option.value || 'all-payments'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={handleBatchExport} disabled={isLoading}>
          Export CSV
        </button>
      </div>

      {/* [2025-12-06 16:40:00] Batch operations toolbar for Issue #87 */}
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
              {STATUS_OPTIONS.filter((opt) => opt.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={batchUpdatePaymentStatus}
              onChange={(e) => setBatchUpdatePaymentStatus(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="">Update Payment Status...</option>
              {PAYMENT_OPTIONS.filter((opt) => opt.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBatchUpdate}
              disabled={isBatchUpdating || (!batchUpdateStatus && !batchUpdatePaymentStatus)}
              style={{
                padding: '6px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isBatchUpdating || (!batchUpdateStatus && !batchUpdatePaymentStatus) ? 'not-allowed' : 'pointer',
                opacity: isBatchUpdating || (!batchUpdateStatus && !batchUpdatePaymentStatus) ? 0.6 : 1,
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
                setBatchUpdatePaymentStatus('');
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
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: AdminOrderSummary) => (
                <tr key={order.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`}>#{order.orderNumber}</Link>
                  </td>
                  <td>{order.customerEmail || '—'}</td>
                  <td>{order.itemCount} items</td>
                  <td>${formatCurrency(order.total, order.currency)}</td>
                  <td>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="btn-icon btn--outline" style={{ fontSize: 12 }}>
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
            Page {pagination.page} / {pagination.totalPages}
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



