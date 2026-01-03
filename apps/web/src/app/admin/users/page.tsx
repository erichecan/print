'use client';

/**
 * Admin Users Page
* 接入后端 /api/admin/users，支持筛选与分页
* 添加创建用户功能
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { adminUsersApi, AdminUserSummary } from '@/lib/api';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

type RemoteFilters = {
  page: number;
  search: string;
  role: 'all' | 'customer' | 'admin';
  status: 'all' | 'active' | 'inactive';
};

const remoteDefaults: RemoteFilters = {
  page: 1,
  search: '',
  role: 'all',
  status: 'all',
};

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<RemoteFilters>(remoteDefaults);
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // 模态框状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserSummary | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const swrKey = useMemo(() => ['admin-users', filters], [filters]);

  const { data, isLoading, error } = useSWR(swrKey, ([, params]) => {
    const p = params as RemoteFilters;
    return adminUsersApi.list({
      page: p.page,
      search: p.search || undefined,
      role: p.role === 'all' ? undefined : p.role,
      status: p.status === 'all' ? undefined : p.status,
    });
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1, search: searchDraft.trim() }));
  };

  const handleRoleChange = (value: RemoteFilters['role']) => {
    setFilters((prev) => ({ ...prev, page: 1, role: value }));
  };

  const handleStatusChange = (value: RemoteFilters['status']) => {
    setFilters((prev) => ({ ...prev, page: 1, status: value }));
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const allSelected = users.length > 0 && users.every((user) => selectedIds.has(user.id));

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(users.map((user) => user.id)));
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const totalPages = pagination?.totalPages ?? 1;
  const canPrev = filters.page > 1;
  const canNext = filters.page < totalPages;

  // 用户创建成功后的回调
  const handleUserCreated = () => {
    // 刷新用户列表
    mutate(swrKey);
    // 如果当前页有筛选，可能需要回到第一页
    if (filters.search || filters.role !== 'all' || filters.status !== 'all') {
      setFilters((prev) => ({ ...prev, page: 1 }));
    }
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const requests = Array.from(selectedIds).map((id) => adminUsersApi.delete(id));
      await Promise.all(requests);
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      mutate(swrKey);
    } catch (err: any) {
      alert(err.message || 'Bulk delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await adminUsersApi.delete(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      mutate(swrKey);
    } catch (err: any) {
      alert(err.message || 'Delete user failed');
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="users">Users</h1>
          <p className="text-muted">Manage customer and admin accounts</p>
        </div>
        <div className="admin-btn-group">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Invite User
          </button>
        </div>
      </div>

      {/* 创建用户模态框 */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleUserCreated}
      />

      <div className="admin-filters admin-filters--wrap">
        <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select value={filters.role} onChange={(event) => handleRoleChange(event.target.value as RemoteFilters['role'])}>
          <option value="all">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) => handleStatusChange(event.target.value as RemoteFilters['status'])}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="admin-table-wrapper" data-api="/api/admin/users" data-method="GET">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading users…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load users.</div>
        ) : users.length === 0 ? (
          <div className="admin-table-placeholder">No users match current filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} />
                </th>
                <th data-i18n="user">User</th>
                <th data-i18n="email">Email</th>
                <th data-i18n="role">Role</th>
                <th data-i18n="orders">Orders</th>
                <th>Total Spent</th>
                <th data-i18n="status">Status</th>
                <th data-i18n="joined">Joined</th>
                <th data-i18n="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} data-entity="user" data-id={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={(event) => toggleOne(user.id, event.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="user-listing">
                      <div className="admin-user-avatar" aria-hidden="true" />
                      <div>
                        <div className="product-name">{user.fullName}</div>
                        <div className="product-slug">ID: {user.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={user.role === 'ADMIN' ? 'badge badge-error' : 'badge badge-info'}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Customer'}
                    </span>
                  </td>
                  <td>{user.orderCount}</td>
                  <td>{formatCurrency(user.totalSpent)}</td>
                  <td>
                    <span className={user.emailVerified ? 'badge badge-success' : 'badge badge-pending'}>
                      {user.emailVerified ? 'Active' : 'Invite Pending'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/admin/users/${user.id}`} className="btn-icon btn--outline" style={{ fontSize: 12 }}>
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(user);
                          setIsDeleteModalOpen(true);
                        }}
                        className="btn-icon btn--outline text-danger"
                        style={{ fontSize: 12, color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && (
        <div className="admin-pagination">
          <button type="button" disabled={!canPrev} onClick={() => canPrev && goToPage(filters.page - 1)}>
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === filters.page ? 'active' : undefined}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
          <button type="button" disabled={!canNext} onClick={() => canNext && goToPage(filters.page + 1)}>
            Next
          </button>
        </div>
      )}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        itemName={userToDelete?.fullName || userToDelete?.email}
        description="Are you sure you want to delete this user? This action cannot be undone."
      />
      <DeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={executeBulkDelete}
        title="Delete Selected Users"
        description={`Are you sure you want to delete ${selectedIds.size} selected users? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Users`}
      />
    </div>
  );
}
