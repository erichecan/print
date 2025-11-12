'use client';

/**
 * Admin Orders Page
 * [2025-11-12 01:25:45] 订单列表与筛选
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import AdminShell from '@/components/admin/AdminShell';
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
  const { data, isLoading, mutate } = useSWR(swrKey, ([, params]) => adminOrdersApi.list(params));

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

  return (
    <AdminShell>
      <section className="orders-page">
        <header className="page-header">
          <div>
            <h1>Orders</h1>
            <p className="lead">
              Track order activity, update fulfillment status, and manage customer experiences.
            </p>
          </div>
        </header>

        <div className="filters">
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder="Search order number or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="filter-controls">
            <label>
              Status
              <select value={filters.status || ''} onChange={handleFilterChange('status')}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment
              <select value={filters.paymentStatus || ''} onChange={handleFilterChange('paymentStatus')}>
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="table-card">
          {isLoading ? (
            <div className="placeholder">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="placeholder">No orders found.</div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Email</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order: AdminOrderSummary) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="order-link">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.email}</td>
                    <td>{order.itemCount}</td>
                    <td>${order.total.toFixed(2)} {order.currency}</td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                    </td>
                    <td>
                      <span className={`status-badge payment-${order.paymentStatus.toLowerCase()}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="action-link">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button type="button" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}>
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}

        <style jsx>{`
          .orders-page {
            display: grid;
            gap: 24px;
          }
          .page-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
          }
          .lead {
            margin: 4px 0 0;
            color: #64748b;
          }
          .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            align-items: center;
            justify-content: space-between;
          }
          .search-form {
            display: flex;
            gap: 8px;
          }
          .search-form input {
            min-width: 240px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #d4d7de;
          }
          .search-form button {
            padding: 10px 16px;
            border-radius: 8px;
            border: none;
            background: #1f2937;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
          }
          .filter-controls {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          label {
            display: flex;
            flex-direction: column;
            font-size: 0.85rem;
            color: #475569;
            gap: 6px;
          }
          select {
            min-width: 160px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #d4d7de;
          }
          .table-card {
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .orders-table {
            width: 100%;
            border-collapse: collapse;
          }
          th,
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            font-size: 0.95rem;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
          }
          tbody tr:hover {
            background: #f1f5f9;
          }
          .order-link,
          .action-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 600;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-pending {
            background: rgba(245, 158, 11, 0.15);
            color: #b45309;
          }
          .status-processing {
            background: rgba(59, 130, 246, 0.15);
            color: #1d4ed8;
          }
          .status-shipped {
            background: rgba(16, 185, 129, 0.15);
            color: #047857;
          }
          .status-delivered {
            background: rgba(16, 185, 129, 0.2);
            color: #065f46;
          }
          .status-cancelled,
          .status-refunded {
            background: rgba(239, 68, 68, 0.15);
            color: #b91c1c;
          }
          .payment-completed {
            background: rgba(16, 185, 129, 0.15);
            color: #047857;
          }
          .payment-pending {
            background: rgba(245, 158, 11, 0.15);
            color: #b45309;
          }
          .payment-failed,
          .payment-refunded {
            background: rgba(239, 68, 68, 0.15);
            color: #b91c1c;
          }
          .placeholder {
            padding: 48px;
            text-align: center;
            color: #64748b;
          }
          .pagination {
            display: flex;
            gap: 12px;
            align-items: center;
            justify-content: center;
          }
          .pagination button {
            padding: 8px 16px;
            border-radius: 999px;
            border: 1px solid #d4d7de;
            background: #fff;
            cursor: pointer;
          }
          .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          @media (max-width: 960px) {
            .filters {
              flex-direction: column;
              align-items: stretch;
            }
            .search-form {
              width: 100%;
            }
            .search-form input {
              flex: 1;
            }
            .orders-table {
              font-size: 0.85rem;
            }
            th,
            td {
              padding: 10px 12px;
            }
          }
        `}</style>
      </section>
    </AdminShell>
  );
}



