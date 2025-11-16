/**
 * Admin Dashboard (Next.js version faithfully mirroring prototype/admin/admin/index.html)
 * [2025-11-05 00:50:00] 初版 HTML
 * [2025-11-15 12:40:00] React 版本 1:1 还原内容 / 布局 / 样式
 */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ordersApi } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  items: Array<{
    quantity: number;
  }>;
}

const PENDING_DESIGN_REVIEWS = [
  {
    name: 'Conference Backpack',
    user: 'alex.brown',
    statusKey: 'designStatusPending',
    statusLabel: 'Pending',
    date: 'Oct 31',
    actionKey: 'designReviewAction',
    actionLabel: 'Review',
  },
  {
    name: 'Team Jerseys',
    user: 'sports.club',
    statusKey: 'designStatusPending',
    statusLabel: 'Pending',
    date: 'Oct 31',
    actionKey: 'designReviewAction',
    actionLabel: 'Review',
  },
  {
    name: 'Holiday Swag',
    user: 'marketing.dept',
    statusKey: 'designStatusPending',
    statusLabel: 'Pending',
    date: 'Oct 30',
    actionKey: 'designReviewAction',
    actionLabel: 'Review',
  },
  {
    name: 'Welcome Kit',
    user: 'hr.team',
    statusKey: 'designStatusApproved',
    statusLabel: 'Approved',
    date: 'Oct 30',
    actionKey: 'designViewAction',
    actionLabel: 'View',
  },
];

export default function AdminDashboardPage() {
  const { data, error, isLoading } = useSWR('/admin/orders', () => ordersApi.list(1, 100));
  const orders = useMemo(() => {
    if (!data) return [];
    if ('data' in data) return data.data as Order[];
    if ('orders' in data) return data.orders as Order[];
    return [];
  }, [data]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((order) => {
      const date = new Date(order.createdAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    });

    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const todayRevenue = todayOrders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      todaysRevenue: todayRevenue || 0,
      newOrders: todayOrders.length || orders.length,
      pendingReviews: PENDING_DESIGN_REVIEWS.length,
      lowStockItems: 8, // 与原始 HTML 示例保持一致
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}
        data-i18n="loading"
      >
        Loading admin workspace…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        <span data-i18n="failedDashboard">Failed to load dashboard data.</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="stats-grid" data-api="/api/admin/stats" data-method="GET">
        <div className="stat-card" data-field="revenue">
          <div className="stat-card-value" data-field="revenueValue">
            ${stats.todaysRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-label" data-i18n="todaysRevenue">
            Today&apos;s Revenue
          </div>
          <div className="stat-card-change positive" data-field="revenueChange">
            +12% <span data-i18n="fromYesterday">from yesterday</span>
          </div>
        </div>
        <div className="stat-card" data-field="orders">
          <div className="stat-card-value" data-field="ordersValue">
            {stats.newOrders}
          </div>
          <div className="stat-card-label" data-i18n="newOrders">
            New Orders
          </div>
          <div className="stat-card-change positive" data-field="ordersChange">
            +8% <span data-i18n="fromYesterday">from yesterday</span>
          </div>
        </div>
        <div className="stat-card" data-field="reviews">
          <div className="stat-card-value" data-field="reviewsValue">
            {stats.pendingReviews}
          </div>
          <div className="stat-card-label" data-i18n="pendingReviews">
            Pending Reviews
          </div>
          <div className="stat-card-change" data-field="reviewsChange">
            3 <span data-i18n="newToday">new today</span>
          </div>
        </div>
        <div className="stat-card" data-field="stock">
          <div className="stat-card-value" data-field="stockValue">
            {stats.lowStockItems}
          </div>
          <div className="stat-card-label" data-i18n="lowStockItems">
            Low Stock Items
          </div>
          <div className="stat-card-change" data-field="stockChange">
            2 <span data-i18n="critical">critical</span>
          </div>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}
      >
        <div
          className="admin-table-wrapper"
          data-api="/api/admin/orders?limit=10"
          data-method="GET"
        >
          <div style={{ padding: '16px 16px 0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }} data-i18n="recentOrders">
              Recent Orders
            </h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th data-i18n="orderNumber">Order #</th>
                <th data-i18n="customer">Customer</th>
                <th data-i18n="total">Amount</th>
                <th data-i18n="status">Status</th>
                <th data-i18n="date">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} data-entity="order" data-id={order.id}>
                  <td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      style={{ color: 'var(--color-primary)' }}
                      data-action="view-order"
                      data-field="orderNumber"
                      data-api={`/api/admin/orders/${order.id}`}
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td data-field="customerName">
                    {order.user
                      ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email
                      : (
                          <span data-i18n="guest">Guest</span>
                        )}
                  </td>
                  <td data-field="total">${Number(order.total || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge badge-${order.status.toLowerCase()}`} data-field="status">
                      {order.status}
                    </span>
                  </td>
                  <td data-field="date">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                </tr>
              ))}
              {!recentOrders.length && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}
                    data-i18n="emptyOrders"
                  >
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-table-wrapper">
          <div style={{ padding: '16px 16px 0' }}>
            <h3
              style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}
              data-i18n="pendingDesignReviews"
            >
              Pending Design Reviews
            </h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th data-i18n="designName">Design</th>
                <th data-i18n="designUserColumn">User</th>
                <th data-i18n="status">Status</th>
                <th data-i18n="date">Date</th>
                <th data-i18n="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_DESIGN_REVIEWS.map((design) => (
                <tr key={`${design.name}-${design.user}`}>
                  <td>{design.name}</td>
                  <td>{design.user}</td>
                  <td>
                    <span
                      className={`badge ${design.statusKey === 'designStatusApproved' ? 'badge-success' : 'badge-pending'}`}
                      data-i18n={design.statusKey}
                    >
                      {design.statusLabel}
                    </span>
                  </td>
                  <td>{design.date}</td>
                  <td>
                    <Link
                      href="/admin/designs"
                      className="btn-icon btn--outline"
                      style={{ fontSize: 12 }}
                      data-action="review-design"
                      data-i18n={design.actionKey}
                    >
                      {design.actionLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
