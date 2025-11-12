'use client';

/**
 * Account Order Detail Page
 * [2025-11-12 01:12:05] 供已登录用户查看订单详情、下载发票
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { authApi, ordersApi } from '@/lib/api';

interface AccountOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: any;
  billingAddress?: any;
  items: Array<{
    id: string;
    sku: string;
    productName: string;
    variantDescription: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    thumbnail?: string | null;
  }>;
  shipments?: Array<{
    id: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    status: string;
    labelUrl?: string | null;
    createdAt: string;
  }>;
}

export default function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<AccountOrderDetail | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await authApi.me();
      setUserEmail(profile.email);
      const data = await ordersApi.getById(params.id);
      setOrder(data);
    } catch (err) {
      console.error('[2025-11-12 01:12:05] 加载订单失败', err);
      setError('Unable to load this order. Please confirm you are signed in.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

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
      console.error('[2025-11-12 01:12:05] 发票下载失败', err);
      alert('Invoice download failed, please retry later.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResendEmail = () => {
    alert('Receipt email will be sent shortly.'); // [2025-11-12 01:12:05] 后续接入真实邮件 API
  };

  if (loading) {
    return (
      <section className="container">
        <p>Loading order…</p>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="container">
        <h1>Order details</h1>
        <p className="error">{error || 'Order not found.'}</p>
        <button type="button" className="btn" onClick={() => router.back()}>
          Back
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
        <button type="button" className="btn btn--outline" onClick={handleResendEmail}>
          Resend receipt email
        </button>
        <Link
          className="btn btn--outline"
          href={`/orders/${order.orderNumber}?email=${encodeURIComponent(userEmail)}`}
        >
          Open guest view
        </Link>
        <Link className="btn btn--text" href="/account/orders">
          Back to history
        </Link>
      </div>

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

          {primaryShipment && (
            <div className="tracking-card">
              <h3>Tracking</h3>
              <p>
                <strong>Status:</strong> {primaryShipment.status}
              </p>
              {primaryShipment.carrier && (
                <p>
                  <strong>Carrier:</strong> {primaryShipment.carrier}
                </p>
              )}
              {primaryShipment.trackingNumber && (
                <p>
                  <strong>Tracking #:</strong> {primaryShipment.trackingNumber}
                </p>
              )}
              {primaryShipment.labelUrl && (
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
          background: #ff1f3d;
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
          color: #2563eb;
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
          border-radius: 12px;
          padding: 16px;
          background: #fff;
        }
        .item-thumb {
          border-radius: 8px;
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
          border-radius: 12px;
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


