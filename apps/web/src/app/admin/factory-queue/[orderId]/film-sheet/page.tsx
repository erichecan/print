'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { factoryQueueApi } from '@/lib/api';

export default function FilmSheetPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const printRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    orderId ? ['film-sheet', orderId] : null,
    () => factoryQueueApi.getFilmSheetData(orderId),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (data) {
      document.title = `菲林单 - ${data.order?.orderNumber ?? ''}`;
    }
  }, [data]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#737373' }}>Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#EF4444' }}>Failed to load. Please close and try again.</p>
      </div>
    );
  }

  const { order, qrCode } = data;
  const firstItem = order.items?.[0];
  const variant = firstItem?.variant;
  const product = variant?.product;
  const designImgUrl = product?.images?.[0]?.url;
  const addr = typeof order.shippingAddress === 'string'
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress;

  const totalQty = order.items?.reduce((sum: number, it: any) => sum + (it.quantity ?? 0), 0) ?? 0;

  const specs = order.printSpecs as { positions?: string[]; method?: string; widthCm?: number; heightCm?: number; notes?: string } | null;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .film-sheet { box-shadow: none !important; }
        }
        body { background: #f5f5f5; margin: 0; font-family: Inter, -apple-system, sans-serif; }
      `}</style>

      {/* Print / Close controls */}
      <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #DBDBDB', padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Film Sheet — {order.orderNumber}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.print()}
          style={{ padding: '9px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          Print
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: '9px 18px', background: '#fff', color: '#000', border: '1px solid #DBDBDB', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Close
        </button>
      </div>

      <div style={{ padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={printRef}
          className="film-sheet"
          style={{
            width: 960,
            background: '#fff',
            border: '2px dashed #F59E0B',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            display: 'flex',
          }}
        >
          {/* Left: Design area (75%) */}
          <div
            style={{
              flex: '0 0 75%',
              borderRight: '2px dashed #F59E0B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 560,
              padding: 32,
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Design Artwork
            </div>

            {designImgUrl ? (
              <div
                style={{
                  background: `
                    linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                    linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#fff',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid #DBDBDB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={designImgUrl}
                  alt="Design"
                  style={{ maxWidth: 480, maxHeight: 400, objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 480,
                  height: 400,
                  background: `
                    linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                    linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  border: '1px solid #DBDBDB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 14,
                }}
              >
                No artwork available
              </div>
            )}

            {specs && (specs.positions?.length || specs.method || specs.widthCm || specs.heightCm) && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {specs.positions?.map((pos, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: '#f3f4f6', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {pos}
                  </span>
                ))}
                {specs.method && (
                  <span style={{ padding: '4px 10px', background: '#FEF3C7', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                    {specs.method}
                  </span>
                )}
                {(specs.widthCm || specs.heightCm) && (
                  <span style={{ padding: '4px 10px', background: '#EDE9FE', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#5B21B6' }}>
                    {specs.widthCm ?? '—'} × {specs.heightCm ?? '—'} cm
                  </span>
                )}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 11, color: '#9ca3af' }}>
              Product: {product?.name ?? '—'} &nbsp;|&nbsp; Color: {variant?.color ?? '—'} &nbsp;|&nbsp; Qty: {totalQty}
            </div>
          </div>

          {/* Right: QR label area (25%) */}
          <div
            style={{
              flex: '0 0 25%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '28px 20px',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
              QR Label
            </div>

            {qrCode && (
              <div style={{ border: '2px solid #000', borderRadius: 8, padding: 8, background: '#fff' }}>
                <img src={qrCode} alt="QR Code" style={{ width: 160, height: 160, display: 'block' }} />
              </div>
            )}

            <div style={{ width: '100%', borderTop: '1px solid #DBDBDB', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <InfoRow label="Order #" value={order.orderNumber} />
              <InfoRow label="Product" value={product?.name ?? '—'} />
              <InfoRow label="Variant" value={variant ? `${variant.color} / ${variant.size}` : '—'} />
              <InfoRow label="Qty" value={String(totalQty)} />
              <InfoRow label="Customer" value={addr?.firstName ? `${addr.firstName} ${addr.lastName ?? ''}`.trim() : order.email} />
              {addr?.city && <InfoRow label="City" value={`${addr.city}, ${addr.province ?? ''}`} />}
              {!!specs?.positions?.length && <InfoRow label="Position" value={specs.positions.join(', ')} />}
              {specs?.method && <InfoRow label="Method" value={specs.method} />}
              {(specs?.widthCm || specs?.heightCm) && <InfoRow label="Print Size" value={`${specs.widthCm ?? '—'} × ${specs.heightCm ?? '—'} cm`} />}
              {specs?.notes && <InfoRow label="Notes" value={specs.notes} />}
            </div>

            <div style={{ marginTop: 'auto', fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
              Token:<br />
              <span style={{ fontFamily: 'monospace', fontSize: 9, wordBreak: 'break-all' }}>
                {order.printToken}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: '#737373', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
