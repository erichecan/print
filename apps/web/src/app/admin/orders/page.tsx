'use client';

/**
 * Admin Orders Page
 * [2025-11-12 01:25:45] 订单列表与筛选
 * [2025-11-15 16:28:00] 还原 prototype/admin/admin/orders.html 布局
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

  const swrKey = useMemo(() => ['admin-orders', filters], [filters]);
  const { data, isLoading } = useSWR(swrKey, ([, params]: [string, AdminOrderListParams]) => adminOrdersApi.list(params));

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

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
        <button type="button" className="btn" onClick={() => alert('Export coming soon')}>
          Export CSV
        </button>
      </div>

      <div className="admin-table-wrapper">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="admin-table-placeholder">No orders found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
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



