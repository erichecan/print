'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { adminCouponsApi, AdminCoupon } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext'; // 引入 i18n 以实现右侧内容双语
// Coupon statistics for Issue #138

const couponTypes = [
  { value: 'percentage', labelKey: 'discountTypePercentage' },
  { value: 'fixed', labelKey: 'discountTypeFixed' },
];

export default function AdminCouponsPage() {
  const { t } = useAdminI18n(); // 使用 t 输出中英文
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

  // Load coupon statistics for Issue #138
  const { data: statisticsData, isLoading: statisticsLoading } = useSWR('admin-coupons-statistics', () =>
    adminCouponsApi.getStatistics()
  );

  const coupons = useMemo(() => data?.data ?? [], [data]);
  const statistics = useMemo(() => statisticsData?.data, [statisticsData]);

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
      alert((apiError as Error).message || t('couponsCreateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    await adminCouponsApi.toggle(coupon.id, !coupon.isActive);
    mutate();
  };

  const deleteCoupon = async (coupon: AdminCoupon) => {
    // Confirm dialog removed per user request
    // const confirmed = window.confirm(t('couponsConfirmDelete', { code: coupon.code }));
    // if (!confirmed) return;
    await adminCouponsApi.remove(coupon.id);
    mutate();
  };

  const formatDiscount = (coupon: AdminCoupon) =>
    coupon.type === 'percentage'
      ? t('percentageValue', { value: coupon.value })
      : t('currencyValue', { value: coupon.value.toFixed(2) });

  const usageText = (coupon: AdminCoupon) => {
    const limit = coupon.usageLimit ? `${coupon.usageLimit}` : t('couponsUnlimited');
    return t('couponsUsageText', { used: coupon.usedCount, limit });
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>{t('coupons')}</h1>
          <p className="text-muted">{t('couponsSubtitle')}</p>
        </div>
      </div>

      {/* Coupon Statistics Section for Issue #138 */}
      {statistics && (
        <section className="admin-stats-grid" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="admin-stat-card" style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>总优惠券数</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1e293b' }}>{statistics.overview.totalCoupons}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              活跃: {statistics.overview.activeCoupons} | 未激活: {statistics.overview.inactiveCoupons}
            </div>
          </div>
          <div className="admin-stat-card" style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>总使用次数</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1e293b' }}>{statistics.overview.totalUsage}</div>
          </div>
          <div className="admin-stat-card" style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>总折扣金额</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }}>${statistics.overview.totalDiscountAmount.toFixed(2)}</div>
          </div>
        </section>
      )}

      {/* Top Coupons Section */}
      {statistics && statistics.topCoupons.length > 0 && (
        <section style={{ marginBottom: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>最受欢迎的优惠券</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {statistics.topCoupons.slice(0, 5).map((item, index) => (
              item.coupon && (
                <div key={item.coupon.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, color: '#64748b', minWidth: 24 }}>#{index + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.coupon.code}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {item.coupon.type === 'percentage' ? `${item.coupon.value}%` : `$${item.coupon.value.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.usageCount} 次</div>
                    <div style={{ fontSize: 12, color: '#10b981' }}>${item.totalDiscount.toFixed(2)}</div>
                  </div>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      <section className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{t('couponsCreateHeading')}</h3>
        <form className="admin-grid-two" onSubmit={handleCreate}>
          <div className="admin-form-group">
            <label>{t('couponsCodeLabel')}</label>
            <input
              type="text"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsTypeLabel')}</label>
            <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
              {couponTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(type.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>{t('couponsValueLabel')}</label>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={(event) => setForm((prev) => ({ ...prev, value: Number(event.target.value) }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsMinOrderLabel')}</label>
            <input
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsMaxDiscountLabel')}</label>
            <input
              type="number"
              min={0}
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsUsageLimitLabel')}</label>
            <input
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsUserUsageLimitLabel')}</label>
            <input
              type="number"
              min={0}
              value={form.userUsageLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, userUsageLimit: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsStartDateLabel')}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('couponsEndDateLabel')}</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div>
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? t('saving') : t('couponsCreateButton')}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-filters admin-filters--wrap">
        <div className="admin-search admin-search-form">
          <input
            type="text"
            placeholder={t('couponsSearchPlaceholder')}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">{t('statusFilterAll')}</option>
          <option value="active">{t('statusFilterActive')}</option>
          <option value="inactive">{t('statusFilterInactive')}</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        {isLoading ? (
          <div className="admin-table-placeholder">{t('couponsLoading')}</div>
        ) : error ? (
          <div className="admin-table-placeholder error">{t('couponsLoadFailed')}</div>
        ) : coupons.length === 0 ? (
          <div className="admin-table-placeholder">{t('couponsEmpty')}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('couponsCodeColumn')}</th>
                <th>{t('couponsTypeColumn')}</th>
                <th>{t('couponsValueColumn')}</th>
                <th>{t('couponsUsageColumn')}</th>
                <th>{t('couponsValidityColumn')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
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
                      {coupon.type === 'fixed' ? t('discountTypeFixed') : t('discountTypePercentage')}
                    </span>
                  </td>
                  <td>{formatDiscount(coupon)}</td>
                  <td>{usageText(coupon)}</td>
                  <td>
                    {coupon.startDate} → {coupon.endDate}
                  </td>
                  <td>
                    <span className={coupon.isActive ? 'badge badge-success' : 'badge badge-pending'}>
                      {coupon.isActive ? t('statusFilterActive') : t('statusFilterInactive')}
                    </span>
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button className="actions-dropdown-btn" type="button">
                        ⋯
                      </button>
                      <div className="actions-dropdown-menu">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const stats = await adminCouponsApi.getCouponStatistics(coupon.id);
                              const statsInfo = stats.data;
                              alert(
                                `优惠券统计: ${coupon.code}\n\n` +
                                `使用次数: ${statsInfo.statistics.usageCount}\n` +
                                `总折扣: $${statsInfo.statistics.totalDiscount.toFixed(2)}\n` +
                                `平均折扣: $${statsInfo.statistics.averageDiscount.toFixed(2)}\n` +
                                `唯一用户: ${statsInfo.statistics.uniqueUsers}`
                              );
                            } catch (err) {
                              alert('无法加载统计信息');
                            }
                          }}
                        >
                          查看统计
                        </button>
                        <button type="button" onClick={() => toggleCoupon(coupon)}>
                          {coupon.isActive ? t('deactivate') : t('activate')}
                        </button>
                        <button type="button" onClick={() => deleteCoupon(coupon)}>
                          {t('delete')}
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
