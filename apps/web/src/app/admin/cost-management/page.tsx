'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { adminCostManagementApi, AdminCostRow, AdminCostSummary } from '@/lib/api';

export default function CostManagementPage() {
  const [search, setSearch] = useState('');
  const summaryQuery = useSWR('admin-cost-summary', adminCostManagementApi.getSummary);
  const productsQuery = useSWR(['admin-cost-products', search], ([, searchQuery]) =>
    adminCostManagementApi.listProducts({ search: searchQuery || undefined })
  );

  const summary: AdminCostSummary | undefined = summaryQuery.data?.data;
  const products: AdminCostRow[] = productsQuery.data?.data ?? [];

  const handleEdit = async (row: AdminCostRow) => {
    const unitCostInput = window.prompt('Unit cost', row.unitCost.toString());
    const salePriceInput = window.prompt('Sale price', row.salePrice.toString());
    if (!unitCostInput || !salePriceInput) {
      return;
    }
    const unitCost = Number(unitCostInput);
    const salePrice = Number(salePriceInput);
    if (Number.isNaN(unitCost) || Number.isNaN(salePrice)) {
      alert('Invalid numeric values');
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
          <h1 data-i18n="costManagement">Cost Management</h1>
          <p className="text-muted">Track production cost, revenue, and gross margins</p>
        </div>
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cost Overview</h2>
        </div>
        {summary ? (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <StatCard value={`$${summary.totalCost.toLocaleString()}`} label="Total Cost" change="" />
            <StatCard value={`$${summary.totalRevenue.toLocaleString()}`} label="Total Revenue" change="" positive />
            <StatCard value={`$${summary.averageGrossProfit.toFixed(2)}`} label="Average Gross Profit" change="24h rolling" />
            <StatCard value={`${summary.averageMargin.toFixed(1)}%`} label="Average Margin" change="" positive />
          </div>
        ) : (
          <div className="admin-table-placeholder">Loading summary…</div>
        )}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Product Cost Breakdown</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="admin-search">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="admin-table-wrapper">
          {productsQuery.isLoading ? (
            <div className="admin-table-placeholder">Loading product costs…</div>
          ) : productsQuery.error ? (
            <div className="admin-table-placeholder error">Failed to load product cost data.</div>
          ) : products.length === 0 ? (
            <div className="admin-table-placeholder">No rows found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit Cost</th>
                  <th>Unit Sale Price</th>
                  <th>Unit Gross Profit</th>
                  <th>Margin</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
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
                        Edit
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
