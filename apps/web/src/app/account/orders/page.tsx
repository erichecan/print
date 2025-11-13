'use client';

/**
 * Account Orders Page
 * [2025-11-12 01:10:12] 展示已登录用户的订单历史，支持发票下载
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ordersApi, type AccountOrderDetail } from '@/lib/api';

interface AccountOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  thumbnail?: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AccountOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AccountOrderSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  // [2025-01-27 12:10:00] 添加筛选和搜索状态
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');

  const fetchOrders = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        // [2025-01-27 14:10:00] 添加搜索查询支持（如果API支持）
        const data = await ordersApi.list(page, pagination.limit, statusFilter || undefined, sortBy);
        let filteredOrders: AccountOrderSummary[] = [];
        if ('orders' in data) {
          filteredOrders = (data.orders || []).map((order: AccountOrderDetail) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            currency: order.currency,
            createdAt: order.createdAt,
            itemCount: order.items?.length || 0,
            thumbnail: order.items?.[0]?.thumbnail || null,
          }));
        } else if ('data' in data) {
          filteredOrders = (data.data || []).map((order: AccountOrderDetail) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            currency: order.currency,
            createdAt: order.createdAt,
            itemCount: order.items?.length || 0,
            thumbnail: order.items?.[0]?.thumbnail || null,
          }));
        }
        
        // [2025-01-27 14:10:00] 前端搜索过滤（如果后端不支持搜索）
        if (searchQuery.trim()) {
          filteredOrders = filteredOrders.filter((order: AccountOrderSummary) =>
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase().trim())
          );
        }
        
        setOrders(filteredOrders);
        const paginationData = 'pagination' in data ? data.pagination : undefined;
        setPagination(paginationData || { page, limit: pagination.limit, total: filteredOrders.length, totalPages: 1 });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load orders.');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, statusFilter, sortBy, searchQuery] // [2025-01-27 14:10:00] 添加 searchQuery 依赖
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const profile = await authApi.me();
        if (cancelled) return;
        setUserEmail(profile.email);
        await fetchOrders(1);
      } catch {
        if (cancelled) return;
        router.replace('/login?redirect=/account/orders');
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchOrders, router]);

  const handleDownload = async (orderId: string, orderNumber: string) => {
    setDownloading(orderId);
    try {
      const blob = await ordersApi.downloadInvoice(orderId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[2025-11-12 01:10:12] 发票下载失败', err);
      alert('Unable to download invoice. Please try again later.');
    } finally {
      setDownloading(null);
    }
  };

  const goToPage = (page: number) => {
    if (page === pagination.page || page < 1 || page > pagination.totalPages) return;
    fetchOrders(page);
  };

  if (loading && orders.length === 0) {
    return (
      <section className="container">
        <p>Loading your orders…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container">
        <h1>Orders</h1>
        <p className="error">{error}</p>
        <button type="button" className="btn" onClick={() => fetchOrders(1)}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Order History</h1>
          <p>Review past orders, download invoices, and jump into detailed receipts.</p>
        </div>
        <Link className="btn btn--outline" href="/checkout/success">
          View latest order tips
        </Link>
      </header>

      {/* [2025-01-27 12:10:00] 添加筛选和搜索功能 */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="search">Search orders</label>
            <input
              id="search"
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="status">Filter by status</label>
            <select
              id="status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                fetchOrders(1);
              }}
              className="filter-select"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="sort">Sort by</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                fetchOrders(1);
              }}
              className="filter-select"
            >
              <option value="createdAt_desc">Newest first</option>
              <option value="createdAt_asc">Oldest first</option>
              <option value="total_desc">Highest amount</option>
              <option value="total_asc">Lowest amount</option>
            </select>
          </div>
        </div>
        {searchQuery && (
          <div className="search-results-info">
            <span>Searching for: &quot;{searchQuery}&quot;</span>
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => {
                setSearchQuery('');
                fetchOrders(1);
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>
            When you place an order it will appear here. Ready to start?{' '}
            <Link href="/products">Browse products</Link>
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card__header">
                <div>
                  <h2>Order #{order.orderNumber}</h2>
                  <p>
                    Placed on{' '}
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="status-group">
                  <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  <span className={`status-badge payment-${order.paymentStatus}`}>
                    Payment {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="order-card__body">
                <div className="order-card__meta">
                  <p>{order.itemCount} items</p>
                  <p className="order-total">
                    ${order.total.toFixed(2)} {order.currency}
                  </p>
                </div>
                <div className="order-card__actions">
                  <Link href={`/account/orders/${order.id}`} className="btn btn--outline">
                    View details
                  </Link>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleDownload(order.id, order.orderNumber)}
                    disabled={downloading === order.id}
                  >
                    {downloading === order.id ? 'Downloading…' : 'Download invoice'}
                  </button>
                  <Link
                    href={`/orders/${order.orderNumber}?email=${encodeURIComponent(userEmail)}`}
                    className="btn btn--text"
                  >
                    Share guest link
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 960px;
          margin: 0 auto;
          padding: 64px 16px;
          display: grid;
          gap: 24px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          margin: 0 0 4px 0;
          color: #64748b;
        }
        h1 {
          margin: 0 0 8px 0;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: 999px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          background: #ff1f3d;
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn--outline {
          background: transparent;
          border: 1px solid #d4d7de;
          color: #1f2937;
        }
        .btn--text {
          background: transparent;
          color: #2563eb;
          padding: 0.75rem;
        }
        .orders-list {
          display: grid;
          gap: 24px;
        }
        .order-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          display: grid;
          gap: 16px;
        }
        .order-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .status-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
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
        .payment-refunded,
        .payment-failed {
          background: rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }
        .order-card__body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .order-card__meta {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
          color: #334155;
        }
        .order-total {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .order-card__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .empty-state {
          padding: 48px;
          background: #f1f5f9;
          border-radius: 16px;
          text-align: center;
        }
        .pagination {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: center;
        }
        .pagination-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 999px;
          border: 1px solid #d4d7de;
          background: #fff;
          cursor: pointer;
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          color: #b91c1c;
        }
        .filters-section {
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .filters-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
          align-items: end;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }
        .filter-input,
        .filter-select {
          padding: 10px 12px;
          border: 1px solid #d4d7de;
          border-radius: 8px;
          font-size: 0.95rem;
          background: #ffffff;
        }
        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .search-results-info {
          margin-top: 12px;
          padding: 12px;
          background: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
          color: #475569;
        }
        .btn-clear-search {
          padding: 4px 12px;
          background: transparent;
          border: 1px solid #d4d7de;
          border-radius: 6px;
          color: #475569;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-clear-search:hover {
          background: #f1f5f9;
        }
        @media (max-width: 768px) {
          .filters-row {
            grid-template-columns: 1fr;
          }
          .order-card__header {
            flex-direction: column;
            align-items: flex-start;
          }
          .order-card__meta {
            flex-direction: column;
            gap: 8px;
          }
          .order-card__actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </section>
  );
}


