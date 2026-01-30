'use client';

/**
 * Account Orders Page
* 展示已登录用户的订单历史，支持发票下载
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ordersApi, type AccountOrderDetail } from '@/lib/api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileOrdersView } from '../components/mobile/MobileOrdersView';

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
  // 添加筛选和搜索状态
  // Enhanced with payment status filter
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt_desc');
  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOrders = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        // Enhanced: Pass search, paymentStatus to API
        const data = await ordersApi.list(
          page,
          pagination.limit,
          statusFilter || undefined,
          sortBy,
          debouncedSearchQuery.trim() || undefined,
          paymentStatusFilter || undefined
        );
        let filteredOrders: AccountOrderSummary[] = [];
        if ('orders' in data) {
          filteredOrders = (data.orders || []).map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            currency: order.currency,
            createdAt: order.createdAt,
            // Use _count from API if available, otherwise fallback to items length
            itemCount: order.itemCount !== undefined ? order.itemCount : (order.items?.length || 0),
            thumbnail: order.thumbnail || order.items?.[0]?.thumbnail || null,
          }));
        } else if ('data' in data) {
          filteredOrders = (data.data || []).map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            currency: order.currency,
            createdAt: order.createdAt,
            itemCount: order.itemCount !== undefined ? order.itemCount : (order.items?.length || 0),
            thumbnail: order.thumbnail || order.items?.[0]?.thumbnail || null,
          }));
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
    [pagination.limit, statusFilter, paymentStatusFilter, sortBy, debouncedSearchQuery] // Use debouncedSearchQuery
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

  // Refetch orders when filters change
  useEffect(() => {
    fetchOrders(1);
  }, [debouncedSearchQuery, statusFilter, paymentStatusFilter, sortBy]);

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
      console.error(' 发票下载失败', err);
      alert('Unable to download invoice. Please try again later.');
    } finally {
      setDownloading(null);
    }
  };

  const goToPage = (page: number) => {
    if (page === pagination.page || page < 1 || page > pagination.totalPages) return;
    fetchOrders(page);
  };

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileOrdersView
        orders={orders}
        pagination={pagination}
        loading={loading}
        downloading={downloading}
        error={error}
        handleDownload={handleDownload}
        goToPage={goToPage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentStatusFilter={paymentStatusFilter}
        setPaymentStatusFilter={setPaymentStatusFilter}
      />
    );
  }

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
    <section className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">Account</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order History</h1>
          <p className="text-gray-500 mt-1">Review past orders, download invoices, and jump into detailed receipts.</p>
        </div>
      </header>

      {/* Enhanced Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="space-y-1.5">
              <label htmlFor="search" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
              <input
                id="search"
                type="text"
                placeholder="Order # or email..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 py-2 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 py-2 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="paymentStatus" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</label>
              <select
                id="paymentStatus"
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 py-2 transition-all"
              >
                <option value="">All Payments</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sort" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</label>
              <select
                id="sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 py-2 transition-all"
              >
                <option value="createdAt_desc">Newest First</option>
                <option value="createdAt_asc">Oldest First</option>
                <option value="total_desc">Amount High to Low</option>
                <option value="total_asc">Amount Low to High</option>
                <option value="orderNumber_asc">Order # Ascending</option>
                <option value="orderNumber_desc">Order # Descending</option>
              </select>
            </div>
          </div>

          {(debouncedSearchQuery || statusFilter || paymentStatusFilter) && (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPaymentStatusFilter('');
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📦</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No orders found</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            We couldn't find any orders matching your criteria. Try adjusting your filters or browse our products to start a new order.
          </p>
          <Link href="/products" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-600 transition-all hover:-translate-y-0.5">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <article key={order.id} className="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">
                      Order #{order.orderNumber}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase
                      ${order.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                        order.status === 'SHIPPED' ? 'bg-emerald-50 text-emerald-700' :
                          order.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                              'bg-amber-50 text-amber-900'
                      }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</span>
                      <span className="font-medium text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Items</span>
                      <span className="font-medium text-gray-900">{order.itemCount} items</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</span>
                      <span className="font-bold text-gray-900">
                        ${order.total.toFixed(2)} {order.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-0 border-gray-100 w-full md:w-auto">
                  <Link
                    href={`/orders/${order.orderNumber}?email=${encodeURIComponent(userEmail)}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all hover:shadow-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8">
          <button
            type="button"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}


