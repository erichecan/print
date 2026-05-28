'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { factoryQueueApi } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001/api';

type ScannedOrder = {
  id: string;
  orderNumber: string;
  email: string;
  productionStatus: string;
  printSpecs: { positions?: string[]; method?: string; widthCm?: number; heightCm?: number; notes?: string } | null;
  items: Array<{ quantity: number; variant: { color: string; size: string; product: { name: string; images: { url: string }[] } } | null }>;
};

const NEXT_STATUS: Record<string, { status: string; label: string; bg: string }> = {
  QUEUED: { status: 'IN_PRODUCTION', label: 'Start Production', bg: '#3B82F6' },
  IN_PRODUCTION: { status: 'DONE', label: 'Mark as Done', bg: '#10B981' },
};

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Done', value: 'DONE' },
];

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    QUEUED:        { bg: '#FEF3C7', color: '#92400E', label: 'Queued' },
    IN_PRODUCTION: { bg: '#DBEAFE', color: '#1E40AF', label: 'In Production' },
    DONE:          { bg: '#D1FAE5', color: '#065F46', label: 'Done' },
  };
  const s = map[status] ?? { bg: '#F3F4F6', color: '#374151', label: status };
  return (
    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-CA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FactoryQueuePage() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Scanner gun input state
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedOrder, setScannedOrder] = useState<ScannedOrder | null>(null);
  const [scannedToken, setScannedToken] = useState('');
  const [scanUpdating, setScanUpdating] = useState(false);
  const [scanSuccess, setScanSuccess] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ['factory-queue', status, search, page],
    () => factoryQueueApi.list({ status: status === 'all' ? undefined : status, search: search || undefined, page, limit: 20 }),
    { revalidateOnFocus: false }
  );

  const stats = data?.stats ?? { QUEUED: 0, IN_PRODUCTION: 0, DONE: 0, todayDone: 0, total: 0 };
  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  async function handleStatusUpdate(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      await factoryQueueApi.updateProductionStatus(id, newStatus);
      mutate();
    } finally {
      setUpdatingId(null);
    }
  }

  function extractToken(raw: string): string | null {
    try {
      const url = new URL(raw.trim());
      return url.searchParams.get('token');
    } catch {
      return null;
    }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setScanError('');
    setScanSuccess('');
    setScannedOrder(null);
    const token = extractToken(scanInput);
    if (!token) {
      setScanError('Invalid QR code. Expected a URL with ?token=…');
      return;
    }
    setScanLoading(true);
    try {
      const res = await fetch(`${API_BASE}/factory/scan?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.error) {
        setScanError(data.message || 'Order not found.');
      } else {
        setScannedOrder(data.order);
        setScannedToken(token);
        setScanInput('');
      }
    } catch {
      setScanError('Network error. Please try again.');
    } finally {
      setScanLoading(false);
      scanInputRef.current?.focus();
    }
  }

  async function handleScanStatusUpdate(newStatus: string) {
    if (!scannedOrder || !scannedToken) return;
    setScanUpdating(true);
    setScanError('');
    setScanSuccess('');
    try {
      const res = await fetch(`${API_BASE}/factory/scan/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: scannedToken, productionStatus: newStatus }),
      });
      const data = await res.json();
      if (data.error) {
        setScanError(data.message || 'Update failed.');
      } else {
        const label = data.productionStatus === 'IN_PRODUCTION' ? 'In Production' : data.productionStatus === 'DONE' ? 'Done' : data.productionStatus;
        setScannedOrder((prev) => prev ? { ...prev, productionStatus: data.productionStatus } : prev);
        setScanSuccess(`Updated to: ${label}`);
        mutate();
      }
    } catch {
      setScanError('Network error.');
    } finally {
      setScanUpdating(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (orders.length > 0 && selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o: any) => o.id)));
    }
  }

  function closeScanCard() {
    setScannedOrder(null);
    setScannedToken('');
    setScanError('');
    setScanSuccess('');
    setScanInput('');
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }

  return (
    <div>
      <div className="admin-page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Factory Production Queue</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          Manage factory production progress for online orders
        </p>
      </div>

      {/* Scanner Gun Input */}
      <div style={{ marginBottom: 24, padding: '16px 20px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Scan QR Code
        </div>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 10 }}>
          <input
            ref={scanInputRef}
            value={scanInput}
            onChange={(e) => { setScanInput(e.target.value); setScanError(''); }}
            placeholder="Point scanner at QR code…"
            autoComplete="off"
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 9, fontSize: 14, fontFamily: 'monospace', background: '#fff' }}
          />
          <button
            type="submit"
            disabled={scanLoading || !scanInput.trim()}
            style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: (!scanInput.trim() || scanLoading) ? 0.5 : 1 }}
          >
            {scanLoading ? 'Looking up…' : 'Confirm'}
          </button>
        </form>
        {scanError && !scannedOrder && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>{scanError}</p>
        )}

        {/* Scanned Order Card */}
        {scannedOrder && (
          <div style={{ marginTop: 14, padding: 16, background: '#fff', border: '2px solid #3B82F6', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>{scannedOrder.orderNumber}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {scannedOrder.items?.[0]?.variant?.product?.name ?? '—'} ·{' '}
                  {scannedOrder.items?.[0]?.variant ? `${scannedOrder.items[0].variant.color} / ${scannedOrder.items[0].variant.size}` : '—'} ·{' '}
                  Qty {scannedOrder.items.reduce((s: number, it: any) => s + it.quantity, 0)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: scannedOrder.productionStatus === 'DONE' ? '#D1FAE5' : scannedOrder.productionStatus === 'IN_PRODUCTION' ? '#DBEAFE' : '#FEF3C7',
                  color: scannedOrder.productionStatus === 'DONE' ? '#065F46' : scannedOrder.productionStatus === 'IN_PRODUCTION' ? '#1E40AF' : '#92400E',
                }}>
                  {scannedOrder.productionStatus === 'IN_PRODUCTION' ? 'In Production' : scannedOrder.productionStatus === 'DONE' ? 'Done' : 'Queued'}
                </span>
                <button onClick={closeScanCard} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF', padding: '0 4px' }}>×</button>
              </div>
            </div>

            {scannedOrder.printSpecs && (scannedOrder.printSpecs.positions?.length || scannedOrder.printSpecs.method) && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                {scannedOrder.printSpecs.positions?.join(', ')}
                {scannedOrder.printSpecs.method && <span> · {scannedOrder.printSpecs.method}</span>}
                {(scannedOrder.printSpecs.widthCm || scannedOrder.printSpecs.heightCm) && (
                  <span> · {scannedOrder.printSpecs.widthCm ?? '—'} × {scannedOrder.printSpecs.heightCm ?? '—'} cm</span>
                )}
              </div>
            )}

            {scanSuccess && (
              <div style={{ marginBottom: 10, padding: '8px 12px', background: '#D1FAE5', borderRadius: 8, color: '#065F46', fontWeight: 600, fontSize: 13 }}>
                ✓ {scanSuccess}
              </div>
            )}
            {scanError && (
              <div style={{ marginBottom: 10, padding: '8px 12px', background: '#FEE2E2', borderRadius: 8, color: '#991B1B', fontWeight: 600, fontSize: 13 }}>
                {scanError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {NEXT_STATUS[scannedOrder.productionStatus] && (
                <button
                  disabled={scanUpdating}
                  onClick={() => handleScanStatusUpdate(NEXT_STATUS[scannedOrder.productionStatus].status)}
                  style={{
                    padding: '9px 20px',
                    background: scanUpdating ? '#9CA3AF' : NEXT_STATUS[scannedOrder.productionStatus].bg,
                    color: '#fff', border: 'none', borderRadius: 9,
                    fontWeight: 700, fontSize: 14, cursor: scanUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scanUpdating ? 'Updating…' : NEXT_STATUS[scannedOrder.productionStatus].label}
                </button>
              )}
              {scannedOrder.productionStatus === 'DONE' && (
                <span style={{ padding: '9px 16px', background: '#D1FAE5', borderRadius: 9, color: '#065F46', fontWeight: 700, fontSize: 13 }}>
                  ✓ Production Complete
                </span>
              )}
              <Link
                href={`/admin/factory-queue/${scannedOrder.id}/film-sheet`}
                target="_blank"
                style={{ padding: '9px 16px', background: '#fff', color: '#000', border: '1px solid #E5E7EB', borderRadius: 9, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
              >
                Film Sheet
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#F59E0B' }}>{stats.QUEUED}</p>
          <p className="stat-card-label">Queued</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#3B82F6' }}>{stats.IN_PRODUCTION}</p>
          <p className="stat-card-label">In Production</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value" style={{ color: '#10B981' }}>{stats.todayDone}</p>
          <p className="stat-card-label">Done Today</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-value">{stats.total}</p>
          <p className="stat-card-label">Total in Queue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters" style={{ marginBottom: 16 }}>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '9px 36px 9px 12px', border: '1px solid var(--color-border)', borderRadius: 10, background: '#fff', fontSize: 14 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search order # / email…"
            style={{ padding: '9px 14px', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 14, width: 220 }}
          />
          <button type="submit" style={{ padding: '9px 18px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="admin-table-wrapper">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>Failed to load. Please refresh.</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No production orders found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Order #</th>
                <th>Product</th>
                <th>Variant</th>
                <th>Customer</th>
                <th>Queued At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => {
                const firstItem = order.items?.[0];
                const variant = firstItem?.variant;
                const product = variant?.product;
                const imgUrl = product?.images?.[0]?.url;

                return (
                  <tr key={order.id} style={{ background: selectedIds.has(order.id) ? '#EFF6FF' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/admin/online-orders/${order.id}`}
                        style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {imgUrl ? (
                          <img src={imgUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: 6, border: '1px solid var(--color-border)' }} />
                        )}
                        <span style={{ fontSize: 13 }}>{product?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {variant ? `${variant.color} / ${variant.size}` : '—'}
                      {firstItem?.quantity ? ` × ${firstItem.quantity}` : ''}
                    </td>
                    <td style={{ fontSize: 13 }}>{order.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {formatDate(order.sentToFactoryAt)}
                    </td>
                    <td>{statusBadge(order.productionStatus)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {order.productionStatus === 'QUEUED' && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusUpdate(order.id, 'IN_PRODUCTION')}
                            style={{ padding: '6px 12px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                          >
                            Start Production
                          </button>
                        )}
                        {order.productionStatus === 'IN_PRODUCTION' && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusUpdate(order.id, 'DONE')}
                            style={{ padding: '6px 12px', background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                          >
                            Mark Done
                          </button>
                        )}
                        {order.printToken && (
                          <Link
                            href={`/admin/factory-queue/${order.id}/film-sheet`}
                            target="_blank"
                            style={{ padding: '6px 12px', background: '#fff', color: '#000', border: '1px solid var(--color-border)', borderRadius: 8, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
                          >
                            Film Sheet
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Gang Sheet Floating Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#fff', padding: '14px 24px',
          borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 999, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => router.push(`/admin/factory-queue/gang-sheet?ids=${[...selectedIds].join(',')}`)}
            style={{ padding: '9px 20px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Create Gang Sheet
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14 }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--color-text-muted)' }}>
            {page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
