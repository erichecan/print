'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { adminCostManagementApi, AdminCostRow, AdminCostSummary } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext'; // [2025-01-28 08:45:00] 国际化支持

export default function CostManagementPage() {
  const { t } = useAdminI18n(); // [2025-01-28 08:45:00] 国际化支持
  const [search, setSearch] = useState('');
  const summaryQuery = useSWR('admin-cost-summary', adminCostManagementApi.getSummary);
  const productsQuery = useSWR(['admin-cost-products', search], ([, searchQuery]) =>
    adminCostManagementApi.listProducts({ search: searchQuery || undefined })
  );

  const summary: AdminCostSummary | undefined = summaryQuery.data?.data;
  const products: AdminCostRow[] = productsQuery.data?.data ?? [];

  const handleEdit = async (row: AdminCostRow) => {
    const unitCostInput = window.prompt(t('unitCostPrompt'), row.unitCost.toString());
    const salePriceInput = window.prompt(t('salePricePrompt'), row.salePrice.toString());
    if (!unitCostInput || !salePriceInput) {
      return;
    }
    const unitCost = Number(unitCostInput);
    const salePrice = Number(salePriceInput);
    if (Number.isNaN(unitCost) || Number.isNaN(salePrice)) {
      alert(t('invalidNumericValues'));
      return;
    }
    await adminCostManagementApi.updateProduct(row.id, { unitCost, salePrice });
    productsQuery.mutate();
    summaryQuery.mutate();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>{t('costManagement')}</h1>
          <p className="text-muted">{t('costManagementSubtitle')}</p>
        </div>
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('costOverview')}</h2>
        </div>
        {summary ? (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <StatCard value={`$${summary.totalCost.toLocaleString()}`} label={t('totalCost')} change="" />
            <StatCard value={`$${summary.totalRevenue.toLocaleString()}`} label={t('totalRevenue')} change="" positive />
            <StatCard value={`$${summary.averageGrossProfit.toFixed(2)}`} label={t('averageGrossProfit')} change="24h rolling" />
            <StatCard value={`${summary.averageMargin.toFixed(1)}%`} label={t('averageMargin')} change="" positive />
          </div>
        ) : (
          <div className="admin-table-placeholder">{t('loadingSummary')}</div>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('productCostBreakdown')}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="admin-search">
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="admin-table-wrapper">
          {productsQuery.isLoading ? (
            <div className="admin-table-placeholder">{t('loadingProductCosts')}</div>
          ) : productsQuery.error ? (
            <div className="admin-table-placeholder error">{t('failedToLoadProductCostData')}</div>
          ) : products.length === 0 ? (
            <div className="admin-table-placeholder">{t('noRowsFound')}</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('product')}</th>
                  <th>{t('skuColumn')}</th>
                  <th>{t('unitCost')}</th>
                  <th>{t('unitSalePrice')}</th>
                  <th>{t('unitGrossProfit')}</th>
                  <th>{t('margin')}</th>
                  <th>{t('lastUpdated')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.sku || '—'}</td>
                    <td>${row.unitCost.toFixed(2)}</td>
                    <td>${row.salePrice.toFixed(2)}</td>
                    <td>${row.grossProfit.toFixed(2)}</td>
                    <td>{row.margin.toFixed(1)}%</td>
                    <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <button type="button" className="btn btn--outline" style={{ fontSize: 12 }} onClick={() => handleEdit(row)}>
                        {t('edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ value, label, change, positive }: { value: string; label: string; change: string; positive?: boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {change && <div className={`stat-card-change ${positive ? 'positive' : ''}`}>{change}</div>}
    </div>
  );
}
