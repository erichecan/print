'use client';

/**
 * Admin User Detail Client
 * [2025-11-15 14:35:40] 接入 /api/admin/users/:id 数据
 */
import Link from 'next/link';
import useSWR from 'swr';
import { adminUsersApi } from '@/lib/api';

interface Props {
  id: string;
}

export default function AdminUserDetailClient({ id }: Props) {
  const { data, isLoading, error } = useSWR(['admin-user-detail', id], () => adminUsersApi.get(id));

  if (isLoading) {
    return <div className="admin-table-placeholder">Loading user…</div>;
  }

  if (error || !data) {
    return <div className="admin-table-placeholder error">Failed to load user.</div>;
  }

  const { user, stats, recentOrders } = data;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>User Details</h1>
          <p className="text-muted">Review and manage account information</p>
        </div>
        <button type="button" className="btn btn--outline" disabled>
          Send Password Reset
        </button>
      </div>

      <div className="admin-grid-two">
        <div className="admin-form">
          <h3>Account Information</h3>
          <div className="admin-form-group">
            <label>Full Name</label>
            <input type="text" value={user.fullName} readOnly />
          </div>
          <div className="admin-form-group">
            <label>Email</label>
            <input type="email" value={user.email} readOnly />
          </div>
          <div className="admin-form-group">
            <label>Role</label>
            <select value={user.role} disabled>
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>Status</label>
            <select value={user.emailVerified ? 'Active' : 'Inactive'} disabled>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>Phone</label>
            <input type="tel" value={user.phone || ''} readOnly />
          </div>
        </div>

        <div className="admin-form">
          <h3>Stats</h3>
          <div className="stat-stack">
            <StatRow label="Total Orders" value={stats.totalOrders.toString()} highlight />
            <StatRow label="Total Spent" value={`$${stats.totalSpent.toFixed(2)}`} />
            <StatRow label="Designs Created" value={stats.designsCreated.toString()} />
            <StatRow label="Member Since" value={new Date(stats.memberSince).toLocaleDateString()} />
          </div>
        </div>
      </div>

      <div className="admin-table-wrapper" style={{ marginTop: 24 }}>
        <h3 style={{ padding: '16px 16px 0', margin: 0 }}>Recent Orders</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-placeholder">
                  No orders yet.
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.orderNumber}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>${order.total.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-success">{order.status}</span>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="btn-icon btn--outline" style={{ fontSize: 12 }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-form-actions">
        <Link href="/admin/users" className="btn btn--outline">
          Back to Users
        </Link>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong className={highlight ? 'highlight' : undefined}>{value}</strong>
    </div>
  );
}

