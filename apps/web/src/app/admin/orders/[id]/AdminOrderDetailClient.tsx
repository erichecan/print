'use client';

/**
 * Admin Order Detail Page
 * [2025-11-12 01:27:20] 支持状态更新、退款标记与详情查看
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  adminOrdersApi,
  AdminOrderSummary,
  AdminOrderUpdatePayload,
  AdminOrderRefundPayload,
  AdminAuditLogEntry,
} from '@/lib/api';

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_OPTIONS = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

export default function AdminOrderDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, mutate, isLoading } = useSWR(['admin-order', id], ([, id]) =>
    adminOrdersApi.get(id)
  );

  const [form, setForm] = useState<AdminOrderUpdatePayload>({
    status: undefined,
    paymentStatus: undefined,
    trackingNumber: undefined,
    carrier: undefined,
    estimatedDelivery: undefined,
  });
  const [updating, setUpdating] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundNote, setRefundNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { data: auditLogResponse } = useSWR(
    data?.id ? ['admin-order-audit', data.id] : null,
    ([, orderId]) => adminOrdersApi.auditTrail(orderId, { limit: 20 })
  );

  const auditLogs = (auditLogResponse as any)?.data ?? [];

  const describeAuditEntry = (log: AdminAuditLogEntry) => {
    const meta = (log.meta || {}) as Record<string, any>;
    if (log.action === 'order.update_status') {
      const changes = (meta.changes || {}) as Record<string, any>;
      const parts: string[] = [];
      if (changes.status) {
        parts.push(`状态调整为 ${String(changes.status).toUpperCase()}`);
      }
      if (changes.paymentStatus) {
        parts.push(`支付状态 ${String(changes.paymentStatus).toUpperCase()}`);
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'trackingNumber')) {
        parts.push(`跟踪号 ${changes.trackingNumber || '已清空'}`);
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'carrier')) {
        parts.push(`承运方 ${changes.carrier || '未指定'}`);
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'estimatedDelivery')) {
        parts.push(`预计送达 ${changes.estimatedDelivery || '未设置'}`);
      }
      return parts.join('，') || '更新了订单状态';
    }
    if (log.action === 'order.refund') {
      const reason = meta.reason ? `（原因：${meta.reason}）` : '';
      return `标记订单为退款${reason}`;
    }
    return log.action;
  };

  useEffect(() => {
    if (data) {
      setForm({
        status: data.status,
        paymentStatus: data.paymentStatus,
        trackingNumber: data.shipments?.[0]?.trackingNumber || '',
        carrier: data.shipments?.[0]?.carrier || '',
        estimatedDelivery: data.shipments?.[0]?.createdAt
          ? new Date(data.shipments[0].createdAt).toISOString().slice(0, 10)
          : '',
      });
    }
  }, [data]);

  const handleUpdate = async () => {
    if (!data) return;
    setUpdating(true);
    setMessage(null);
    try {
      const payload: AdminOrderUpdatePayload = {
        status: form.status,
        paymentStatus: form.paymentStatus,
        trackingNumber: form.trackingNumber || null,
        carrier: form.carrier || null,
        estimatedDelivery: form.estimatedDelivery || null,
      };
      await adminOrdersApi.updateStatus(data.id, payload);
      await mutate();
      setMessage('Order updated successfully.');
    } catch (err) {
      console.error('[2025-11-12 01:27:20] 更新订单失败', err);
      setMessage('Failed to update order. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRefund = async () => {
    if (!data) return;
    const confirmMsg = refundNote
      ? `Confirm marking order ${data.orderNumber} as refunded? Note: ${refundNote}`
      : `Confirm marking order ${data.orderNumber} as refunded?`;
    if (!confirm(confirmMsg)) return;

    setRefundLoading(true);
    setMessage(null);
    try {
      const payload: AdminOrderRefundPayload = refundNote ? { reason: refundNote } : {};
      await adminOrdersApi.recordRefund(data.id, payload);
      setRefundNote('');
      await mutate();
      setMessage('Order marked as refunded.');
    } catch (err) {
      console.error('[2025-11-12 01:27:20] 退款标记失败', err);
      setMessage('Failed to mark refund. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const order: AdminOrderSummary | undefined = data;

  return (
    <AdminShell>
      <section className="order-page">
        <Link href="/admin/orders" className="btn btn--text">
          ← Back to orders
        </Link>

        {isLoading ? (
          <div className="card">
            <p>Loading order…</p>
          </div>
        ) : error || !order ? (
          <div className="card">
            <h1>Order not found</h1>
            <p>We couldn&apos;t load this order. The order may have been removed.</p>
          </div>
        ) : (
          <div className="order-grid">
            <div className="order-column">
              <div className="card">
                <header className="card__header">
                  <div>
                    <p className="eyebrow">Order</p>
                    <h1>#{order.orderNumber}</h1>
                    <p className="muted">
                      Placed {new Date(order.createdAt).toLocaleString()} · {order.itemCount} items
                    </p>
                  </div>
                  <div className="badge-group">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                    <span className={`status-badge payment-${order.paymentStatus.toLowerCase()}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </header>

                <div className="card__section">
                  <h2>Status & Tracking</h2>
                  <div className="form-grid">
                    <label>
                      Fulfillment status
                      <select
                        value={form.status || ''}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, status: event.target.value || undefined }))
                        }
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Payment status
                      <select
                        value={form.paymentStatus || ''}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, paymentStatus: event.target.value || undefined }))
                        }
                      >
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tracking number
                      <input
                        type="text"
                        value={form.trackingNumber || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                      />
                    </label>
                    <label>
                      Carrier
                      <input
                        type="text"
                        value={form.carrier || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, carrier: event.target.value }))}
                      />
                    </label>
                    <label>
                      Estimated delivery
                      <input
                        type="date"
                        value={form.estimatedDelivery || ''}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, estimatedDelivery: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="actions">
                    <button type="button" className="btn" onClick={handleUpdate} disabled={updating}>
                      {updating ? 'Saving…' : 'Save updates'}
                    </button>
                  </div>
                </div>

                <div className="card__section">
                  <h2>Refund</h2>
                  <label className="textarea-label">
                    Add internal note (optional)
                    <textarea
                      rows={3}
                      value={refundNote}
                      onChange={(event) => setRefundNote(event.target.value)}
                      placeholder="Reason for refund or internal note"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleRefund}
                    disabled={refundLoading}
                  >
                    {refundLoading ? 'Marking…' : 'Mark as refunded'}
                  </button>
                </div>

                {message && <div className="message">{message}</div>}
              </div>

              <div className="card">
                <h2>Customer</h2>
                <p>
                  <strong>Email:</strong> {order.customerEmail || '—'}
                </p>
                <p>
                  <strong>Last updated:</strong> {new Date(order.updatedAt).toLocaleString()}
                </p>
              </div>

              <div className="card">
                <h2>Items</h2>
                <div className="items-list">
                  {(order.items || []).map((item: any) => (
                    <article key={item.id} className="item-row">
                      <div className="item-meta">
                        <h3>{item.productName}</h3>
                        <p>{item.variantDescription}</p>
                        <p>SKU: {item.sku}</p>
                      </div>
                      <div className="item-price">
                        <span>
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </span>
                        <strong>${item.subtotal.toFixed(2)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <aside className="summary-column">
              <div className="card">
                <h2>Summary</h2>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>${(order.shippingCost || 0).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <span>${(order.tax || 0).toFixed(2)}</span>
                </div>
                {(order.discount || 0) > 0 && (
                  <div className="summary-row">
                    <span>Discount</span>
                    <span>- ${(order.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <hr />
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)} {order.currency}</span>
                </div>
              </div>

              <div className="card">
                <h3>Shipping address</h3>
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

              <div className="card">
                <h3>Billing address</h3>
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

              {(order.shipments || []).length > 0 && (
                <div className="card">
                  <h3>Shipments</h3>
                  <div className="shipments">
                    {(order.shipments || []).map((shipment: any) => (
                      <div key={shipment.id} className="shipment-row">
                        <p>
                          <strong>{shipment.status}</strong> — {new Date(shipment.createdAt).toLocaleString()}
                        </p>
                        <p>Carrier: {shipment.carrier || '—'}</p>
                        <p>Tracking: {shipment.trackingNumber || '—'}</p>
                        {shipment.labelUrl && (
                          <Link href={shipment.labelUrl} target="_blank" className="btn btn--outline">
                            Download label
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card">
                <h3>Activity log</h3>
                {auditLogs.length === 0 ? (
                  <p className="muted">暂无审计记录。</p>
                ) : (
                  <ul className="audit-list">
                    {auditLogs.map((log: AdminAuditLogEntry) => (
                      <li key={log.id} className="audit-list__item">
                        <div className="audit-list__meta">
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                          <span>{log.actorEmail || '系统'}</span>
                        </div>
                        <p className="audit-list__message">{describeAuditEntry(log)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}

        <style jsx>{`
          .order-page {
            display: grid;
            gap: 24px;
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
            background: #ff1f3d;
            color: #fff;
            text-decoration: none;
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
            padding: 0;
          }
          .card {
            background: #fff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            padding: 24px;
            display: grid;
            gap: 16px;
          }
          .card__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.75rem;
            color: #94a3b8;
            margin: 0;
          }
          .muted {
            color: #64748b;
            margin: 4px 0 0;
          }
          .badge-group {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .status-badge {
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
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
          .order-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 360px;
            gap: 24px;
          }
          .order-column {
            display: grid;
            gap: 24px;
          }
          .summary-column {
            display: grid;
            gap: 24px;
          }
          .form-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
          label {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.9rem;
            color: #475569;
          }
          select,
          input,
          textarea {
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #d4d7de;
            font-size: 0.95rem;
          }
          textarea {
            resize: vertical;
          }
          .textarea-label {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .actions {
            display: flex;
            gap: 12px;
          }
          .items-list {
            display: grid;
            gap: 12px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
          }
          .item-meta h3 {
            margin: 0 0 4px 0;
          }
          .item-meta p {
            margin: 2px 0;
            color: #64748b;
          }
          .item-price {
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
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: #1f2937;
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
          .shipments {
            display: grid;
            gap: 12px;
          }
          .shipment-row {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #f1f5f9;
          }
          .message {
            padding: 12px 16px;
            border-radius: 10px;
            background: rgba(59, 130, 246, 0.08);
            color: #1d4ed8;
            font-size: 0.95rem;
          }
          .audit-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            gap: 12px;
          }
          .audit-list__item {
            display: grid;
            gap: 4px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
          }
          .audit-list__meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: #64748b;
          }
          .audit-list__message {
            margin: 0;
            font-size: 0.95rem;
            color: #1f2937;
          }
          @media (max-width: 1024px) {
            .order-grid {
              grid-template-columns: 1fr;
            }
            .summary-column {
              order: -1;
            }
          }
        `}</style>
      </section>
    </AdminShell>
  );
}


