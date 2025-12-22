/**
 * Admin Notifications Page
 * [2025-12-10 00:00:00] 管理员通知页面 - 查看留言本留言
 */
'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiDelete, ApiError } from '@/lib/apiClient';


interface GuestMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  orderNumber: string | null;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  readAt: string | null;
  readBy: string | null;
  readByUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminNotificationsPage() {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GuestMessage | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      // [2025-12-18 23:20:00] 修复：使用完整的 API 路径
      const response = await apiGet<{ data: GuestMessage[]; pagination: Pagination }>(
        '/api/admin/guest-messages',
        params
      );

      setMessages(response.data);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [statusFilter, pagination.page]);

  const handleStatusChange = async (messageId: string, newStatus: 'UNREAD' | 'READ' | 'ARCHIVED') => {
    try {
      // [2025-12-18 23:20:00] 修复：使用完整的 API 路径
      await apiPatch(`/api/admin/guest-messages/${messageId}/status`, { status: newStatus });
      await fetchMessages();
      if (selectedMessage?.id === messageId) {
        // [2025-12-18 23:20:00] 修复：使用完整的 API 路径
        const updated = await apiGet<GuestMessage>(`/api/admin/guest-messages/${messageId}`);
        setSelectedMessage(updated);
      }
    } catch (err) {
      console.error('Failed to update message status:', err);
      alert('Failed to update message status');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      // [2025-12-18 23:20:00] 修复：使用完整的 API 路径
      await apiDelete(`/api/admin/guest-messages/${messageId}`);
      await fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message');
    }
  };

  const unreadCount = messages.filter((m) => m.status === 'UNREAD').length;

  return (
    <>
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Guest Messages</h1>
            <p style={{ color: '#64748b' }}>View and manage messages from the help center guest book</p>
          </div>
          {unreadCount > 0 && (
            <div style={{
              padding: '0.5rem 1rem',
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              color: '#991b1b',
              fontWeight: 'bold',
            }}>
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          {(['ALL', 'UNREAD', 'READ', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(status);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: statusFilter === status ? '#ff1f3d' : '#fff',
                color: statusFilter === status ? '#fff' : '#1f2937',
                cursor: 'pointer',
                fontWeight: statusFilter === status ? 'bold' : 'normal',
              }}
            >
              {status}
              {status === 'UNREAD' && statusFilter !== 'UNREAD' && (
                <span style={{ marginLeft: '0.5rem', background: '#ef4444', color: '#fff', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {messages.filter((m) => m.status === 'UNREAD').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            color: '#991b1b',
          }}>
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No messages found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            {/* Messages List */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      background: selectedMessage?.id === message.id ? '#f3f4f6' : '#fff',
                      ...(message.status === 'UNREAD' && {
                        borderLeft: '4px solid #ff1f3d',
                        fontWeight: 'bold',
                      }),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{message.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{message.email}</div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: message.status === 'UNREAD' ? '#fee2e2' : message.status === 'READ' ? '#dbeafe' : '#f3f4f6',
                        color: message.status === 'UNREAD' ? '#991b1b' : message.status === 'READ' ? '#1e40af' : '#374151',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}>
                        {message.status}
                      </span>
                    </div>
                    {message.subject && (
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                        {message.subject}
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {message.message.substring(0, 100)}...
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                      {new Date(message.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: pagination.page === 1 ? '#f3f4f6' : '#fff',
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ color: '#64748b' }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: pagination.page === pagination.totalPages ? '#f3f4f6' : '#fff',
                      cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Message Detail */}
            {selectedMessage ? (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {selectedMessage.name}
                    </h2>
                    <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>{selectedMessage.email}</div>
                    {selectedMessage.phone && (
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Phone: {selectedMessage.phone}</div>
                    )}
                    {selectedMessage.orderNumber && (
                      <div style={{ color: '#64748b' }}>Order: {selectedMessage.orderNumber}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedMessage.status}
                      onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value as 'UNREAD' | 'READ' | 'ARCHIVED')}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                    >
                      <option value="UNREAD">UNREAD</option>
                      <option value="READ">READ</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedMessage.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedMessage.subject && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Subject:</div>
                    <div>{selectedMessage.subject}</div>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Message:</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{selectedMessage.message}</div>
                </div>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#64748b' }}>
                  <div>Submitted: {new Date(selectedMessage.createdAt).toLocaleString()}</div>
                  {selectedMessage.readAt && (
                    <div>
                      Read: {new Date(selectedMessage.readAt).toLocaleString()}
                      {selectedMessage.readByUser && (
                        <span> by {selectedMessage.readByUser.firstName} {selectedMessage.readByUser.lastName} ({selectedMessage.readByUser.email})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Select a message to view details
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

