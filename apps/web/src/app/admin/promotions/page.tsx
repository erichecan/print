'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { adminPromotionsApi, AdminPromotion } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext'; // [2025-11-24 11:05:12] 引入后台 i18n，确保右侧内容双语

export default function AdminPromotionsPage() {
  const { t } = useAdminI18n(); // [2025-11-24 11:05:12] 通过 t 函数输出中英文内容
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
      alert((apiError as Error).message || t('promotionsCreateFailed'));
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
    const nextTitle = window.prompt(t('promotionsPromptTitle'), promotion.title);
    if (nextTitle === null) return;
    const nextStart = window.prompt(t('promotionsPromptStartDate'), promotion.startDate || '');
    if (nextStart === null) return;
    const nextEnd = window.prompt(t('promotionsPromptEndDate'), promotion.endDate || '');
    if (nextEnd === null) return;
    await adminPromotionsApi.update(promotion.id, {
      title: nextTitle,
      startDate: nextStart || null,
      endDate: nextEnd || null,
    });
    mutate();
  };

  const removePromotion = async (promotion: AdminPromotion) => {
    const confirmed = window.confirm(t('promotionsConfirmDelete', { title: promotion.title }));
    if (!confirmed) return;
    await adminPromotionsApi.remove(promotion.id);
    mutate();
  };

  const formatDiscountDisplay = (promotion: AdminPromotion) => {
    if (!promotion.discountType || !promotion.discountValue) {
      return '';
    }
    return promotion.discountType === 'percentage'
      ? t('percentageOff', { value: promotion.discountValue })
      : t('fixedOff', { value: promotion.discountValue.toFixed(2) });
  }; // [2025-11-24 11:05:12] 统一折扣展示文本

  const formatMinLabel = (value?: number | null) =>
    value ? t('promotionsMinValue', { amount: Number(value).toFixed(2) }) : '';

  const formatMaxLabel = (value?: number | null) =>
    value ? t('promotionsMaxValue', { amount: Number(value).toFixed(2) }) : '';

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>{t('promotions')}</h1>
          <p className="text-muted">{t('promotionsSubtitle')}</p>
        </div>
      </div>

      <section className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{t('promotionsNewPromotion')}</h3>
        <form className="admin-grid-two" onSubmit={handleCreate}>
          <div className="admin-form-group">
            <label>{t('title')}</label>
            <input type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsLinkLabel')}</label>
            <input type="url" value={form.linkUrl} onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))} />
          </div>
          <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
            <label>{t('description')}</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsBannerLabel')}</label>
            <input
              type="url"
              value={form.bannerImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, bannerImageUrl: event.target.value }))}
            />
          </div>
          {/* [2025-01-28 12:50:00] 折扣类型和值 */}
          <div className="admin-form-group">
            <label>{t('promotionsDiscountTypeLabel')}</label>
            <select
              value={form.discountType}
              onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as 'percentage' | 'fixed' }))}
            >
              <option value="percentage">{t('discountTypePercentage')}</option>
              <option value="fixed">{t('discountTypeFixed')}</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsDiscountValueLabel', { unit: form.discountType === 'percentage' ? '%' : '$' })}</label>
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
            <label>{t('promotionsMinOrderLabel')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderValue}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
              placeholder={t('optionalPlaceholder')}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsMaxDiscountLabel')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
              placeholder={t('promotionsMaxDiscountHint')}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsSortOrderLabel')}</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
            />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsStartDateLabel')}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
          </div>
          <div className="admin-form-group">
            <label>{t('promotionsEndDateLabel')}</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>{t('promotionsStatusLabel')}</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              {t('statusFilterActive')}
            </label>
          </div>
          <div>
            <button className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? t('saving') : t('promotionsCreateButton')}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-filters admin-filters--wrap">
        <div className="admin-search admin-search-form">
          <input
            type="text"
            placeholder={t('promotionsSearchPlaceholder')}
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
          <div className="admin-table-placeholder">{t('promotionsLoading')}</div>
        ) : error ? (
          <div className="admin-table-placeholder error">{t('promotionsLoadFailed')}</div>
        ) : promotions.length === 0 ? (
          <div className="admin-table-placeholder">{t('promotionsEmpty')}</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>{t('promotionsBannerColumn')}</th>
                <th>{t('title')}</th>
                <th>{t('promotionsLinkColumn')}</th>
                <th>{t('promotionsPeriodColumn')}</th>
                <th>{t('promotionsSortColumn')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
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
                        <strong>{formatDiscountDisplay(promotion)}</strong>
                        {promotion.minOrderValue && (
                          <small className="text-muted">{formatMinLabel(Number(promotion.minOrderValue))}</small>
                        )}
                        {promotion.maxDiscount && (
                          <small className="text-muted">{formatMaxLabel(Number(promotion.maxDiscount))}</small>
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
                    {promotion.startDate || t('notAvailable')} → {promotion.endDate || t('notAvailable')}
                  </td>
                  <td>{promotion.sortOrder}</td>
                  <td>
                    <span className={promotion.isActive ? 'badge badge-success' : 'badge badge-pending'}>
                      {promotion.isActive ? t('statusFilterActive') : t('statusFilterInactive')}
                    </span>
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button className="actions-dropdown-btn" type="button">
                        ⋯
                      </button>
                      <div className="actions-dropdown-menu">
                        <button type="button" onClick={() => togglePromotion(promotion)}>
                          {promotion.isActive ? t('deactivate') : t('activate')}
                        </button>
                        <button type="button" onClick={() => quickEdit(promotion)}>{t('promotionsQuickEdit')}</button>
                        <button type="button" onClick={() => removePromotion(promotion)}>{t('delete')}</button>
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
