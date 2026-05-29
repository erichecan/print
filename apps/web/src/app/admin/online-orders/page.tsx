'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { adminOrdersApi, AdminOrderSummary, AdminOrderListParams } from '@/lib/api';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

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

export default function AdminOnlineOrdersPage() {
  const [filters, setFilters] = useState<AdminOrderListParams & { page: number; status: string }>({
    page: 1,
    limit: 20,
    status: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [batchUpdateStatus, setBatchUpdateStatus] = useState<string>('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const swrKey = useMemo(() => ['online-orders', filters], [filters]);
  const { data, isLoading, mutate } = useSWR(swrKey, ([, params]: [string, typeof filters]) =>
    adminOrdersApi.list({
      page: params.page,
      limit: params.limit,
      status: params.status !== 'all' ? params.status : undefined,
      search: params.search || undefined,
    })
  );

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map((order) => order.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleSelectOrder = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedOrderIds(newSelected);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

  const handleBatchExport = async () => {
    try {
      await adminOrdersApi.exportOrders({
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Failed to export orders: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim() || undefined,
    }));
  };

  const handleBatchUpdate = () => {
    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order');
      return;
    }
    if (!batchUpdateStatus) {
      alert('Please select a status to update');
      return;
    }
    setIsBatchModalOpen(true);
  };

  const executeBatchUpdate = async () => {
    setIsBatchUpdating(true);
    try {
      await adminOrdersApi.batchUpdateStatus(Array.from(selectedOrderIds), { status: batchUpdateStatus });
      setSelectedOrderIds(new Set());
      setBatchUpdateStatus('');
      setIsBatchModalOpen(false);
      await mutate();
    } catch (error: any) {
      console.error('Batch update error:', error);
      alert(`Failed to update orders: ${error.message || 'Unknown error'}`);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatCurrency = (value: number, currency?: string) =>
    `${value.toFixed(2)}${currency ? ` ${currency}` : ''}`;

  function orderStatusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      PENDING:    { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
      PROCESSING: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Processing' },
      SHIPPED:    { bg: '#D1FAE5', color: '#065F46', label: 'Shipped' },
      DELIVERED:  { bg: '#D1FAE5', color: '#065F46', label: 'Delivered' },
      COMPLETED:  { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      CANCELLED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
      REFUNDED:   { bg: '#FEE2E2', color: '#991B1B', label: 'Refunded' },
    };
    const s = map[status?.toUpperCase?.()] ?? { bg: '#F3F4F6', color: '#6B7280', label: status };
    return (
      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    );
  }

  function designReviewBadge(status: string | null | undefined) {
    if (!status) return null;
    const map: Record<string, { bg: string; color: string; label: string }> = {
      PENDING_REVIEW: { bg: '#FEF3C7', color: '#92400E', label: '待审核' },
      IN_REVIEW:      { bg: '#DBEAFE', color: '#1E40AF', label: '审核中' },
      SYNCED:         { bg: '#D1FAE5', color: '#065F46', label: '已同步' },
      REJECTED:       { bg: '#FEE2E2', color: '#991B1B', label: '已退回' },
    };
    const s = map[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status };
    return (
      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    );
  }

  return (
    <>
      <div style={{ marginTop: 24 }}>
        <div className="admin-page-header">
          <div>
            <h1>Online Orders</h1>
            <p className="text-muted">Manage web store orders</p>
          </div>
        </div>

        <div className="admin-filters admin-filters--wrap">
          <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder="Search order #, name, email..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              minLength={2}
            />
            <button type="submit" className="btn btn--outline btn--xs">
              Search
            </button>
          </form>
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, status: e.target.value }))}
          >
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
                setFilters((prev) => ({ ...prev, page: 1 }));
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
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="To"
              style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>
          <button type="button" className="btn" onClick={handleBatchExport} disabled={isLoading}>
            Export CSV
          </button>
        </div>

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
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>设计审核</th>
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
                      <Link href={`/admin/online-orders/${order.id}`}>#{order.orderNumber}</Link>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{order.customerName || '—'}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{order.customerEmail || ''}</div>
                    </td>
                    <td>{order.itemCount ?? 0} items</td>
                    <td>
                      {order.total > 0 ? `${order.currency || 'CAD'} ${formatCurrency(order.total)}` : '—'}
                    </td>
                    <td>
                      {orderStatusBadge(order.status)}
                    </td>
                    <td>
                      {designReviewBadge(order.designReviewStatus) ?? (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                      )}
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link
                        href={`/admin/online-orders/${order.id}`}
                        className="btn-icon btn--outline"
                        style={{ fontSize: 12 }}
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

        <DeleteConfirmationModal
          isOpen={isBatchModalOpen}
          isDeleting={isBatchUpdating}
          onClose={() => setIsBatchModalOpen(false)}
          onConfirm={executeBatchUpdate}
          title="Batch Update Orders"
          description={`Are you sure you want to update the status of ${selectedOrderIds.size} selected order(s) to "${batchUpdateStatus}"?`}
          confirmLabel="Confirm Update"
        />
      </div>
    </>
  );
}
