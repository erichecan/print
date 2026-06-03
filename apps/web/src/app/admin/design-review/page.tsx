'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { adminOrdersApi } from '@/lib/api';

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW: { label: '待审核', bg: '#FEF3C7', color: '#92400E' },
  IN_REVIEW:      { label: '审核中', bg: '#DBEAFE', color: '#1E40AF' },
  REJECTED:       { label: '已退回', bg: '#FEE2E2', color: '#991B1B' },
  SYNCED:         { label: '已同步', bg: '#D1FAE5', color: '#065F46' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function UrgentBadge() {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', whiteSpace: 'nowrap',
    }}>
      紧急 &gt;24h
    </span>
  );
}

function formatWait(hours: number) {
  if (hours < 1) return '不到 1 小时';
  if (hours < 24) return `${hours} 小时`;
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

type RejectModal = { orderId: string; orderNumber: string } | null;

export default function DesignReviewPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectModal, setRejectModal] = useState<RejectModal>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const { data, error, isLoading, mutate } = useSWR(
    'design-review-queue',
    () => adminOrdersApi.listDesignReviewQueue(),
    { refreshInterval: 30_000 }
  );

  const allOrders: any[] = data?.orders ?? [];
  const orders = filterStatus === 'all'
    ? allOrders
    : allOrders.filter((o) => o.designReviewStatus === filterStatus);

  const stats = {
    pending: allOrders.filter((o) => o.designReviewStatus === 'PENDING_REVIEW').length,
    inReview: allOrders.filter((o) => o.designReviewStatus === 'IN_REVIEW').length,
    rejected: allOrders.filter((o) => o.designReviewStatus === 'REJECTED').length,
    urgent: allOrders.filter((o) => o.isUrgent).length,
  };

  async function handleReject() {
    if (!rejectModal || !rejectNote.trim()) return;
    setRejectLoading(true);
    setRejectError('');
    try {
      await adminOrdersApi.rejectDesign(rejectModal.orderId, rejectNote);
      setRejectModal(null);
      setRejectNote('');
      mutate();
    } catch (e: any) {
      setRejectError(e.message || '退回失败');
    } finally {
      setRejectLoading(false);
    }
  }

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'PENDING_REVIEW', label: '待审核' },
    { value: 'IN_REVIEW', label: '审核中' },
    { value: 'REJECTED', label: '已退回' },
  ];

  return (
    <div>
      <div className="admin-page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>设计审核队列</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          审核客户提交的设计稿，同步或退回给顾客
        </p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#F59E0B' }}>{stats.pending}</p>
          <p className="stat-card-label">待审核</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#3B82F6' }}>{stats.inReview}</p>
          <p className="stat-card-label">审核中</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#EF4444' }}>{stats.rejected}</p>
          <p className="stat-card-label">已退回</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#DC2626' }}>{stats.urgent}</p>
          <p className="stat-card-label">紧急（&gt;24h）</p>
        </div>
      </div>

      {/* Filter */}
      <div className="admin-filters" style={{ marginBottom: 16 }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 9,
              border: '1px solid',
              borderColor: filterStatus === opt.value ? '#000' : 'var(--color-border)',
              background: filterStatus === opt.value ? '#000' : '#fff',
              color: filterStatus === opt.value ? '#fff' : 'var(--color-text)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table-wrapper">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>加载中…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>加载失败，请刷新重试。</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>暂无待审核设计。</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>客户</th>
                <th>商品</th>
                <th>状态</th>
                <th>等待时间</th>
                <th>下单时间</th>
                <th>设计稿</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => {
                const allItems: any[] = order.items ?? [];
                const designItems = allItems.filter((i: any) => i.designId);
                const regularItems = allItems.filter((i: any) => !i.designId);
                const isMixed = designItems.length > 0 && regularItems.length > 0;
                return (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/online-orders/${order.id}`}
                        style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>
                        {order.user ? [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.email : '—'}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{order.user?.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {designItems.map((item: any) => (
                        <div key={item.id} style={{ marginBottom: 4 }}>
                          <span style={{ display: 'inline-block', background: '#EDE9FE', color: '#5B21B6', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>设计稿</span>
                          <span>{item.variant?.product?.name ?? '—'}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12, marginLeft: 6 }}>
                            {item.variant?.color} / {item.variant?.size}
                            {item.quantity > 1 && ` × ${item.quantity}`}
                          </span>
                        </div>
                      ))}
                      {isMixed && regularItems.map((item: any) => (
                        <div key={item.id} style={{ marginBottom: 4, opacity: 0.6 }}>
                          <span style={{ display: 'inline-block', background: '#F3F4F6', color: '#6B7280', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>普通</span>
                          <span>{item.variant?.product?.name ?? '—'}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12, marginLeft: 6 }}>
                            {item.variant?.color} / {item.variant?.size}
                            {item.quantity > 1 && ` × ${item.quantity}`}
                          </span>
                        </div>
                      ))}
                      {isMixed && (
                        <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>
                          混合订单 — 设计稿审核通过后一起发货
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <StatusBadge status={order.designReviewStatus} />
                        {order.isUrgent && <UrgentBadge />}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: order.isUrgent ? '#DC2626' : 'var(--color-text-muted)', fontWeight: order.isUrgent ? 700 : 400 }}>
                      {formatWait(order.waitHours)}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {formatDate(order.createdAt)}
                    </td>
                    <td>
                      {order.mockupUrl ? (
                        <img
                          src={order.mockupUrl}
                          alt="mockup"
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>待上传</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link
                          href={`/design-lab?orderId=${order.id}&mode=designer`}
                          target="_blank"
                          style={{
                            padding: '6px 12px',
                            background: '#111', color: '#fff',
                            border: 'none', borderRadius: 8,
                            fontWeight: 600, fontSize: 12,
                            textDecoration: 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          打开设计器 ↗
                        </Link>
                        <Link
                          href={`/admin/online-orders/${order.id}`}
                          style={{
                            padding: '6px 12px',
                            background: '#3B82F6', color: '#fff',
                            border: 'none', borderRadius: 8,
                            fontWeight: 600, fontSize: 12,
                            textDecoration: 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          查看 / 同步
                        </Link>
                        <button
                          onClick={() => { setRejectModal({ orderId: order.id, orderNumber: order.orderNumber }); setRejectNote(''); setRejectError(''); }}
                          style={{
                            padding: '6px 12px',
                            background: '#fff', color: '#EF4444',
                            border: '1px solid #FCA5A5', borderRadius: 8,
                            fontWeight: 600, fontSize: 12, cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          退回
                        </button>
                      </div>
                      {order.designReviewNote && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280', maxWidth: 200 }}>
                          退回原因：{order.designReviewNote}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>退回设计稿</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-text-muted)' }}>
              订单 {rejectModal.orderNumber} — 退回后顾客可在设计器重新编辑并提交。
            </p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              退回原因 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--color-border)', fontSize: 13,
                marginBottom: 12,
              }}
            >
              <option value="">请选择原因</option>
              <option value="图片分辨率太低，印刷效果差，建议替换高清图片（300DPI 以上）">图片分辨率太低（建议 300DPI 以上）</option>
              <option value="设计超出印刷区域，请调整到安全框内">设计超出印刷区域</option>
              <option value="文字太小，印刷后难以辨认，建议放大">文字太小，难以辨认</option>
              <option value="颜色与面料色系冲突，建议调整设计颜色">颜色与面料色系冲突</option>
              <option value="custom">自定义原因…</option>
            </select>

            {rejectNote === 'custom' && (
              <textarea
                placeholder="请输入退回原因…"
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--color-border)', fontSize: 13,
                  resize: 'vertical', marginBottom: 12, boxSizing: 'border-box',
                }}
              />
            )}

            {rejectError && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#EF4444' }}>{rejectError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{ padding: '10px 20px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={rejectLoading || !rejectNote || rejectNote === 'custom'}
                style={{
                  padding: '10px 20px', background: '#EF4444', color: '#fff',
                  border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14,
                  cursor: rejectLoading ? 'not-allowed' : 'pointer',
                  opacity: (!rejectNote || rejectNote === 'custom' || rejectLoading) ? 0.5 : 1,
                }}
              >
                {rejectLoading ? '退回中…' : '确认退回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
