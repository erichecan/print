'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { adminCouponsApi, AdminCoupon } from '@/lib/api';

const couponTypes = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' },
];

export default function AdminCouponsPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 0,
    userUsageLimit: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(['admin-coupons', searchDraft, statusFilter], () =>
    adminCouponsApi.list({
      search: searchDraft.trim() || undefined,
      status: statusFilter,
    })
  );

  const coupons = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      await adminCouponsApi.create({
        code: form.code,
        type: form.type as 'percentage' | 'fixed',
        value: form.value,
        minOrderValue: form.minOrderValue || undefined,
        maxDiscount: form.maxDiscount || undefined,
        usageLimit: form.usageLimit || undefined,
        userUsageLimit: form.userUsageLimit || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setForm((prev) => ({ ...prev, code: '', value: 10 }));
      mutate();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    await adminCouponsApi.toggle(coupon.id, !coupon.isActive);
    mutate();
  };

  const deleteCoupon = async (coupon: AdminCoupon) => {
    const confirmed = window.confirm(`Delete coupon ${coupon.code}?`);
    if (!confirmed) return;
    await adminCouponsApi.remove(coupon.id);
    mutate();
  };

  const formatDiscount = (coupon: AdminCoupon) =>
    coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`;

  const usageText = (coupon: AdminCoupon) => {
    const limit = coupon.usageLimit ? `${coupon.usageLimit}` : 'Unlimited';
    return `${coupon.usedCount} / ${limit}`;
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="coupons">Coupons</h1>
          <p className="text-muted">Create and track promotional coupon codes</p>
        </div>
      </div>

      <section className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create Coupon</h3>
        <form className="admin-grid-two" onSubmit={handleCreate}>
          <div className="admin-form-group">
            <label>Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>Type</label>
            <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
              {couponTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>Value</label>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={(event) => setForm((prev) => ({ ...prev, value: Number(event.target.value) }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>Min Order Value</label>
            <input
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>Max Discount</label>
            <input
              type="number"
              min={0}
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>Usage Limit</label>
            <input
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>User Usage Limit</label>
            <input
              type="number"
              min={0}
              value={form.userUsageLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, userUsageLimit: Number(event.target.value) }))}
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
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : '+ Create Coupon'}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-filters admin-filters--wrap">
        <div className="admin-search admin-search-form">
          <input
            type="text"
            placeholder="Search coupons..."
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
          <div className="admin-table-placeholder">Loading coupons…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load coupons.</div>
        ) : coupons.length === 0 ? (
          <div className="admin-table-placeholder">No coupons found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Usage</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <strong>{coupon.code}</strong>
                  </td>
                  <td>
                    <span className={coupon.type === 'fixed' ? 'badge badge-info' : 'badge badge-warning'}>
                      {coupon.type === 'fixed' ? 'Fixed Amount' : 'Percentage'}
                    </span>
                  </td>
                  <td>{formatDiscount(coupon)}</td>
                  <td>{usageText(coupon)}</td>
                  <td>
                    {coupon.startDate} → {coupon.endDate}
                  </td>
                  <td>
                    <span className={coupon.isActive ? 'badge badge-success' : 'badge badge-pending'}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button className="actions-dropdown-btn" type="button">
                        ⋯
                      </button>
                      <div className="actions-dropdown-menu">
                        <button type="button" onClick={() => toggleCoupon(coupon)}>
                          {coupon.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => deleteCoupon(coupon)}>
                          Delete
                        </button>
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
