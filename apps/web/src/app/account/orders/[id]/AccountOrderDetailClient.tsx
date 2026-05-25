'use client';

/**
 * Account Order Detail Page
* 供已登录用户查看订单详情、下载发票
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { authApi, ordersApi, AccountOrderDetail } from '@/lib/api'; // Import AccountOrderDetail type from api.ts
import { OrderTimeline } from '@/components/OrderTimeline'; // 导入订单时间线组件
import { ACCOUNT_ROUTES } from '@/lib/routes/account'; // 使用路由映射

export default function AccountOrderDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<AccountOrderDetail | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  // Real-time tracking information
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await authApi.me();
      setUserEmail(profile.email);
      const data = await ordersApi.getById(id);
      setOrder(data);
    } catch (err: any) {
      console.error(' 加载订单失败', err);
      // 区分 404 和其他错误
      if (err?.message?.includes('404') || err?.message?.includes('Not Found') || err?.message?.includes('not found')) {
        setError('NOT_FOUND');
      } else {
        setError('Unable to load this order. Please confirm you are signed in.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Load and poll tracking information
  const loadTrackingInfo = useCallback(async () => {
    if (!order) return;
    setTrackingLoading(true);
    try {
      const data = await ordersApi.getTracking(order.id);
      setTrackingInfo(data);
    } catch (err) {
      console.error(' 加载跟踪信息失败', err);
    } finally {
      setTrackingLoading(false);
    }
  }, [order]);

  useEffect(() => {
    if (order) {
      loadTrackingInfo();
      // Poll tracking info every 30 seconds if order is shipped
      if (order.status === 'SHIPPED' || order.status === 'PROCESSING') {
        const interval = setInterval(() => {
          loadTrackingInfo();
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(interval);
      }
    }
  }, [order, loadTrackingInfo]);

  const handleInvoiceDownload = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const blob = await ordersApi.downloadInvoice(order.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(' 发票下载失败', err);
      alert('Invoice download failed, please retry later.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResendEmail = () => {
    alert('Receipt email will be sent shortly.'); // 后续接入真实邮件 API
  };

  // 订单取消功能
  const handleCancelOrder = async () => {
    if (!order) return;
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    if (!confirm(`Are you sure you want to cancel order #${order.orderNumber}?`)) {
      return;
    }

    setCancelling(true);
    try {
      const updatedOrder = await ordersApi.cancel(order.id, cancelReason.trim());
      setOrder(updatedOrder);
      setShowCancelDialog(false);
      setCancelReason('');
      alert('Order has been cancelled successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      alert(message);
    } finally {
      setCancelling(false);
    }
  };

  // 检查订单是否可以取消
  const canCancel = order && (order.status === 'PENDING' || order.status === 'PROCESSING');

  if (loading) {
    return (
      <section className="container">
        <p>Loading order…</p>
      </section>
    );
  }

  // 404 错误处理：显示友好的空状态
  if (error === 'NOT_FOUND' || (!loading && !order && error)) {
    return (
      <section className="container" style={{ padding: '48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>订单未找到</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          请检查订单号或返回订单列表。
        </p>
        <Link
          href={ACCOUNT_ROUTES.orders}
          className="btn"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '0',
          }}
        >
          返回订单列表
        </Link>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container" style={{ padding: '48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>加载订单失败</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
        <button
          type="button"
          className="btn"
          onClick={() => loadOrder()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
      </section>
    );
  }

  const primaryShipment = order.shipments?.[0];

  return (
    <section className="container">
      <div className="page-header">
        <div>
          <p className="eyebrow">Account • Order</p>
          <h1>Order #{order.orderNumber}</h1>
          <p>
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="badge-group">
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
          <span className={`status-badge payment-${order.paymentStatus}`}>
            Payment {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={handleInvoiceDownload} disabled={downloading}>
          {downloading ? 'Downloading…' : 'Download invoice'}
        </button>
        {canCancel && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setShowCancelDialog(true)}
            disabled={cancelling}
          >
            Cancel order
          </button>
        )}
        <button type="button" className="btn btn--outline" onClick={handleResendEmail}>
          Resend receipt email
        </button>
        <Link
          className="btn btn--outline"
          href={
            (order as any).email || userEmail
              ? `/orders/${order.orderNumber}?email=${encodeURIComponent((order as any).email || userEmail)}`
              : '#'
          }
          onClick={(e) => {
            if (!((order as any).email || userEmail)) {
              e.preventDefault();
              alert('Order email is missing.');
            }
          }}
        >
          Open guest view
        </Link>
        <Link className="btn btn--text" href={ACCOUNT_ROUTES.orders}>
          Back to history
        </Link>
      </div>

      {/* 订单取消对话框 */}
      {showCancelDialog && (
        <div className="modal-overlay" onClick={() => setShowCancelDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cancel Order</h2>
            <p>Please provide a reason for cancelling order #{order.orderNumber}</p>
            <textarea
              className="cancel-reason-input"
              placeholder="e.g., Changed my mind, Found a better deal, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
              >
                Keep order
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="order-grid">
        <div className="order-items">
          <h2>Items</h2>
          <div className="order-items__list">
            {order.items.map((item) => (
              <article key={item.id} className="order-item">
                {item.thumbnail && (
                  <Image
                    src={item.thumbnail}
                    alt={item.productName}
                    width={96}
                    height={96}
                    className="item-thumb"
                  />
                )}
                <div className="item-meta">
                  <h3>{item.productName}</h3>
                  <p>{item.variantDescription}</p>
                  <p>Qty: {item.quantity}</p>
                  <p className="sku">SKU: {item.sku}</p>
                </div>
                <div className="item-price">
                  <span>${item.subtotal.toFixed(2)}</span>
                  <small>${item.unitPrice.toFixed(2)} each</small>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="order-summary">
          <div className="summary-card">
            <h2>Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>${order.shippingCost.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="summary-row">
                <span>Discount</span>
                <span>- ${order.discount.toFixed(2)}</span>
              </div>
            )}
            <hr />
            <div className="summary-row total">
              <span>Total</span>
              <span>${order.total.toFixed(2)} {order.currency}</span>
            </div>
          </div>

          <div className="address-card">
            <h3>Shipping Address</h3>
            <address>
              <p>{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.province}{' '}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
            </address>
          </div>

          <div className="address-card">
            <h3>Billing Address</h3>
            <address>
              <p>{order.billingAddress?.fullName}</p>
              <p>{order.billingAddress?.addressLine1}</p>
              {order.billingAddress?.addressLine2 && <p>{order.billingAddress.addressLine2}</p>}
              <p>
                {order.billingAddress?.city}, {order.billingAddress?.province}{' '}
                {order.billingAddress?.postalCode}
              </p>
              <p>{order.billingAddress?.country}</p>
            </address>
          </div>

          {/* 订单状态时间线 */}
          <OrderTimeline
            events={[
              {
                date: order.createdAt,
                status: 'PENDING',
                description: 'Order placed',
              },
              ...(order.status !== 'PENDING'
                ? [
                  {
                    date: order.updatedAt || order.createdAt,
                    status: order.status,
                    description: `Order ${order.status.toLowerCase()}`,
                  },
                ]
                : []),
            ]}
            currentStatus={order.status}
          />

          {/* Enhanced tracking information with real-time updates */}
          {(trackingInfo || primaryShipment) && (
            <div className="tracking-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3>订单跟踪</h3>
                {trackingLoading && (
                  <span style={{ fontSize: '0.85em', color: '#64748b' }}>更新中...</span>
                )}
                {trackingInfo?.lastUpdated && (
                  <span style={{ fontSize: '0.85em', color: '#64748b' }}>
                    最后更新: {new Date(trackingInfo.lastUpdated).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>

              {trackingInfo?.trackingNumber && (
                <div className="tracking-number-section" style={{ marginBottom: '16px' }}>
                  <p>
                    <strong>跟踪号:</strong> {trackingInfo.trackingNumber}
                  </p>
                  <button
                    type="button"
                    className="btn-copy-tracking"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(trackingInfo.trackingNumber || '');
                        alert('跟踪号已复制到剪贴板');
                      } catch (err) {
                        console.error(' 复制跟踪号失败', err);
                      }
                    }}
                  >
                    复制
                  </button>
                </div>
              )}

              {trackingInfo?.carrier && (
                <p style={{ marginBottom: '8px' }}>
                  <strong>承运商:</strong> {trackingInfo.carrier}
                </p>
              )}

              {trackingInfo?.estimatedDelivery && (
                <p style={{ marginBottom: '16px' }}>
                  <strong>预计送达:</strong> {new Date(trackingInfo.estimatedDelivery).toLocaleDateString('zh-CN')}
                </p>
              )}

              {/* Tracking events timeline */}
              {trackingInfo?.events && trackingInfo.events.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '0.95em', fontWeight: 600 }}>跟踪事件</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {trackingInfo.events.map((event: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          backgroundColor: index === 0 ? '#f0f9ff' : '#f8fafc',
                          borderRadius: '0',
                          borderLeft: index === 0 ? '3px solid #000' : '3px solid var(--color-border, #DBDBDB)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: index === 0 ? 600 : 400 }}>
                              {event.description}
                            </p>
                            {event.location && (
                              <p style={{ margin: 0, fontSize: '0.85em', color: '#64748b' }}>{event.location}</p>
                            )}
                          </div>
                          <span style={{ fontSize: '0.85em', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                            {new Date(event.date).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {primaryShipment?.labelUrl && (
                <Link className="btn btn--outline" href={primaryShipment.labelUrl} target="_blank">
                  Download label
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>

      <style jsx>{`
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 64px 16px;
          display: grid;
          gap: 32px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          color: #64748b;
          margin: 0 0 4px 0;
        }
        .badge-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.85rem;
        }
        .status-pending {
          background: rgba(245, 158, 11, 0.15);
          color: #b45309;
        }
        .status-processing {
          background: rgba(0, 0, 0, 0.06);
          color: var(--color-text, #121212);
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
        .payment-failed,
        .payment-refunded {
          background: rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
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
          background: #B40C1C;
          color: #fff;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn--outline {
          border: 1px solid #d4d7de;
          background: transparent;
          color: #1f2937;
        }
        .btn--text {
          background: transparent;
          color: var(--color-accent, #B40C1C);
          padding: 0.75rem;
        }
        .order-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
        }
        .order-items__list {
          display: grid;
          gap: 16px;
        }
        .order-item {
          display: flex;
          gap: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 0;
          padding: 16px;
          background: #fff;
        }
        .item-thumb {
          border-radius: 0;
          object-fit: cover;
        }
        .item-meta h3 {
          margin: 0 0 4px 0;
        }
        .item-meta p {
          margin: 2px 0;
          color: #475569;
        }
        .item-meta .sku {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .item-price {
          margin-left: auto;
          text-align: right;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          font-weight: 600;
        }
        .item-price small {
          font-weight: 400;
          color: #94a3b8;
        }
        .order-summary {
          display: grid;
          gap: 16px;
        }
        .summary-card,
        .address-card,
        .tracking-card {
          border-radius: 0;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }
        .summary-row.total {
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 12px;
        }
        address {
          font-style: normal;
          color: #475569;
        }
        address p {
          margin: 4px 0;
        }
        .error {
          color: #b91c1c;
        }
        .btn--danger {
          background: #ef4444;
          color: #ffffff;
        }
        .btn--danger:hover {
          background: #dc2626;
        }
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
          padding: 20px;
        }
        .modal-content {
          background: #ffffff;
          border-radius: 0;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-content h2 {
          margin: 0 0 12px 0;
          font-size: 1.5rem;
        }
        .modal-content p {
          margin: 0 0 16px 0;
          color: #64748b;
        }
        .cancel-reason-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d4d7de;
          border-radius: 0;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 20px;
        }
        .cancel-reason-input:focus {
          outline: none;
          border-color: var(--color-text, #121212);
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .tracking-number-section {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
        }
        .btn-copy-tracking {
          padding: 4px 12px;
          background: #ffffff;
          border: 1px solid #d4d7de;
          border-radius: 0;
          font-size: 0.875rem;
          color: #475569;
          cursor: pointer;
        }
        .btn-copy-tracking:hover {
          background: #f1f5f9;
        }
        @media (max-width: 960px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
          .order-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .item-price {
            margin-left: 0;
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}


