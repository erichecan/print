'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  unifiedOrdersApi,
  adminDesignsApi,
  UnifiedOrderDTO,
  AdminDesignSummary
} from '@/lib/api';

export default function AdminDashboardPage() {
  // Use Unified Orders API for mixed online/offline orders
  const { data: ordersData, error: ordersError, isLoading: ordersLoading } = useSWR(
    '/admin/unified-orders',
    () => unifiedOrdersApi.list({ page: 1, pageSize: 100 })
  );

  // Use Admin Designs API for real design reviews
  const { data: designsData, error: designsError, isLoading: designsLoading } = useSWR(
    '/admin/designs/pending',
    () => adminDesignsApi.list({ status: 'pending', limit: 5 }) // Fetch specifically pending reviews
  );

  const orders = useMemo(() => {
    return ordersData?.data || [];
  }, [ordersData]);

  const designReviews = useMemo(() => {
    return designsData?.data || [];
  }, [designsData]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((order) => {
      const date = new Date(order.createdAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    });

    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const todayRevenue = todayOrders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      todaysRevenue: todayRevenue || 0,
      newOrders: todayOrders.length || orders.length,
      pendingReviews: designReviews.length, // Use real count from API
      lowStockItems: 8, // Still mock as inventory API is separate
    };
  }, [orders, designReviews]);

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  const isLoading = ordersLoading || designsLoading;
  const error = ordersError || designsError;

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
                <tr key={order.compositeId} data-entity="order" data-id={order.id}>
                  <td>
                    <Link
                      href={order.type === 'offline' ? `/admin/offline-orders/${order.id}` : `/admin/orders/${order.id}`}
                      style={{ color: 'var(--color-primary)' }}
                      data-action="view-order"
                      data-field="orderNumber"
                    >
                      <span className={`badge ${order.type === 'offline' ? 'badge-warning' : 'badge-info'}`} style={{ marginRight: 6, fontSize: '0.7em', padding: '2px 4px' }}>
                        {order.type === 'offline' ? 'OFF' : 'ON'}
                      </span>
                      #{order.orderNo}
                    </Link>
                  </td>
                  <td data-field="customerName">
                    {order.customerName || order.customerEmail || 'Guest'}
                  </td>
                  <td data-field="total">${Number(order.totalAmount || 0).toFixed(2)}</td>
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
              {designReviews.map((design: AdminDesignSummary) => (
                <tr key={design.id}>
                  <td>{design.name}</td>
                  <td>{design.user ? `${design.user.firstName || ''} ${design.user.lastName || ''}`.trim() || design.user.email : 'Guest'}</td>
                  <td>
                    <span
                      className={`badge badge-pending`}
                      data-i18n="designStatusPending"
                    >
                      {design.reviewStatus}
                    </span>
                  </td>
                  <td>{new Date(design.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                  <td>
                    <Link
                      href={`/admin/designs/${design.id}`}
                      className="btn-icon btn--outline"
                      style={{ fontSize: 12 }}
                      data-action="review-design"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {!designReviews.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
                    No pending reviews.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
