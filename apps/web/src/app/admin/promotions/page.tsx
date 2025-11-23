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
    // [2025-01-28 12:50:00] 折扣相关字段
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minOrderValue: '',
    maxDiscount: '',
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
      await adminPromotionsApi.create({
        ...form,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      } as Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'categories' | 'coupon'>);
      setForm({
        title: '',
        description: '',
        bannerImageUrl: '',
        linkUrl: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderValue: '',
        maxDiscount: '',
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

  // [2025-11-16 18:05:00] Toggle promotion status inline
  const togglePromotion = async (promotion: AdminPromotion) => {
    await adminPromotionsApi.update(promotion.id, { isActive: !promotion.isActive });
    mutate();
  };

  // [2025-11-16 18:05:00] Quick edit title/period
  const quickEdit = async (promotion: AdminPromotion) => {
    const nextTitle = window.prompt('Edit title', promotion.title);
    if (nextTitle === null) return;
    const nextStart = window.prompt('Edit start date (YYYY-MM-DD, empty for none)', promotion.startDate || '');
    if (nextStart === null) return;
    const nextEnd = window.prompt('Edit end date (YYYY-MM-DD, empty for none)', promotion.endDate || '');
    if (nextEnd === null) return;
    await adminPromotionsApi.update(promotion.id, {
      title: nextTitle,
      startDate: nextStart || null,
      endDate: nextEnd || null,
    });
    mutate();
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
          {/* [2025-01-28 12:50:00] 折扣类型和值 */}
          <div className="admin-form-group">
            <label>Discount Type</label>
            <select
              value={form.discountType}
              onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as 'percentage' | 'fixed' }))}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>Discount Value {form.discountType === 'percentage' ? '(%)' : '($)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.discountValue}
              onChange={(event) => setForm((prev) => ({ ...prev, discountValue: Number(event.target.value) }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>Min Order Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderValue}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="admin-form-group">
            <label>Max Discount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
              placeholder="Optional (for percentage discounts)"
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
              required
            />
          </div>
          <div className="admin-form-group">
            <label>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              required
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

      <div className="admin-table-wrapper">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading promotions…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load promotions.</div>
        ) : promotions.length === 0 ? (
          <div className="admin-table-placeholder">No promotions found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Banner</th>
                <th>Title</th>
                <th>Link</th>
                <th>Period</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    {promotion.bannerImageUrl ? (
                      <div className="product-thumbnail" style={{ width: 56, height: 40, borderRadius: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={promotion.bannerImageUrl} alt={promotion.title} />
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{promotion.title}</strong>
                      <span className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {promotion.description || '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {/* [2025-01-28 12:50:00] 显示折扣信息 */}
                    {promotion.discountType && promotion.discountValue ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>
                          {promotion.discountType === 'percentage'
                            ? `${promotion.discountValue}% OFF`
                            : `$${promotion.discountValue.toFixed(2)} OFF`}
                        </strong>
                        {promotion.minOrderValue && (
                          <small className="text-muted">Min: ${Number(promotion.minOrderValue).toFixed(2)}</small>
                        )}
                        {promotion.maxDiscount && (
                          <small className="text-muted">Max: ${Number(promotion.maxDiscount).toFixed(2)}</small>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {promotion.linkUrl ? (
                      <a href={promotion.linkUrl} target="_blank" rel="noreferrer">
                        {promotion.linkUrl}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {promotion.startDate || 'N/A'} → {promotion.endDate || 'N/A'}
                  </td>
                  <td>{promotion.sortOrder}</td>
                  <td>
                    <span className={promotion.isActive ? 'badge badge-success' : 'badge badge-pending'}>
                      {promotion.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button className="actions-dropdown-btn" type="button">
                        ⋯
                      </button>
                      <div className="actions-dropdown-menu">
                        <button type="button" onClick={() => togglePromotion(promotion)}>
                          {promotion.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => quickEdit(promotion)}>Quick Edit</button>
                        <button type="button" onClick={() => removePromotion(promotion)}>Delete</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
