'use client';

/**
 * Admin Order Detail Page
* 支持状态更新、退款标记与详情查看
* 还原 prototype/admin/admin/order-detail.html 布局
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  adminOrdersApi,
  AdminOrderSummary,
  AdminOrderUpdatePayload,
  AdminOrderRefundPayload,
} from '@/lib/api';

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_OPTIONS = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

export default function AdminOrderDetailClient({ id }: { id: string }) {
  const { data, error, mutate, isLoading } = useSWR(['admin-order', id], ([, orderId]) =>
    adminOrdersApi.get(orderId)
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
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  // Shipping label generation
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  // Audit Logs 功能已移除

  useEffect(() => {
    if (data) {
      setForm({
        status: data.status?.toUpperCase(),
        paymentStatus: data.paymentStatus?.toUpperCase(),
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
      console.error(' 更新订单失败', err);
      setMessage('Failed to update order. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Load shipping rates
  const loadShippingRates = async () => {
    if (!data) return;
    // [已废弃] 设计审核流程已简化，付款后订单直接进入生产，不再阻止物流
    // const blockedStatuses = ['PENDING_REVIEW', 'IN_REVIEW', 'REJECTED'];
    // if ((data as any).designReviewStatus && blockedStatuses.includes((data as any).designReviewStatus)) {
    //   const labels: Record<string, string> = { PENDING_REVIEW: '待审核', IN_REVIEW: '审核中', REJECTED: '设计稿已退回' };
    //   setMessage(`无法购买面单：订单包含待审核设计稿（${labels[(data as any).designReviewStatus] ?? (data as any).designReviewStatus}），请先完成设计审核。`);
    //   return;
    // }
    setLoadingRates(true);
    try {
      const ratesData = await adminOrdersApi.getShippingRates(data.id);
      setShippingRates(ratesData.rates || []);
      setShowRatesModal(true);
    } catch (err: any) {
      console.error(' 加载运费报价失败', err);
      setMessage('Failed to get shipping rates, generating label with defaults.');
      // Continue with label generation without rate selection
      handleGenerateLabel();
    } finally {
      setLoadingRates(false);
    }
  };

  // Generate shipping label
  const handleGenerateLabel = async (rateId?: string) => {
    if (!data) return;

    // Check if label already exists
    const existingShipment = data.shipments?.find((s: any) => s.labelUrl);
    // Confirm dialog removed per user request
    // if (existingShipment) {
    //   if (!confirm(`该订单已存在发货标签。是否重新生成？`)) {
    //     return;
    //   }
    // }

    setGeneratingLabel(true);
    setMessage(null);
    try {
      const result = await adminOrdersApi.generateShippingLabel(data.id, rateId || selectedRateId || undefined);
      await mutate();
      setShowRatesModal(false);
      setSelectedRateId('');
      setMessage(`Shipping label created! Tracking: ${result.trackingNumber || 'N/A'}`);
    } catch (err: any) {
      console.error(' 生成发货标签失败', err);
      const errorMsg = err?.message || err?.error || 'Failed to generate shipping label. Please try again.';
      setMessage(errorMsg);
    } finally {
      setGeneratingLabel(false);
    }
  };

  // Enhanced refund handler with partial refund support
  const handleRefund = async () => {
    if (!data) return;

    // Validate refund amount
    const orderTotal = Number(data.total || 0);
    const amount = refundAmount.trim() ? parseFloat(refundAmount) : orderTotal;

    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid refund amount.');
      return;
    }

    if (amount > orderTotal) {
      setMessage(`Refund amount cannot exceed order total $${orderTotal.toFixed(2)}.`);
      return;
    }

    // Check if order can be refunded
    if (data.paymentStatus?.toUpperCase() !== 'COMPLETED') {
      setMessage('Only paid orders can be refunded.');
      return;
    }

    if (data.status?.toUpperCase() === 'REFUNDED') {
      setMessage('This order has already been refunded.');
      return;
    }

    const isFullRefund = amount >= orderTotal;
    const confirmMsg = isFullRefund
      ? `确认退款订单 ${data.orderNumber} 的金额 $${amount.toFixed(2)}？${refundNote ? `\n退款原因：${refundNote}` : ''}`
      : `确认部分退款订单 ${data.orderNumber} 的金额 $${amount.toFixed(2)}（订单总额：$${orderTotal.toFixed(2)}）？${refundNote ? `\n退款原因：${refundNote}` : ''}`;

    // Confirm dialog removed per user request
    // if (!confirm(confirmMsg)) return;

    setRefundLoading(true);
    setMessage(null);
    try {
      const payload: AdminOrderRefundPayload = {
        reason: refundNote || undefined,
        amount: amount,
        refundToStripe: true,
      };
      const result = await adminOrdersApi.recordRefund(data.id, payload);
      setRefundNote('');
      setRefundAmount('');
      setShowRefundModal(false);
      await mutate();
      const successMsg = isFullRefund
        ? `Order ${data.orderNumber} fully refunded $${amount.toFixed(2)}`
        : `Order ${data.orderNumber} partially refunded $${amount.toFixed(2)}`;
      setMessage(successMsg);
      if (result.warning) {
        setMessage(`${successMsg}. Warning: ${result.warning}`);
      }
    } catch (err: any) {
      console.error('Refund failed', err);
      const errorMsg = err?.message || err?.error || 'Failed to process refund. Please try again.';
      setMessage(errorMsg);
    } finally {
      setRefundLoading(false);
    }
  };

  const order: AdminOrderSummary | undefined = data;
  const orderAny = data as any;
  const formatCurrency = (value?: number) => `$${(value || 0).toFixed(2)}`;

  if (isLoading) {
    return <div className="admin-table-placeholder">Loading order…</div>;
  }

  if (error || !order) {
    return <div className="admin-table-placeholder error">Order not found.</div>;
  }

  const shippingAddr = (() => {
    try {
      return typeof order.shippingAddress === 'string'
        ? JSON.parse(order.shippingAddress)
        : order.shippingAddress;
    } catch {
      return null;
    }
  })();

  const customerName = shippingAddr?.firstName
    ? `${shippingAddr.firstName} ${shippingAddr.lastName || ''}`.trim()
    : '—';

  const shippingAddrStr = shippingAddr?.addressLine1
    ? [shippingAddr.addressLine1, shippingAddr.city, shippingAddr.province, shippingAddr.postalCode, shippingAddr.country]
        .filter(Boolean)
        .join(', ')
    : '—';

  return (
    <div>
      {/* Page header with breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          <Link href="/admin/online-orders" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Online Orders
          </Link>
          {' / '}#{order.orderNumber}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            Order #{order.orderNumber}
            <FulfillmentBadge status={order.status} />
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/online-orders" className="btn btn--outline">
              ← Back to List
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`admin-alert ${message.includes('Warning') || message.includes('Failed') || message.includes('failed') || message.includes('Error') ? 'error' : ''}`}
          style={{ marginBottom: 16 }}
        >
          {message}
        </div>
      )}

      <div className="order-detail-grid">
        {/* Left column */}
        <div className="order-detail-main">

          {/* Customer info card */}
          <div className="admin-form">
            <h3>Customer Info</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <InfoField label="Name" value={customerName} />
              <InfoField label="Email" value={order.customerEmail || '—'} />
              <InfoField label="Phone" value={shippingAddr?.phone || '—'} />
              <InfoField
                label="Order Date"
                value={new Date(order.createdAt).toLocaleString('en-CA', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              />
              <div style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                  Shipping Address
                </div>
                <div style={{ fontSize: 14 }}>{shippingAddrStr}</div>
              </div>
            </div>
          </div>

          {/* Order items table */}
          <div className="admin-table-wrapper" style={{ marginBottom: 16 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Print Position</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item: any) => {
                  const imgUrl = item.thumbnail;
                  const printPos = '—';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt=""
                              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.productName}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.variantDescription}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.variantDescription || '—'}</td>
                      <td style={{ fontSize: 13 }}>{printPos}</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.unitPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'flex-end', gap: 40, fontSize: 14, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-muted)' }}>
                Total (incl. shipping {formatCurrency(order.shippingCost)})
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {formatCurrency(order.total)} {order.currency}
              </div>
            </div>
          </div>

          {/* 设计稿 / 生产单 section */}
          {(orderAny?.mockupUrl || orderAny?.printSpecs?.positions?.length > 0 || (order.items || []).some((i: any) => i.designThumbnailUrl)) && (
            <div className="admin-form" style={{ marginBottom: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                设计稿 / 生产单
              </h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* 已同步 mockup 预览 */}
                {orderAny.mockupUrl && (
                  <a href={orderAny.mockupUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={orderAny.mockupUrl}
                      alt="设计稿"
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0 }}
                    />
                  </a>
                )}
                {/* 待审核时展示 design 缩略图 */}
                {!orderAny.mockupUrl && (order.items || []).filter((i: any) => i.designThumbnailUrl).map((i: any) => (
                  <div key={i.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <img
                      src={i.designThumbnailUrl}
                      alt={i.designName || '设计稿'}
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0, background: '#f3f4f6' }}
                    />
                    {i.designName && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.designName}</div>}
                  </div>
                ))}
                <div style={{ flex: 1 }}>
                  {orderAny.designReviewSyncedAt && (
                    <InfoField label="同步时间" value={new Date(orderAny.designReviewSyncedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} />
                  )}
                  {orderAny.designReviewNote && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>退回原因</div>
                      <div style={{ fontSize: 13, color: '#DC2626' }}>{orderAny.designReviewNote}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {(() => {
                      const firstDesignItem = (order.items || []).find((i: any) => i.designId);
                      const designParam = firstDesignItem?.designId ? `&designId=${firstDesignItem.designId}` : '';
                      return (
                        <Link
                          href={`/design-lab?orderId=${data?.id}&mode=designer${designParam}`}
                          target="_blank"
                          className="btn btn--outline"
                          style={{ fontSize: 12 }}
                        >
                          在设计器中打开 ↗
                        </Link>
                      );
                    })()}
                    {(orderAny.printSpecs?.positions?.length > 0 || orderAny.mockupUrl) && (
                      <Link
                        href={`/admin/online-orders/${data?.id}/gang-sheet`}
                        className="btn"
                        style={{ fontSize: 12, background: '#111', color: '#fff', border: 'none' }}
                      >
                        查看生产单 →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right sidebar */}
        <aside className="order-detail-side">

          {/* Order operations card */}
          <div className="admin-form">
            <h3>Order Actions</h3>
            <div className="admin-form-group">
              <label>Fulfillment Status</label>
              <select
                value={form.status || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value || undefined }))}
              >
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Payment Status</label>
              <select
                value={form.paymentStatus || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentStatus: e.target.value || undefined }))}
              >
                {PAYMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Tracking Number</label>
              <input
                type="text"
                value={form.trackingNumber || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
              />
            </div>
            <div className="admin-form-group">
              <label>Carrier</label>
              <select
                value={form.carrier || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, carrier: e.target.value }))}
              >
                <option value="">Select carrier</option>
                <option value="Canada Post">Canada Post</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="Purolator">Purolator</option>
                <option value="Canpar">Canpar</option>
                <option value="DHL">DHL</option>
                <option value="Pickup">Pickup</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Est. Delivery</label>
              <input
                type="date"
                value={form.estimatedDelivery || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn--primary" onClick={handleUpdate} disabled={updating} style={{ width: '100%' }}>
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
              {data?.paymentStatus?.toUpperCase() === 'COMPLETED' && data?.status?.toUpperCase() !== 'REFUNDED' && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowRefundModal(true)}
                  disabled={refundLoading}
                  style={{ width: '100%' }}
                >
                  Process Refund
                </button>
              )}
            </div>
          </div>

          {/* Amount summary */}
          <div className="admin-form">
            <h3>Order Summary</h3>
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCost)}</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              {(order.discount || 0) > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>- {formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <strong>{formatCurrency(order.total)} {order.currency}</strong>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="admin-form">
            <h3>Payment Info</h3>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Payment Status</div>
              <PaymentBadge status={order.paymentStatus} />
            </div>
            {orderAny?.paymentIntentId && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Transaction ID</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                  {orderAny.paymentIntentId}
                </div>
              </div>
            )}
          </div>

          {/* Shipments */}
          {(order.shipments || []).length > 0 && (
            <div className="admin-form">
              <h3>Shipments</h3>
              {(order.shipments || []).map((shipment: any) => (
                <div
                  key={shipment.id}
                  style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--color-border)', fontSize: 13 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{shipment.carrier || '—'}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(shipment.createdAt).toLocaleString('en-CA')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Tracking: {shipment.trackingNumber || 'Pending'}</div>
                  {shipment.labelUrl && (
                    <Link href={shipment.labelUrl} target="_blank" className="btn btn--outline btn--xs" style={{ marginTop: 8, fontSize: 12 }}>
                      Download Label
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

        </aside>
      </div>

      {/* Refund modal */}
      {showRefundModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => !refundLoading && setShowRefundModal(false)}
        >
          <div
            className="admin-form"
            style={{ background: '#fff', padding: 28, borderRadius: 16, maxWidth: 480, width: '90%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Process Refund</h3>
            <div className="admin-form-group">
              <label>Refund Amount (order total: {formatCurrency(data?.total)})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={data?.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Default full refund: ${formatCurrency(data?.total)}`}
              />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Leave blank for full refund
              </p>
            </div>
            <div className="admin-form-group">
              <label>Reason (optional)</label>
              <textarea
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="Enter refund reason..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn--primary" onClick={handleRefund} disabled={refundLoading} style={{ flex: 1 }}>
                {refundLoading ? 'Processing…' : 'Confirm Refund'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => { setShowRefundModal(false); setRefundAmount(''); setRefundNote(''); }}
                disabled={refundLoading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

function FulfillmentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:    { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
    PROCESSING: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Processing' },
    SHIPPED:    { bg: '#D1FAE5', color: '#065F46', label: 'Shipped' },
    DELIVERED:  { bg: '#D1FAE5', color: '#065F46', label: 'Delivered' },
    CANCELLED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
    REFUNDED:   { bg: '#FEE2E2', color: '#991B1B', label: 'Refunded' },
  };
  const s = map[status?.toUpperCase?.()] ?? { bg: '#F3F4F6', color: '#6B7280', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:   { bg: '#FEF3C7', color: '#92400E', label: 'Unpaid' },
    COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Paid' },
    FAILED:    { bg: '#FEE2E2', color: '#991B1B', label: 'Failed' },
    REFUNDED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Refunded' },
  };
  const s = map[status?.toUpperCase?.()] ?? { bg: '#F3F4F6', color: '#6B7280', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}


