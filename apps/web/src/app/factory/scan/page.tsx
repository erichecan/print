'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001/api';

type Order = {
  id: string;
  orderNumber: string;
  email: string;
  productionStatus: string;
  printSpecs: { positions?: string[]; method?: string; widthCm?: number; heightCm?: number; notes?: string } | null;
  shippingAddress: unknown;
  items: Array<{
    quantity: number;
    variant: { color: string; size: string; product: { name: string; images: { url: string }[] } } | null;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  IN_PRODUCTION: 'In Production',
  DONE: 'Done',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  QUEUED: { bg: '#FEF3C7', color: '#92400E' },
  IN_PRODUCTION: { bg: '#DBEAFE', color: '#1E40AF' },
  DONE: { bg: '#D1FAE5', color: '#065F46' },
};

const NEXT_STATUS: Record<string, { status: string; label: string; bg: string }> = {
  QUEUED: { status: 'IN_PRODUCTION', label: 'Start Production', bg: '#3B82F6' },
  IN_PRODUCTION: { status: 'DONE', label: 'Mark as Done', bg: '#10B981' },
};

export default function FactoryScanPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No token provided.');
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/factory/scan?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.message || 'Order not found.');
        } else {
          setOrder(data.order);
        }
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleUpdateStatus(newStatus: string) {
    if (!token || !order) return;
    setUpdating(true);
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/factory/scan/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, productionStatus: newStatus }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || 'Update failed.');
      } else {
        setOrder((prev) => prev ? { ...prev, productionStatus: data.productionStatus } : prev);
        setSuccess(`Status updated to: ${STATUS_LABELS[data.productionStatus] ?? data.productionStatus}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#6B7280', textAlign: 'center', fontSize: 16 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#EF4444', fontWeight: 600, fontSize: 16 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const firstItem = order.items?.[0];
  const variant = firstItem?.variant;
  const product = variant?.product;
  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);
  const specs = order.printSpecs;
  const sc = STATUS_COLORS[order.productionStatus] ?? { bg: '#F3F4F6', color: '#374151' };
  const next = NEXT_STATUS[order.productionStatus];

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Factory Scan
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{order.orderNumber}</div>
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: sc.bg, color: sc.color }}>
            {STATUS_LABELS[order.productionStatus] ?? order.productionStatus}
          </span>
        </div>

        {/* Product */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
          {product?.images?.[0]?.url ? (
            <img src={product.images[0].url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #E5E7EB', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: '#F3F4F6', borderRadius: 10, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 4 }}>{product?.name ?? '—'}</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>
              {variant ? `${variant.color} / ${variant.size}` : '—'} · Qty {totalQty}
            </div>
          </div>
        </div>

        {/* Print Specs */}
        {specs && (specs.positions?.length || specs.method || specs.widthCm || specs.heightCm || specs.notes) ? (
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Print Specs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {specs.positions?.length ? (
                <SpecRow label="Position" value={specs.positions.join(', ')} />
              ) : null}
              {specs.method ? <SpecRow label="Method" value={specs.method} /> : null}
              {(specs.widthCm || specs.heightCm) ? (
                <SpecRow label="Size" value={`${specs.widthCm ?? '—'} × ${specs.heightCm ?? '—'} cm`} />
              ) : null}
              {specs.notes ? <SpecRow label="Notes" value={specs.notes} /> : null}
            </div>
          </div>
        ) : null}

        {/* Success message */}
        {success && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#D1FAE5', borderRadius: 10, color: '#065F46', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
            ✓ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FEE2E2', borderRadius: 10, color: '#991B1B', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Action Button */}
        {next ? (
          <button
            disabled={updating}
            onClick={() => handleUpdateStatus(next.status)}
            style={{
              width: '100%',
              padding: '16px',
              background: updating ? '#9CA3AF' : next.bg,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 17,
              cursor: updating ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            {updating ? 'Updating…' : next.label}
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: 16, background: '#D1FAE5', borderRadius: 12, color: '#065F46', fontWeight: 700, fontSize: 16 }}>
            ✓ Production Complete
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#D1D5DB' }}>
          {order.email}
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
      <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#111', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#F9FAFB',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '32px 16px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: '#fff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};
