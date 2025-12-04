/**
 * Sales Offline Order Detail Page
 * [2025-12-03 23:30:00] 重新设计订单详情页面，展示所有创建订单时的字段，采用 refined minimalism 风格
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderDetail, OfflineOrderConfiguration } from '@/lib/api';

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOfflineOrderDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await authApi.me().catch(() => null);
        const role = me?.role ? String(me.role).toUpperCase() : '';
        const isSales = ['SALES', 'SALES_MANAGER', 'ADMIN'].includes(role);

        if (!me || !isSales) {
          router.replace('/offline-orders/sales/login');
          return;
        }
      } catch {
        router.replace('/offline-orders/sales/login');
        return;
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }

      try {
        const detail = await salesOrdersApi.get(orderId);
        if (!cancelled) {
          setOrder(detail);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '加载订单详情失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  const meta = order;
  
  // [2025-12-03 23:30:00] 解析配置信息
  const config: OfflineOrderConfiguration | null = meta?.configuration || null;
  
  // [2025-12-03 23:30:00] 按产品分组印刷位置
  const printPositionsByProduct = useMemo(() => {
    if (!config?.printPositions) return {};
    const grouped: Record<string, typeof config.printPositions> = {};
    config.printPositions.forEach((pos) => {
      const key = pos.productItemId || pos.categoryName || '其他';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(pos);
    });
    return grouped;
  }, [config?.printPositions]);
  
  // [2025-12-03 23:30:00] 计算每个产品的总数量和总金额
  const productTotals = useMemo(() => {
    if (!config?.productItems) return {};
    const totals: Record<string, { quantity: number; total: number }> = {};
    config.productItems.forEach((item) => {
      const quantity = item.variants.reduce((sum, v) => sum + v.quantity, 0);
      const total = item.variants.reduce((sum, v) => sum + v.quantity * v.unitPrice, 0);
      totals[item.id] = { quantity, total };
    });
    return totals;
  }, [config?.productItems]);

  if (authChecking) {
    return (
      <div className="order-detail-shell">
        <div className="order-detail-card">
          <p>正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/offline-orders/sales/orders');
  };

  return (
    <div className="order-detail-shell">
      <div className="order-detail-card">
        <header className="order-detail-header">
          <button type="button" className="order-detail-back" onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>返回</span>
          </button>
          <div className="order-detail-header-content">
            <h1>订单详情</h1>
            {meta && (
              <div className="order-detail-header-meta">
                <span className="order-code">{meta.orderCode}</span>
                <div className="order-status-badges">
                  <span className={`status-badge status-${meta.status.toLowerCase()}`}>
                    {meta.status}
                  </span>
                  {meta.rushOrder && <span className="status-badge status-rush">加急</span>}
                  {meta.stage?.label && <span className="status-badge status-stage">{meta.stage.label}</span>}
                </div>
              </div>
            )}
          </div>
        </header>

        {error && <div className="order-detail-error">{error}</div>}

        {loading || !meta ? (
          <div className="order-detail-loading">
            <p>正在加载订单详情...</p>
          </div>
        ) : (
          <div className="order-detail-content">
            {/* [2025-12-03 23:30:00] 项目信息 */}
            <section className="order-section">
              <h2 className="section-title">项目信息</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">项目名称</span>
                  <span className="info-value">{meta.projectName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">主要产品</span>
                  <span className="info-value">{meta.primaryProduct || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">总数量</span>
                  <span className="info-value">{meta.quantity ?? '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">交付日期</span>
                  <span className="info-value">
                    {meta.deliveryDate ? new Date(meta.deliveryDate).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : '—'}
                  </span>
                </div>
                {(meta.requiresMockups || meta.requiresProof || meta.rushOrder) && (
                  <div className="info-item info-item-full">
                    <span className="info-label">特殊要求</span>
                    <div className="info-tags">
                      {meta.requiresMockups && <span className="info-tag tag-mockups">需要 Mockups</span>}
                      {meta.requiresProof && <span className="info-tag tag-proof">需要打样</span>}
                      {meta.rushOrder && <span className="info-tag tag-rush">加急订单</span>}
                    </div>
                  </div>
                )}
                {(config?.artworkNotes || meta.description) && (
                  <div className="info-item info-item-full">
                    <span className="info-label">设计说明</span>
                    <div className="info-text">
                      {config?.artworkNotes || meta.description || '—'}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* [2025-12-03 23:30:00] 客户信息 */}
            <section className="order-section">
              <h2 className="section-title">客户信息</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">联系人</span>
                  <span className="info-value">{meta.contact.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">公司</span>
                  <span className="info-value">{meta.contact.company || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">邮箱</span>
                  <a href={`mailto:${meta.contact.email}`} className="info-value info-link">
                    {meta.contact.email}
                  </a>
                </div>
                <div className="info-item">
                  <span className="info-label">电话</span>
                  <a href={`tel:${meta.contact.phone}`} className="info-value info-link">
                    {meta.contact.phone || '—'}
                  </a>
                </div>
              </div>
            </section>

            {/* [2025-12-03 23:30:00] 产品列表 */}
            {config?.productItems && config.productItems.length > 0 && (
              <section className="order-section order-section-wide">
                <h2 className="section-title">产品列表</h2>
                <div className="products-list">
                  {config.productItems.map((item) => {
                    const totals = productTotals[item.id] || { quantity: 0, total: 0 };
                    return (
                      <div key={item.id} className="product-card">
                        <div className="product-header">
                          <h3 className="product-name">{item.categoryName}</h3>
                          <div className="product-summary">
                            <span>{totals.quantity} 件</span>
                            <span className="product-total">${totals.total.toFixed(2)} CAD</span>
                          </div>
                        </div>
                        <table className="variants-table">
                          <thead>
                            <tr>
                              <th>尺码</th>
                              <th>颜色</th>
                              <th>数量</th>
                              <th>单价</th>
                              <th>小计</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.variants.map((variant, idx) => {
                              const variantTotal = variant.quantity * variant.unitPrice;
                              return (
                                <tr key={idx}>
                                  <td>{variant.size || '—'}</td>
                                  <td>{variant.color || '—'}</td>
                                  <td>{variant.quantity}</td>
                                  <td>${variant.unitPrice.toFixed(2)}</td>
                                  <td className="variant-total">${variantTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* [2025-12-03 23:30:00] 印刷位置 */}
            {config?.printPositions && config.printPositions.length > 0 && (
              <section className="order-section order-section-wide">
                <h2 className="section-title">印刷位置</h2>
                <div className="print-positions-list">
                  {config.productItems?.map((item) => {
                    const positions = printPositionsByProduct[item.id] || 
                                     printPositionsByProduct[item.categoryName] || [];
                    if (positions.length === 0) return null;
                    return (
                      <div key={item.id} className="print-group">
                        <h3 className="print-group-title">{item.categoryName}</h3>
                        <div className="print-positions">
                          {positions.map((pos, idx) => (
                            <div key={idx} className="print-position-item">
                              <div className="print-position-header">
                                <span className="print-position-name">{pos.position}</span>
                                <span className="print-position-size">
                                  {pos.width}&quot; × {pos.height}&quot;
                                </span>
                              </div>
                              {pos.notes && (
                                <p className="print-position-notes">{pos.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.entries(printPositionsByProduct).map(([key, positions]) => {
                    if (config.productItems?.some(item => item.id === key || item.categoryName === key)) {
                      return null;
                    }
                    if (key === '其他') {
                      return null;
                    }
                    return (
                      <div key={key} className="print-group">
                        <h3 className="print-group-title">{key}</h3>
                        <div className="print-positions">
                          {positions.map((pos, idx) => (
                            <div key={idx} className="print-position-item">
                              <div className="print-position-header">
                                <span className="print-position-name">{pos.position}</span>
                                <span className="print-position-size">
                                  {pos.width}&quot; × {pos.height}&quot;
                                </span>
                              </div>
                              {pos.notes && (
                                <p className="print-position-notes">{pos.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {printPositionsByProduct['其他'] && printPositionsByProduct['其他'].length > 0 && (
                    <div className="print-group">
                      <h3 className="print-group-title">其他</h3>
                      <div className="print-positions">
                        {printPositionsByProduct['其他'].map((pos, idx) => (
                          <div key={idx} className="print-position-item">
                            <div className="print-position-header">
                              <span className="print-position-name">{pos.position}</span>
                              <span className="print-position-size">
                                {pos.width}&quot; × {pos.height}&quot;
                              </span>
                            </div>
                            {pos.notes && (
                              <p className="print-position-notes">{pos.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* [2025-12-03 23:30:00] 价格信息 */}
            {config?.pricing && (
              <section className="order-section">
                <h2 className="section-title">价格信息</h2>
                <div className="pricing-card">
                  <div className="pricing-row">
                    <span className="pricing-label">小计</span>
                    <span className="pricing-value">${config.pricing.subtotal.toFixed(2)} {config.pricing.currency}</span>
                  </div>
                  {config.pricing.discount > 0 && (
                    <div className="pricing-row pricing-discount">
                      <span className="pricing-label">折扣 ({config.pricing.discount}%)</span>
                      <span className="pricing-value">-${config.pricing.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pricing-row pricing-total">
                    <span className="pricing-label">总计</span>
                    <span className="pricing-value">${config.pricing.total.toFixed(2)} {config.pricing.currency}</span>
                  </div>
                </div>
              </section>
            )}

            {/* [2025-12-03 23:30:00] 发票信息 */}
            {config?.requiresInvoice && config.invoiceInfo && (
              <section className="order-section">
                <h2 className="section-title">发票信息</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">公司名称</span>
                    <span className="info-value">{config.invoiceInfo.companyName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">公司邮箱</span>
                    <a href={`mailto:${config.invoiceInfo.companyEmail}`} className="info-value info-link">
                      {config.invoiceInfo.companyEmail}
                    </a>
                  </div>
                  <div className="info-item">
                    <span className="info-label">税号</span>
                    <span className="info-value">{config.invoiceInfo.taxNumber || '—'}</span>
                  </div>
                  <div className="info-item info-item-full">
                    <span className="info-label">地址</span>
                    <span className="info-value">{config.invoiceInfo.address}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">城市</span>
                    <span className="info-value">{config.invoiceInfo.city}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">省份</span>
                    <span className="info-value">{config.invoiceInfo.province}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">邮编</span>
                    <span className="info-value">{config.invoiceInfo.postalCode}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">国家</span>
                    <span className="info-value">{config.invoiceInfo.country || 'Canada'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* [2025-12-03 23:30:00] 附件 */}
            {meta.assets && meta.assets.length > 0 && (
              <section className="order-section order-section-wide">
                <h2 className="section-title">附件 ({meta.assets.length})</h2>
                <div className="assets-list">
                  {meta.assets.map((asset: any) => (
                    <a
                      key={asset.id}
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="asset-item"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.5 2.5H17.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8.33333 11.6667L17.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="asset-name">{asset.fileName}</span>
                      <span className="asset-size">{(asset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* [2025-12-03 23:30:00] 生产信息 */}
            {meta.productionWorkOrder && (
              <section className="order-section order-section-wide">
                <h2 className="section-title">生产信息</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">工单编号</span>
                    <span className="info-value">{meta.productionWorkOrder.workOrderCode}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">生产状态</span>
                    <span className="info-value">{meta.productionWorkOrder.status}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">负责人</span>
                    <span className="info-value">{meta.productionWorkOrder.assignee?.name || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">计划开始</span>
                    <span className="info-value">
                      {meta.productionWorkOrder.startDate
                        ? new Date(meta.productionWorkOrder.startDate).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">计划完成</span>
                    <span className="info-value">
                      {meta.productionWorkOrder.dueDate
                        ? new Date(meta.productionWorkOrder.dueDate).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '—'}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        /* [2025-12-03 23:30:00] Refined Minimalism 设计风格 - 优雅、精致、简洁 */
        .order-detail-shell {
          min-height: 100vh;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
          display: flex;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        }

        .order-detail-card {
          width: 100%;
          max-width: 1200px;
          background: #ffffff;
          border-radius: 24px;
          padding: 0;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .order-detail-header {
          padding: 2rem 2.5rem;
          border-bottom: 1px solid #f0f2f5;
          background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
        }

        .order-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          margin-bottom: 1rem;
          border: none;
          background: transparent;
          color: #4a5568;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-detail-back:hover {
          color: #2563eb;
          transform: translateX(-2px);
        }

        .order-detail-back svg {
          transition: transform 0.2s ease;
        }

        .order-detail-back:hover svg {
          transform: translateX(-2px);
        }

        .order-detail-header-content h1 {
          margin: 0 0 1rem;
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          letter-spacing: -0.02em;
        }

        .order-detail-header-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .order-code {
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          background: #f7fafc;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .order-status-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .status-active {
          background: #ecfdf5;
          color: #059669;
        }

        .status-completed {
          background: #eff6ff;
          color: #2563eb;
        }

        .status-cancelled {
          background: #fef2f2;
          color: #dc2626;
        }

        .status-rush {
          background: #fffbeb;
          color: #d97706;
        }

        .status-stage {
          background: #f3f4f6;
          color: #6b7280;
        }

        .order-detail-error {
          margin: 1.5rem 2.5rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.875rem;
          border: 1px solid #fecaca;
        }

        .order-detail-loading {
          padding: 4rem 2.5rem;
          text-align: center;
          color: #718096;
        }

        .order-detail-content {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .order-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.75rem;
          transition: all 0.3s ease;
        }

        .order-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .order-section-wide {
          grid-column: 1 / -1;
        }

        .section-title {
          margin: 0 0 1.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a202c;
          letter-spacing: -0.01em;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f2f5;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-item-full {
          grid-column: 1 / -1;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #2d3748;
        }

        .info-link {
          color: #2563eb;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .info-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .info-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .info-tag {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .tag-mockups {
          background: #e0f2fe;
          color: #0369a1;
        }

        .tag-proof {
          background: #fce7f3;
          color: #be185d;
        }

        .tag-rush {
          background: #fef3c7;
          color: #b45309;
        }

        .info-text {
          padding: 1rem;
          background: #f7fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #4a5568;
          white-space: pre-wrap;
        }

        .products-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .product-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          background: #fafbfc;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .product-name {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a202c;
        }

        .product-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: #718096;
        }

        .product-total {
          font-weight: 700;
          color: #2563eb;
          font-size: 1rem;
        }

        .variants-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .variants-table thead {
          background: #ffffff;
        }

        .variants-table th {
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #4a5568;
          border-bottom: 2px solid #e2e8f0;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .variants-table td {
          padding: 0.875rem 0.75rem;
          border-bottom: 1px solid #f0f2f5;
          color: #2d3748;
        }

        .variants-table tbody tr:hover {
          background: #fafbfc;
        }

        .variant-total {
          font-weight: 700;
          color: #2563eb;
        }

        .print-positions-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .print-group {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          background: #fafbfc;
        }

        .print-group-title {
          margin: 0 0 1rem;
          font-size: 1rem;
          font-weight: 700;
          color: #1a202c;
        }

        .print-positions {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .print-position-item {
          padding: 1rem;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .print-position-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .print-position-name {
          font-weight: 600;
          color: #2d3748;
          font-size: 0.875rem;
        }

        .print-position-size {
          font-size: 0.75rem;
          color: #718096;
          background: #f7fafc;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        .print-position-notes {
          margin: 0.5rem 0 0;
          font-size: 0.8125rem;
          color: #718096;
          font-style: italic;
          line-height: 1.5;
        }

        .pricing-card {
          background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
        }

        .pricing-row:not(:last-child) {
          border-bottom: 1px solid #e2e8f0;
        }

        .pricing-label {
          font-size: 0.875rem;
          color: #718096;
          font-weight: 500;
        }

        .pricing-value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #2d3748;
        }

        .pricing-discount .pricing-value {
          color: #dc2626;
        }

        .pricing-total {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 2px solid #e2e8f0;
        }

        .pricing-total .pricing-label {
          font-size: 1rem;
          font-weight: 700;
          color: #1a202c;
        }

        .pricing-total .pricing-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2563eb;
        }

        .assets-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .asset-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fafbfc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          text-decoration: none;
          color: #2d3748;
          transition: all 0.2s ease;
        }

        .asset-item:hover {
          background: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          transform: translateY(-2px);
        }

        .asset-item svg {
          flex-shrink: 0;
          color: #718096;
        }

        .asset-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .asset-size {
          font-size: 0.75rem;
          color: #718096;
        }

        @media (max-width: 768px) {
          .order-detail-shell {
            padding: 1rem 0.5rem;
          }

          .order-detail-header {
            padding: 1.5rem 1.25rem;
          }

          .order-detail-content {
            padding: 1.5rem 1.25rem;
            gap: 1.5rem;
          }

          .order-section {
            padding: 1.25rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .print-positions {
            grid-template-columns: 1fr;
          }

          .assets-list {
            grid-template-columns: 1fr;
          }

          .order-detail-header-content h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
