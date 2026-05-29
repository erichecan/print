'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { adminOrdersApi } from '@/lib/api';

function QRCodePlaceholder({ value }: { value: string }) {
  return (
    <div
      style={{
        width: 64, height: 64, background: '#F3F4F6',
        border: '1px solid #E5E7EB', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: '#9CA3AF', textAlign: 'center', padding: 4,
        wordBreak: 'break-all',
      }}
      title={value}
    >
      QR
      <br />{value.slice(-8)}
    </div>
  );
}

export default function GangSheetPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data, error, isLoading } = useSWR(
    `gang-sheet-${id}`,
    () => adminOrdersApi.getGangSheet(id),
  );

  const gs = data?.gangSheet;

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        加载生产单…
      </div>
    );
  }

  if (error || !gs) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: '#EF4444', marginBottom: 16 }}>
          {error ? '加载失败：设计稿或物流信息尚未就绪。' : '生产单数据不存在。'}
        </div>
        <Link href={`/admin/online-orders/${id}`} style={{ color: '#3B82F6', fontSize: 14 }}>
          ← 返回订单详情
        </Link>
      </div>
    );
  }

  const positions: any[] = gs.specs?.positions?.filter(
    (p: any) => p.imageUrl || p.text
  ) ?? [];

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link
          href={`/admin/online-orders/${id}`}
          style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}
        >
          ← 返回订单
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          生产单 — {gs.order?.orderNumber}
        </h1>
        <button
          onClick={() => window.print()}
          style={{
            marginLeft: 'auto',
            padding: '8px 18px',
            background: '#000', color: '#fff',
            border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          打印 / 保存 PDF
        </button>
      </div>

      <div id="gang-sheet-print" style={{ maxWidth: 800 }}>
        {/* Row 1: Order Info */}
        <div
          style={{
            border: '2px solid #111',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 12,
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* QR Code */}
            <div style={{ flexShrink: 0 }}>
              <QRCodePlaceholder value={gs.order?.orderNumber ?? id} />
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'center' }}>
                扫码查看订单
              </p>
            </div>

            {/* Order details */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
              <InfoRow label="订单号" value={gs.order?.orderNumber} bold />
              <InfoRow label="下单时间" value={gs.order?.createdAt ? new Date(gs.order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '—'} />
              <InfoRow label="客户" value={gs.order?.customer?.name ?? gs.order?.customer?.email ?? '—'} bold />
              <InfoRow label="邮箱" value={gs.order?.customer?.email ?? '—'} />
              {gs.order?.shippingAddress && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoRow
                    label="收货地址"
                    value={[
                      gs.order.shippingAddress.line1,
                      gs.order.shippingAddress.city,
                      gs.order.shippingAddress.province,
                      gs.order.shippingAddress.postalCode,
                    ].filter(Boolean).join(', ')}
                  />
                </div>
              )}
              <InfoRow label="快递公司" value={gs.order?.carrier ?? '—'} />
              <InfoRow label="物流单号" value={gs.order?.trackingNumber ?? '—'} bold />
            </div>
          </div>
        </div>

        {/* Row 2+: Print Positions */}
        {positions.length === 0 ? (
          <div
            style={{
              padding: '24px', textAlign: 'center',
              color: 'var(--color-text-muted)', fontSize: 14,
              border: '1px dashed var(--color-border)', borderRadius: 8,
            }}
          >
            无印刷位置信息
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {positions.map((pos: any, idx: number) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '14px 18px',
                  background: '#fff',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                {/* Position label */}
                <div
                  style={{
                    flexShrink: 0, width: 64, height: 64,
                    background: '#F9FAFB', borderRadius: 6,
                    border: '1px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 4,
                  }}
                >
                  {pos.imageUrl ? (
                    <img
                      src={pos.imageUrl}
                      alt={pos.position}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>无图</span>
                  )}
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                  <InfoRow label="位置" value={POSITION_LABELS[pos.position] ?? pos.position} bold />
                  {pos.printType && <InfoRow label="印刷方式" value={pos.printType} />}
                  {pos.width && pos.height && (
                    <InfoRow label="尺寸" value={`${pos.width} × ${pos.height} cm`} />
                  )}
                  {pos.color && <InfoRow label="颜色" value={pos.color} />}
                  {pos.text && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <InfoRow label="文字内容" value={pos.text} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #gang-sheet-print, #gang-sheet-print * { visibility: visible; }
          #gang-sheet-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

const POSITION_LABELS: Record<string, string> = {
  front: '正面',
  back: '背面',
  left: '左袖',
  right: '右袖',
  left_chest: '左胸',
  right_chest: '右胸',
};

function InfoRow({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: '#111' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}
