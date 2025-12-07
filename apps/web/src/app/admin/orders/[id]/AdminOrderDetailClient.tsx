'use client';

/**
 * Admin Order Detail Page
 * [2025-11-12 01:27:20] 支持状态更新、退款标记与详情查看
 * [2025-11-15 16:40:00] 还原 prototype/admin/admin/order-detail.html 布局
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
  // [2025-12-06 15:30:00] Shipping label generation
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  // [2025-01-28 08:30:00] Audit Logs 功能已移除

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

  // [2025-12-06 15:30:00] Load shipping rates
  const loadShippingRates = async () => {
    if (!data) return;
    setLoadingRates(true);
    try {
      const ratesData = await adminOrdersApi.getShippingRates(data.id);
      setShippingRates(ratesData.rates || []);
      setShowRatesModal(true);
    } catch (err: any) {
      console.error('[2025-12-06 15:30:00] 加载运费报价失败', err);
      setMessage('获取运费报价失败，将使用默认设置生成标签');
      // Continue with label generation without rate selection
      handleGenerateLabel();
    } finally {
      setLoadingRates(false);
    }
  };

  // [2025-12-06 15:30:00] Generate shipping label
  const handleGenerateLabel = async (rateId?: string) => {
    if (!data) return;

    // Check if label already exists
    const existingShipment = data.shipments?.find((s: any) => s.labelUrl);
    if (existingShipment) {
      if (!confirm(`该订单已存在发货标签。是否重新生成？`)) {
        return;
      }
    }

    setGeneratingLabel(true);
    setMessage(null);
    try {
      const result = await adminOrdersApi.generateShippingLabel(data.id, rateId || selectedRateId || undefined);
      await mutate();
      setShowRatesModal(false);
      setSelectedRateId('');
      setMessage(`发货标签已生成！跟踪号：${result.trackingNumber || 'N/A'}`);
    } catch (err: any) {
      console.error('[2025-12-06 15:30:00] 生成发货标签失败', err);
      const errorMsg = err?.message || err?.error || '生成发货标签失败，请稍后重试';
      setMessage(errorMsg);
    } finally {
      setGeneratingLabel(false);
    }
  };

  // [2025-12-06 14:00:00] Enhanced refund handler with partial refund support
  const handleRefund = async () => {
    if (!data) return;

    // Validate refund amount
    const orderTotal = Number(data.total || 0);
    const amount = refundAmount.trim() ? parseFloat(refundAmount) : orderTotal;

    if (isNaN(amount) || amount <= 0) {
      setMessage('请输入有效的退款金额');
      return;
    }

    if (amount > orderTotal) {
      setMessage(`退款金额不能超过订单总额 $${orderTotal.toFixed(2)}`);
      return;
    }

    // Check if order can be refunded
    if (data.paymentStatus !== 'COMPLETED') {
      setMessage('只有已支付的订单才能退款');
      return;
    }

    if (data.status === 'REFUNDED') {
      setMessage('该订单已经退款');
      return;
    }

    const isFullRefund = amount >= orderTotal;
    const confirmMsg = isFullRefund
      ? `确认退款订单 ${data.orderNumber} 的金额 $${amount.toFixed(2)}？${refundNote ? `\n退款原因：${refundNote}` : ''}`
      : `确认部分退款订单 ${data.orderNumber} 的金额 $${amount.toFixed(2)}（订单总额：$${orderTotal.toFixed(2)}）？${refundNote ? `\n退款原因：${refundNote}` : ''}`;

    if (!confirm(confirmMsg)) return;

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
        ? `订单 ${data.orderNumber} 已全额退款 $${amount.toFixed(2)}`
        : `订单 ${data.orderNumber} 已部分退款 $${amount.toFixed(2)}`;
      setMessage(successMsg);
      if (result.warning) {
        setMessage(`${successMsg}。警告：${result.warning}`);
      }
    } catch (err: any) {
      console.error('[2025-12-06 14:00:00] 退款处理失败', err);
      const errorMsg = err?.message || err?.error || '退款处理失败，请稍后重试';
      setMessage(errorMsg);
    } finally {
      setRefundLoading(false);
    }
  };

  const order: AdminOrderSummary | undefined = data;
  const formatCurrency = (value?: number) => `$${(value || 0).toFixed(2)}`;

  if (isLoading) {
    return <div className="admin-table-placeholder">Loading order…</div>;
  }

  if (error || !order) {
    return <div className="admin-table-placeholder error">Order not found.</div>;
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>Order #{order.orderNumber}</h1>
          <p className="text-muted">
            Placed {new Date(order.createdAt).toLocaleString()} · {order.itemCount} items
          </p>
        </div>
        <Link href="/admin/orders" className="btn btn--outline">
          ← Back to Orders
        </Link>
      </div>

      <div className="order-detail-grid">
        <div className="order-detail-main">
          <div className="admin-form">
            <h3>Order Status</h3>
            <div className="admin-grid-two">
              <div className="admin-form-group">
                <label>Fulfillment Status</label>
                <select
                  value={form.status || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value || undefined }))}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Payment Status</label>
                <select
                  value={form.paymentStatus || ''}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, paymentStatus: event.target.value || undefined }));
                  }}
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-grid-two">
              <div className="admin-form-group">
                <label>Tracking Number</label>
                <input
                  type="text"
                  value={form.trackingNumber || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Carrier</label>
                <input
                  type="text"
                  value={form.carrier || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, carrier: event.target.value }))}
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label>Estimated Delivery</label>
              <input
                type="date"
                value={form.estimatedDelivery || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, estimatedDelivery: event.target.value }))}
              />
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn--primary" onClick={handleUpdate} disabled={updating}>
                {updating ? '保存中…' : '保存更改'}
              </button>
<<<<<<< HEAD
              {/* [2025-12-06 15:30:00] Generate shipping label button */}
              {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={loadShippingRates}
                  disabled={generatingLabel || loadingRates}
                >
                  {generatingLabel ? '生成中…' : loadingRates ? '加载报价…' : '生成发货标签'}
                </button>
              )}
              {/* [2025-12-06 14:00:00] Enhanced refund button with modal */}
              {data.paymentStatus === 'COMPLETED' && data.status !== 'REFUNDED' && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowRefundModal(true)}
                  disabled={refundLoading}
                >
                  处理退款
                </button>
              )}
            </div>
            {message && (
              <div className={`admin-alert ${message.includes('警告') || message.includes('失败') ? 'error' : ''}`}>
                {message}
              </div>
            )}
          </div>

          {/* [2025-12-06 14:00:00] Refund modal */}
          {showRefundModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => !refundLoading && setShowRefundModal(false)}
            >
              <div
                className="admin-form"
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '90vh',
                  overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginTop: 0 }}>处理退款</h3>
                <div className="admin-form-group">
                  <label>
                    退款金额 <span style={{ color: '#666', fontSize: '0.9em' }}>（订单总额：${formatCurrency(data.total)}）</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={data.total}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={`默认全额退款：${formatCurrency(data.total)}`}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: '#666' }}>
                    留空或输入 {formatCurrency(data.total)} 表示全额退款
                  </p>
                </div>
                <div className="admin-form-group">
                  <label>退款原因（可选）</label>
                  <textarea
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                    placeholder="请输入退款原因..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleRefund}
                    disabled={refundLoading}
                    style={{ flex: 1 }}
                  >
                    {refundLoading ? '处理中…' : '确认退款'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundAmount('');
                      setRefundNote('');
                    }}
                    disabled={refundLoading}
                    style={{ flex: 1 }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
              {statusHistoryData?.data && statusHistoryData.data.length > 0 ? (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>从状态</th>
                        <th>到状态</th>
                        <th>操作人</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusHistoryData.data.map((history: any) => (
                        <tr key={history.id}>
                          <td>{new Date(history.createdAt).toLocaleString('zh-CN')}</td>
                          <td>
                            <span className={`status-badge status-${history.fromStatus?.toLowerCase() || 'unknown'}`}>
                              {history.fromStatus || '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge status-${history.toStatus?.toLowerCase()}`}>
                              {history.toStatus}
                            </span>
                          </td>
                          <td>{history.actorName || history.actorId || '系统'}</td>
                          <td>{history.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#64748b', padding: '16px' }}>暂无状态历史记录</p>
              )}
            </div>
          )}
>>>>>>> feature/issue-139-promotion-enhancement

          <div className="admin-form">
            <h3>Order Items</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.productName}</strong>
                        <div className="text-muted">{item.variantDescription}</div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="order-detail-side">
          <div className="admin-form">
            <h3>Summary</h3>
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
                <strong>
                  {formatCurrency(order.total)} {order.currency}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin-form">
            <h3>Customer</h3>
            <p className="text-muted">{order.customerEmail || '—'}</p>
            <div className="address-block">
              <h4>Shipping Address</h4>
              <AddressBlock {...order.shippingAddress} />
            </div>
            <div className="address-block">
              <h4>Billing Address</h4>
              <AddressBlock {...order.billingAddress} />
            </div>
          </div>

          {/* [2025-12-06 15:30:00] Enhanced shipments section with label printing */}
          {(order.shipments || []).length > 0 && (
            <div className="admin-form">
              <h3>发货信息</h3>
              <div className="shipments-list">
                {(order.shipments || []).map((shipment: any) => (
                  <div key={shipment.id} className="shipment-card">
                    <div className="shipment-meta">
                      <strong>{shipment.status}</strong>
                      <span>{new Date(shipment.createdAt).toLocaleString()}</span>
                    </div>
                    <p>承运商: {shipment.carrier || '—'}</p>
                    <p>跟踪号: {shipment.trackingNumber || '—'}</p>
                    {shipment.labelUrl && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Link href={shipment.labelUrl} target="_blank" className="btn btn--outline btn--xs">
                          下载标签
                        </Link>
                        <button
                          type="button"
                          className="btn btn--outline btn--xs"
                          onClick={() => {
                            window.open(shipment.labelUrl, '_blank');
                            window.print();
                          }}
                        >
                          打印标签
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* [2025-12-06 15:30:00] Shipping rates modal */}
          {showRatesModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => !generatingLabel && setShowRatesModal(false)}
            >
              <div
                className="admin-form"
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  maxWidth: '600px',
                  width: '90%',
                  maxHeight: '90vh',
                  overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginTop: 0 }}>选择运费方案</h3>
                {shippingRates.length === 0 ? (
                  <p style={{ color: '#64748b' }}>暂无可用运费方案，将使用默认设置生成标签</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {shippingRates.map((rate: any) => (
                      <div
                        key={rate.id}
                        style={{
                          padding: '12px',
                          border: selectedRateId === rate.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedRateId === rate.id ? '#f0f9ff' : 'white',
                        }}
                        onClick={() => setSelectedRateId(rate.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                              {rate.courier} - {rate.service}
                            </p>
                            {rate.estimatedDeliveryDays && (
                              <p style={{ margin: 0, fontSize: '0.85em', color: '#64748b' }}>
                                预计 {rate.estimatedDeliveryDays} 天送达
                              </p>
                            )}
                          </div>
                          <strong style={{ fontSize: '1.1em' }}>
                            {rate.currency} ${rate.price.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleGenerateLabel(selectedRateId || undefined)}
                    disabled={generatingLabel}
                    style={{ flex: 1 }}
                  >
                    {generatingLabel ? '生成中…' : '生成标签'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      setShowRatesModal(false);
                      setSelectedRateId('');
                    }}
                    disabled={generatingLabel}
                    style={{ flex: 1 }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* [2025-01-28 08:30:00] Activity Log 功能已移除 */}
        </aside>
      </div>
    </div>
  );
}

function AddressBlock(address?: any) {
  if (!address) {
    return <p className="text-muted">Not provided.</p>;
  }
  return (
    <address>
      <p>{address.fullName}</p>
      <p>{address.addressLine1}</p>
      {address.addressLine2 && <p>{address.addressLine2}</p>}
      <p>
        {address.city}, {address.province} {address.postalCode}
      </p>
      <p>{address.country}</p>
    </address>
  );
}

