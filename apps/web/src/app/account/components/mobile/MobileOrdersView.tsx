/**
 * Mobile Orders View Component
 * 移动端订单列表视图
 */
'use client';

import Link from 'next/link';

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

interface MobileOrdersViewProps {
    orders: AccountOrderSummary[];
    pagination: Pagination;
    loading: boolean;
    downloading: string | null;
    error: string | null;
    handleDownload: (orderId: string, orderNumber: string) => void;
    goToPage: (page: number) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    statusFilter: string;
    setStatusFilter: (val: string) => void;
    paymentStatusFilter: string;
    setPaymentStatusFilter: (val: string) => void;
}

export function MobileOrdersView({
    orders,
    pagination,
    loading,
    downloading,
    error,
    handleDownload,
    goToPage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
}: MobileOrdersViewProps) {
    if (loading && orders.length === 0) {
        return <div className="mobile-view__loading">Loading orders...</div>;
    }

    if (error) {
        return (
            <div className="mobile-view__error">
                <p>{error}</p>
                <button onClick={() => goToPage(1)}>Retry</button>
            </div>
        );
    }

    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <h1>Order History</h1>
                <div className="mobile-view__search">
                    <input
                        type="text"
                        placeholder="Search order #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="mobile-view__filters">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                </select>
                <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                    <option value="">All Payments</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            {orders.length === 0 ? (
                <div className="mobile-view__empty">
                    <p>No orders found.</p>
                    <Link href="/products" className="mobile-view__btn">Start Shopping</Link>
                </div>
            ) : (
                <div className="mobile-view__list">
                    {orders.map((order) => (
                        <div key={order.id} className="order-card-mobile">
                            <div className="order-card-mobile__header">
                                <div>
                                    <span className="order-card-mobile__number">Order #{order.orderNumber}</span>
                                    <span className="order-card-mobile__date">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="order-card-mobile__status">
                                    <span className={`badge badge--${order.status.toLowerCase()}`}>{order.status}</span>
                                </div>
                            </div>

                            <div className="order-card-mobile__body">
                                <div className="order-card-mobile__info">
                                    <span>{order.itemCount} items</span>
                                    <span className="order-card-mobile__total">
                                        ${order.total.toFixed(2)} {order.currency}
                                    </span>
                                </div>
                                <div className="order-card-mobile__actions">
                                    <Link href={`/account/orders/${order.id}`} className="mobile-view__btn mobile-view__btn--outline">
                                        View
                                    </Link>
                                    <button
                                        className="mobile-view__btn"
                                        onClick={() => handleDownload(order.id, order.orderNumber)}
                                        disabled={downloading === order.id}
                                    >
                                        {downloading === order.id ? '...' : 'Invoice'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className="mobile-view__pagination">
                    <button disabled={pagination.page === 1} onClick={() => goToPage(pagination.page - 1)}>
                        Prev
                    </button>
                    <span>{pagination.page} / {pagination.totalPages}</span>
                    <button disabled={pagination.page === pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>
                        Next
                    </button>
                </div>
            )}

            <style jsx>{`
        .mobile-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mobile-view__header h1 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .mobile-view__search input {
          width: 100%;
          padding: 10px 16px;
          border: 1px solid var(--color-border, #DBDBDB);
          border-radius: 0;
          font-size: 14px;
        }
        .mobile-view__filters {
          display: flex;
          gap: 8px;
        }
        .mobile-view__filters select {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--color-border, #DBDBDB);
          border-radius: 0;
          font-size: 13px;
          background: #fff;
        }
        .order-card-mobile {
          background: #fff;
          border: 1px solid var(--color-border, #DBDBDB);
          border-radius: 0;
          padding: 16px;
          margin-bottom: 12px;
          
        }
        .order-card-mobile__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 8px;
        }
        .order-card-mobile__number {
          display: block;
          font-weight: 600;
          font-size: 15px;
        }
        .order-card-mobile__date {
          font-size: 12px;
          color: #6b7280;
        }
        .badge {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .badge--pending { background: #fef3c7; color: #92400e; }
        .badge--processing { background: #dbeafe; color: #1e40af; }
        .badge--shipped { background: #d1fae5; color: #065f46; }
        .badge--delivered { background: #d1fae5; color: #065f46; }
        .order-card-mobile__info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .order-card-mobile__total {
          font-weight: 700;
          color: #111827;
        }
        .order-card-mobile__actions {
          display: flex;
          gap: 8px;
        }
        .mobile-view__btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 0;
          font-weight: 600;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: #B40C1C;
          color: #fff;
        }
        .mobile-view__btn--outline {
          background: transparent;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .mobile-view__pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
        }
        .mobile-view__pagination button {
          padding: 6px 12px;
          border-radius: 0;
          border: 1px solid #d1d5db;
          background: #fff;
          font-size: 13px;
        }
        .mobile-view__loading, .mobile-view__error, .mobile-view__empty {
          text-align: center;
          padding: 48px 16px;
          color: #6b7280;
        }
      `}</style>
        </div>
    );
}
