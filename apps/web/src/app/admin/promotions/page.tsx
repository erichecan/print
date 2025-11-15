'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { adminPromotionsApi, AdminPromotion } from '@/lib/api';

export default function AdminPromotionsPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    bannerImageUrl: '',
    linkUrl: '',
    startDate: '',
    endDate: '',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(['admin-promotions', searchDraft, statusFilter], () =>
    adminPromotionsApi.list({
      search: searchDraft.trim() || undefined,
      status: statusFilter,
    })
  );

  const promotions = data?.data ?? [];

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      await adminPromotionsApi.create(form as Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt'>);
      setForm({
        title: '',
        description: '',
        bannerImageUrl: '',
        linkUrl: '',
        startDate: '',
        endDate: '',
        sortOrder: 0,
        isActive: true,
      });
      mutate();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to create promotion');
    } finally {
      setSaving(false);
    }
  };

  const removePromotion = async (promotion: AdminPromotion) => {
    const confirmed = window.confirm(`Delete promotion "${promotion.title}"?`);
    if (!confirmed) return;
    await adminPromotionsApi.remove(promotion.id);
    mutate();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="promotions">Promotions</h1>
          <p className="text-muted">Plan and monitor marketing promotions</p>
        </div>
      </div>

      <section className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>New Promotion</h3>
        <form className="admin-grid-two" onSubmit={handleCreate}>
          <div className="admin-form-group">
            <label>Title</label>
            <input type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
          </div>
          <div className="admin-form-group">
            <label>Link URL</label>
            <input type="url" value={form.linkUrl} onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))} />
          </div>
          <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
            <label>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label>Banner Image URL</label>
            <input
              type="url"
              value={form.bannerImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, bannerImageUrl: event.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label>Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active
            </label>
          </div>
          <div>
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : '+ Create Promotion'}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-filters admin-filters--wrap">
        <div className="admin-search admin-search-form">
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {isLoading ? (
          <div className="admin-table-placeholder">Loading promotions…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load promotions.</div>
        ) : promotions.length === 0 ? (
          <div className="admin-table-placeholder">No promotions found.</div>
        ) : (
          promotions.map((promotion) => (
            <article
              key={promotion.id}
              style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{promotion.title}</h3>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {promotion.description || '—'}
                  </p>
                </div>
                <span className={promotion.isActive ? 'badge badge-success' : 'badge badge-pending'}>
                  {promotion.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {promotion.bannerImageUrl && (
                <div className="product-thumbnail" style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={promotion.bannerImageUrl} alt={promotion.title} />
                </div>
              )}
              <div style={{ padding: 16, background: 'var(--color-bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Promotion Details</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text)' }}>
                  <li>Link: {promotion.linkUrl || '—'}</li>
                  <li>
                    Validity: {promotion.startDate || 'N/A'} → {promotion.endDate || 'N/A'}
                  </li>
                  <li>Sort Order: {promotion.sortOrder}</li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn--outline" onClick={() => removePromotion(promotion)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
