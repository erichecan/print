'use client';

/**
 * Admin User Detail Client
* 接入 /api/admin/users/:id 数据
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { adminUsersApi } from '@/lib/api';

interface Props {
  id: string;
}

export default function AdminUserDetailClient({ id }: Props) {
  const router = useRouter();
  const { data, isLoading, error } = useSWR(['admin-user-detail', id], () => adminUsersApi.get(id));

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false); // New state for Edit Role
  const [selectedRole, setSelectedRole] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    try {
      await adminUsersApi.resetPassword(id, newPassword);
      alert('Password reset successfully');
      setIsResetPasswordOpen(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await adminUsersApi.delete(id);
      alert('User deleted successfully');
      router.push('/admin/users');
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
      setIsDeleting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    try {
      await adminUsersApi.updateRole(id, selectedRole);
      await mutate(['admin-user-detail', id]);
      alert('Role updated successfully');
      setIsEditRoleOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const openEditRole = () => {
    setSelectedRole(data?.user.role || 'CUSTOMER');
    setIsEditRoleOpen(true);
  };

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setIsResetPasswordOpen(true)}
          >
            Reset Password
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDeleteUser}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={user.role} disabled className="flex-1">
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={openEditRole}
              >
                Edit
              </button>
            </div>
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


      {/* Reset Password Modal */}
      {
        isResetPasswordOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Reset Password</h3>
              <p>Enter a new password for this user.</p>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min 8 chars)"
                  className="config-input"
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="btn btn--outline" onClick={() => setIsResetPasswordOpen(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleResetPassword}>Reset Password</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Role Modal */}
      {
        isEditRoleOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Edit User Role</h3>
              <p>Select a new role for this user.</p>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="btn btn--outline" onClick={() => setIsEditRoleOpen(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleUpdateRole}>Save Role</button>
              </div>
            </div>
          </div>
        )
      }

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .btn--danger {
            background-color: #ef4444;
            color: white;
            border: none;
        }
        .btn--danger:hover {
            background-color: #dc2626;
        }
        .btn--sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
      `}</style>
    </div >
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

