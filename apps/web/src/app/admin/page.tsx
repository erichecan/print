/**
 * Admin Dashboard
 * [2025-11-05 00:50:00]
 * [2025-11-05 01:15:00] Enhanced with comprehensive stats and order management
 */
'use client';

// [2025-11-12 02:32:45] Refactored dashboard to rely on AdminShell auth wrapper and streamlined stats UI
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

export default function AdminDashboardPage() {
  const { data, error, isLoading } = useSWR('/admin/orders', () => ordersApi.list(1, 100));
  const orders = useMemo(() => {
    if (!data) return [];
    if ('data' in data) return data.data as Order[];
    if ('orders' in data) return data.orders as Order[];
    return [];
  }, [data]);

  const stats = useMemo(() => {
    if (!orders.length) {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        todayOrders: 0,
      };
    }

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
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
      processingOrders: orders.filter((o) => o.status === 'PROCESSING').length,
      completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
      totalRevenue,
      todayRevenue,
      todayOrders: todayOrders.length,
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  if (isLoading) {
    return <div className="dashboard-page__loading">Loading dashboard…</div>;
  }

  if (error) {
    return <div className="dashboard-page__error">Failed to load dashboard data.</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
            <p className="stat-change">{stats.todayOrders} today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
            <p className="stat-change">${stats.todayRevenue.toFixed(2)} today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Orders</h3>
            <p className="stat-value">{stats.pendingOrders}</p>
            <p className="stat-change">{stats.processingOrders} processing</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completed Orders</h3>
            <p className="stat-value">{stats.completedOrders}</p>
            <p className="stat-change">
              {stats.totalOrders ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : '0.0'}% completion
              rate
            </p>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <Link href="/admin/products/new" className="action-card">
            <span className="action-icon">➕</span>
            <span>Add Product</span>
          </Link>
          <Link href="/admin/offline-orders" className="action-card">
            <span className="action-icon">🛠️</span>
            <span>Offline Orders Board</span>
          </Link>
          <Link href="/admin/orders?status=pending" className="action-card">
            <span className="action-icon">📋</span>
            <span>Review Orders</span>
          </Link>
          <Link href="/admin/users" className="action-card">
            <span className="action-icon">👥</span>
            <span>View Users</span>
          </Link>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <Link href="/admin/orders" className="view-all-link">
            View All →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
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
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.orderNumber}`} className="order-link">
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {order.user
                        ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email
                        : 'Guest'}
                    </td>
                    <td>{order.items?.length || 0} items</td>
                    <td>${Number(order.total || 0).toFixed(2)} CAD</td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="action-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .dashboard-page {
          display: grid;
          gap: 24px;
        }
        .dashboard-page__loading,
        .dashboard-page__error {
          min-height: 40vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }
        .dashboard-page__error {
          color: #ef4444;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .stat-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .stat-icon {
          font-size: 32px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 12px;
        }
        .stat-content h3 {
          margin: 0 0 6px;
          font-size: 14px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .stat-value {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }
        .stat-change {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }
        .admin-section {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 24px;
        }
        .admin-section h2 {
          margin: 0 0 20px;
          font-size: 20px;
          font-weight: 700;
        }
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          border: 2px dashed #e5e5e5;
          border-radius: 12px;
          text-decoration: none;
          color: #111827;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .action-card:hover {
          border-color: #ff1f3d;
          background: rgba(255, 31, 61, 0.05);
        }
        .action-icon {
          font-size: 28px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .view-all-link {
          color: #ff1f3d;
          text-decoration: none;
          font-weight: 500;
        }
        .orders-table-wrapper {
          overflow-x: auto;
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }
        .orders-table thead {
          background: #f5f5f5;
        }
        .orders-table th,
        .orders-table td {
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e5e5e5;
        }
        .orders-table tbody tr:hover {
          background: #f9f9f9;
        }
        .order-link,
        .action-link {
          color: #ff1f3d;
          text-decoration: none;
          font-weight: 600;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-pending {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }
        .status-processing {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .status-completed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .empty-state {
          padding: 24px;
          text-align: center;
          color: #6b7280;
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
