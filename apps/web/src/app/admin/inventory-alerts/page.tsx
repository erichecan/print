'use client';

/**
 * Inventory Alerts Page
 * [2025-12-06 16:00:00] Display low stock and out of stock alerts
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { inventoryApi, LowStockProduct } from '@/lib/api';

export default function InventoryAlertsPage() {
  const [threshold, setThreshold] = useState<number | undefined>(undefined);
  const { data, error, mutate, isLoading } = useSWR(
    ['inventory-alerts', threshold],
    ([, threshold]) => inventoryApi.getAlerts(threshold)
  );

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="admin-table-placeholder">
        <p>加载库存预警信息中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-table-placeholder error">
        <p>加载库存预警信息失败，请稍后重试。</p>
      </div>
    );
  }

  const alerts = data || {
    summary: { lowStockCount: 0, outOfStockCount: 0, totalAlerts: 0, threshold: 10 },
    lowStock: [],
    outOfStock: [],
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1>库存预警</h1>
          <p className="text-muted">
            低库存和缺货产品提醒 · 共 {alerts.summary.totalAlerts} 个预警
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9em' }}>预警阈值:</span>
            <input
              type="number"
              min="0"
              value={threshold ?? alerts.summary.threshold}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                setThreshold(value);
              }}
              style={{ width: '80px', padding: '6px 8px', fontSize: '0.9em' }}
            />
          </label>
          <Link href="/admin/products" className="btn btn--outline">
            管理产品
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="admin-card" style={{ borderLeft: '4px solid #ff9800' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em' }}>低库存产品</h3>
          <p style={{ margin: 0, fontSize: '2em', fontWeight: 'bold', color: '#ff9800' }}>
            {alerts.summary.lowStockCount}
          </p>
        </div>
        <div className="admin-card" style={{ borderLeft: '4px solid #f44336' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em' }}>缺货产品</h3>
          <p style={{ margin: 0, fontSize: '2em', fontWeight: 'bold', color: '#f44336' }}>
            {alerts.summary.outOfStockCount}
          </p>
        </div>
        <div className="admin-card" style={{ borderLeft: '4px solid #2196f3' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em' }}>当前阈值</h3>
          <p style={{ margin: 0, fontSize: '2em', fontWeight: 'bold', color: '#2196f3' }}>
            {alerts.summary.threshold}
          </p>
        </div>
      </div>

      {/* Out of Stock Section */}
      {alerts.outOfStock.length > 0 && (
        <div className="admin-form" style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#f44336', marginTop: 0 }}>🚨 缺货产品</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>产品名称</th>
                  <th>SKU</th>
                  <th>颜色</th>
                  <th>尺寸</th>
                  <th>当前库存</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {alerts.outOfStock.map((product: LowStockProduct) => (
                  <tr key={product.variantId}>
                    <td>
                      <strong>{product.productName}</strong>
                    </td>
                    <td>
                      <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '3px' }}>
                        {product.sku}
                      </code>
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <span style={{ color: '#f44336', fontWeight: 'bold' }}>0</span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/products/${product.productId}`}
                        className="btn btn--outline btn--xs"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock Section */}
      {alerts.lowStock.length > 0 && (
        <div className="admin-form">
          <h2 style={{ color: '#ff9800', marginTop: 0 }}>⚠️ 低库存产品</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>产品名称</th>
                  <th>SKU</th>
                  <th>当前库存</th>
                  <th>预警阈值</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {alerts.lowStock.map((product: LowStockProduct) => (
                  <tr key={product.variantId}>
                    <td>
                      <strong>{product.productName}</strong>
                    </td>
                    <td>
                      <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '3px' }}>
                        {product.sku}
                      </code>
                    </td>
                    <td>
                      <span
                        style={{
                          color: product.currentStock === 0 ? '#f44336' : '#ff9800',
                          fontWeight: 'bold',
                        }}
                      >
                        {product.currentStock}
                      </span>
                    </td>
                    <td>{product.threshold}</td>
                    <td>
                      <span
                        className={`badge badge-${product.isOutOfStock ? 'error' : 'warning'}`}
                        style={{
                          backgroundColor: product.isOutOfStock ? '#ffebee' : '#fff3cd',
                          color: product.isOutOfStock ? '#c62828' : '#e65100',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                        }}
                      >
                        {product.isOutOfStock ? '缺货' : '低库存'}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/products/${product.productId}`}
                        className="btn btn--outline btn--xs"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.summary.totalAlerts === 0 && (
        <div className="admin-table-placeholder">
          <p>✅ 当前没有库存预警，所有产品库存充足。</p>
        </div>
      )}
    </div>
  );
}

