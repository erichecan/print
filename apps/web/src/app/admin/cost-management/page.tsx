'use client';

import { useMemo, useState } from 'react';

const COST_ROWS = [
  {
    id: 'sku-tee-001',
    product: 'Heritage Tee',
    sku: 'TEE-001',
    unitCost: 8.5,
    unitPrice: 22,
    margin: 0.61,
    updatedAt: 'Oct 31, 2025',
  },
  {
    id: 'sku-bottle-002',
    product: 'Traveler Bottle',
    sku: 'BOT-002',
    unitCost: 12.4,
    unitPrice: 32,
    margin: 0.61,
    updatedAt: 'Oct 29, 2025',
  },
  {
    id: 'sku-hoodie-003',
    product: 'Cozy Hoodie',
    sku: 'HD-003',
    unitCost: 24.1,
    unitPrice: 58,
    margin: 0.58,
    updatedAt: 'Oct 27, 2025',
  },
];

export default function CostManagementPage() {
  const [currency, setCurrency] = useState('CAD');
  const [timeframe, setTimeframe] = useState('30');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    if (!search.trim()) {
      return COST_ROWS;
    }
    return COST_ROWS.filter((row) => row.product.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

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
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
        </div>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <StatCard value="$82,450" label="Total Cost" change="+6% vs prior period" positive />
          <StatCard value="$146,320" label="Total Revenue" change="+9% vs prior period" positive />
          <StatCard value="$18.60" label="Average Gross Profit" change="Stable" />
          <StatCard value="43%" label="Average Margin" change="+2 pts vs prior" positive />
        </div>
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
            <a href="#" className="btn" onClick={(event) => event.preventDefault()}>
              Edit Costs
            </a>
          </div>
        </div>
        <div className="admin-table-wrapper">
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
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    No rows found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.product}</td>
                    <td>{row.sku}</td>
                    <td>${row.unitCost.toFixed(2)}</td>
                    <td>${row.unitPrice.toFixed(2)}</td>
                    <td>${(row.unitPrice - row.unitCost).toFixed(2)}</td>
                    <td>{Math.round(row.margin * 100)}%</td>
                    <td>{row.updatedAt}</td>
                    <td>
                      <button type="button" className="btn btn--outline" style={{ fontSize: 12 }} disabled>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
      <div className={`stat-card-change ${positive ? 'positive' : ''}`}>{change}</div>
    </div>
  );
}
