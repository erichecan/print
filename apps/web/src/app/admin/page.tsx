/**
 * Admin Dashboard
 * [2025-11-05 00:50:00]
 * [2025-11-05 01:15:00] Enhanced with comprehensive stats and order management
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ordersApi } from '@/lib/api';
import useSWR from 'swr';

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

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    todayOrders: 0,
  });

  useEffect(() => {
    authApi
      .me()
      .then((data: any) => {
        if (data.role !== 'ADMIN') {
          router.push('/');
          return;
        }
        setUser(data);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // Fetch all orders for statistics
  const { data: ordersData, error: ordersError } = useSWR<any>(
    user ? '/admin/orders' : null,
    () => ordersApi.list(1, 100) // Fetch more for stats
  );

  // Calculate statistics from orders
  useEffect(() => {
    if (ordersData?.data) {
      const orders = (ordersData.data || []) as Order[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrdersList = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });

      const totalRevenue = orders
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      const todayRevenue = todayOrdersList
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
        processingOrders: orders.filter((o) => o.status === 'PROCESSING').length,
        completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
        totalRevenue,
        todayRevenue,
        todayOrders: todayOrdersList.length,
      });
    }
  }, [ordersData]);

  if (loading) {
    return (
      <div className="admin-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const recentOrders = ((ordersData?.data as Order[]) || []).slice(0, 10);

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">Welcome back, {user.firstName || user.email}</p>
        </div>
        <nav className="admin-nav">
          <Link href="/admin" className="nav-link active">Dashboard</Link>
          <Link href="/admin/orders" className="nav-link">Orders</Link>
          <Link href="/admin/products" className="nav-link">Products</Link>
          <Link href="/admin/users" className="nav-link">Users</Link>
          <button
            className="logout-btn"
            onClick={async () => {
              await authApi.logout();
              router.push('/');
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="admin-main">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3 className="stat-label">Total Orders</h3>
              <p className="stat-value">{stats.totalOrders}</p>
              <p className="stat-change positive">
                {stats.todayOrders} today
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3 className="stat-label">Total Revenue</h3>
              <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
              <p className="stat-change positive">
                ${stats.todayRevenue.toFixed(2)} today
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3 className="stat-label">Pending Orders</h3>
              <p className="stat-value">{stats.pendingOrders}</p>
              <p className="stat-change">
                {stats.processingOrders} processing
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3 className="stat-label">Completed Orders</h3>
              <p className="stat-value">{stats.completedOrders}</p>
              <p className="stat-change positive">
                {((stats.completedOrders / stats.totalOrders) * 100 || 0).toFixed(1)}% completion rate
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="admin-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link href="/admin/products/new" className="action-card">
              <span className="action-icon">➕</span>
              <span className="action-label">Add Product</span>
            </Link>
            <Link href="/admin/orders?status=pending" className="action-card">
              <span className="action-icon">📋</span>
              <span className="action-label">Review Orders</span>
            </Link>
            <Link href="/admin/products" className="action-card">
              <span className="action-icon">📦</span>
              <span className="action-label">Manage Products</span>
            </Link>
            <Link href="/admin/users" className="action-card">
              <span className="action-icon">👥</span>
              <span className="action-label">View Users</span>
            </Link>
          </div>
        </section>

        {/* Recent Orders */}
        <section className="admin-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link href="/admin/orders" className="view-all-link">
              View All →
            </Link>
          </div>
          {ordersError ? (
            <div className="error-message">Failed to load orders</div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">No orders yet</div>
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
                        <span className={`status-badge status-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
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
      </main>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background: #f5f5f5;
        }
        .admin-header {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .admin-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .admin-subtitle {
          margin: 4px 0 0;
          color: #666;
          font-size: 14px;
        }
        .admin-nav {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .nav-link {
          color: #666;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .nav-link:hover {
          background: #f5f5f5;
        }
        .nav-link.active {
          color: #ff1f3d;
          background: rgba(255, 31, 61, 0.1);
          font-weight: 600;
        }
        .logout-btn {
          padding: 8px 16px;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .logout-btn:hover {
          background: #e3002b;
        }
        .admin-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
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
        .stat-content {
          flex: 1;
        }
        .stat-label {
          margin: 0 0 8px;
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .stat-value {
          margin: 0 0 4px;
          font-size: 28px;
          font-weight: 700;
          color: #333;
        }
        .stat-change {
          margin: 0;
          font-size: 12px;
          color: #666;
        }
        .stat-change.positive {
          color: #10b981;
        }
        .admin-section {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .admin-section h2 {
          margin: 0 0 20px;
          font-size: 20px;
          font-weight: 700;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .view-all-link {
          color: #ff1f3d;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .view-all-link:hover {
          text-decoration: underline;
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
          gap: 12px;
          padding: 24px;
          border: 2px dashed #e5e5e5;
          border-radius: 12px;
          text-decoration: none;
          color: #333;
          transition: all 0.2s;
        }
        .action-card:hover {
          border-color: #ff1f3d;
          background: rgba(255, 31, 61, 0.05);
        }
        .action-icon {
          font-size: 32px;
        }
        .action-label {
          font-size: 14px;
          font-weight: 600;
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
        .orders-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #666;
          border-bottom: 1px solid #e5e5e5;
        }
        .orders-table td {
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e5e5e5;
        }
        .orders-table tbody tr:hover {
          background: #f9f9f9;
        }
        .order-link {
          color: #ff1f3d;
          text-decoration: none;
          font-weight: 600;
        }
        .order-link:hover {
          text-decoration: underline;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-pending {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }
        .status-processing {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .status-shipped {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        .status-completed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .status-cancelled {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .action-link {
          color: #ff1f3d;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .action-link:hover {
          text-decoration: underline;
        }
        .error-message,
        .empty-state {
          padding: 40px;
          text-align: center;
          color: #666;
        }
        .error-message {
          color: #ef4444;
        }
        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .admin-nav {
            width: 100%;
            flex-wrap: wrap;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .orders-table-wrapper {
            overflow-x: scroll;
          }
        }
      `}</style>
    </div>
  );
}
