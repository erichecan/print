'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { adminDesignsApi, AdminDesignDetail } from '@/lib/api';

interface Props {
  id: string;
}

export default function AdminDesignDetailClient({ id }: Props) {
  const { data, isLoading, error, mutate } = useSWR(['admin-design-detail', id], () =>
    adminDesignsApi.get(id).then((response) => response.data)
  );
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'pending' | 'lock' | null>(null);

  if (isLoading) {
    return <div className="admin-table-placeholder">Loading design…</div>;
  }
  if (error || !data) {
    return <div className="admin-table-placeholder error">Failed to load design.</div>;
  }

  const design: AdminDesignDetail = data;

  const handleAction = async (status: 'approve' | 'reject' | 'pending' | 'lock') => {
    try {
      setPendingAction(status);
      await adminDesignsApi.updateStatus(id, { status, note: note.trim() ? note.trim() : undefined });
      setNote('');
      await mutate();
    } catch (actionError) {
      alert((actionError as Error).message || 'Failed to update design status');
    } finally {
      setPendingAction(null);
    }
  };

  const statusBadgeClass =
    design.reviewStatus === 'Approved'
      ? 'badge badge-success'
      : design.reviewStatus === 'Rejected'
      ? 'badge badge-error'
      : 'badge badge-pending';

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>Design Review</h1>
          <p className="text-muted">Approve or request changes before production</p>
        </div>
        <Link href="/admin/designs" className="btn btn--outline">
          Back to Designs
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <section>
          <div className="admin-form">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Design Preview</h3>
            <div className="design-preview-panel">
              <div className="primary-preview">
                {design.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={design.thumbnailUrl} alt={design.name} />
                ) : (
                  <div className="placeholder" />
                )}
              </div>
              <div className="preview-thumbnails">
                {design.assets.length === 0 ? (
                  <div className="placeholder" style={{ gridColumn: 'span 4', borderRadius: 8, padding: 12 }}>
                    No uploaded assets yet.
                  </div>
                ) : (
                  design.assets.slice(0, 4).map((asset) => (
                    <a
                      key={asset.id}
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="preview-thumb"
                      aria-label={asset.fileName}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.fileName} />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="admin-form" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Version History</h3>
            <div className="admin-table-wrapper" style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Summary</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {design.versions.map((version) => (
                    <tr key={version.id}>
                      <td>v{version.version}</td>
                      <td>{version.summary || 'Auto save'}</td>
                      <td>{new Date(version.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside>
          <div className="admin-form">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Design Information</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <DetailPair label="Design Name" value={design.name} />
              <DetailPair label="Product" value={design.productVariant?.product?.name || 'Custom Product'} />
              <DetailPair
                label="Variant"
                value={
                  design.productVariant?.sku
                    ? [design.productVariant.color, design.productVariant.size, design.productVariant.sku]
                        .filter(Boolean)
                        .join(' • ')
                    : 'N/A'
                }
              />
              <DetailPair
                label="User"
                value={
                  design.user?.email
                    ? `${design.user.email} • ${[design.user.firstName, design.user.lastName].filter(Boolean).join(' ') || ''}`
                    : 'Guest session'
                }
              />
              <DetailPair label="Submitted" value={new Date(design.createdAt).toLocaleString()} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Status</div>
                <span className={statusBadgeClass}>{design.reviewStatus}</span>
              </div>
            </div>
          </div>

          <div className="admin-form" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Review Actions</h3>
            <textarea
              rows={3}
              placeholder="Add optional review notes or rejection reasons..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8 }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <button
                className="btn"
                style={{ width: '100%' }}
                type="button"
                disabled={pendingAction === 'approve'}
                onClick={() => handleAction('approve')}
              >
                ✓ Approve Design
              </button>
              <button
                className="btn"
                type="button"
                style={{ width: '100%', background: '#EF4444', borderColor: '#EF4444' }}
                disabled={pendingAction === 'reject'}
                onClick={() => handleAction('reject')}
              >
                ✕ Reject Design
              </button>
              <button
                className="btn btn--outline"
                style={{ width: '100%' }}
                type="button"
                disabled={pendingAction === 'pending'}
                onClick={() => handleAction('pending')}
              >
                Reset to Draft
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--color-text-muted)' }}>{value}</div>
    </div>
  );
}

