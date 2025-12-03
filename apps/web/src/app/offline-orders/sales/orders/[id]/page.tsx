/**
 * Sales Offline Order Detail Page
 * [2025-12-02 04:54:00] Sales 查看单个线下订单详情
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
  
  // [2025-01-28 21:30:00] 解析配置信息
  const config: OfflineOrderConfiguration | null = meta?.configuration || null;
  
  // [2025-01-28 21:30:00] 按产品分组印刷位置（必须在 early return 之前调用）
  const printPositionsByProduct = useMemo(() => {
    if (!config?.printPositions) return {};
    const grouped: Record<string, typeof config.printPositions> = {};
    config.printPositions.forEach((pos) => {
      // 优先使用 productItemId，其次使用 categoryName，最后使用 '其他'
      const key = pos.productItemId || pos.categoryName || '其他';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(pos);
    });
    return grouped;
  }, [config?.printPositions]);
  
  // [2025-01-28 21:30:00] 计算每个产品的总数量和总金额（必须在 early return 之前调用）
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
      <div className="sales-order-shell">
        <div className="sales-order-card">
          <p>正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/offline-orders/sales/orders');
  };

  return (
    <div className="sales-order-shell">
      <div className="sales-order-card">
        <header className="sales-order-header">
          <div>
            <button type="button" className="sales-order-back" onClick={handleBack}>
              ← 返回列表
            </button>
            <h1>线下订单详情</h1>
            {meta && (
              <p>
                订单编号：<strong>{meta.orderCode}</strong>
              </p>
            )}
          </div>
        </header>

        {error && <div className="sales-order-error">{error}</div>}

        {loading || !meta ? (
          <p>正在加载订单详情...</p>
        ) : (
          <div className="sales-order-grid">
            <section>
              <h2>基本信息</h2>
              <dl>
                <div>
                  <dt>项目名称</dt>
                  <dd>{meta.projectName}</dd>
                </div>
                <div>
                  <dt>主要产品</dt>
                  <dd>{meta.primaryProduct || '—'}</dd>
                </div>
                <div>
                  <dt>数量</dt>
                  <dd>{meta.quantity ?? '—'}</dd>
                </div>
                <div>
                  <dt>交付日期</dt>
                  <dd>{meta.deliveryDate ? new Date(meta.deliveryDate).toLocaleDateString() : '—'}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>
                    <span className={`tag tag-${meta.status.toLowerCase()}`}>{meta.status}</span>
                    {meta.rushOrder && <span className="tag tag-rush">加急</span>}
                  </dd>
                </div>
                <div>
                  <dt>阶段</dt>
                  <dd>{meta.stage?.label || '—'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>客户信息</h2>
              <dl>
                <div>
                  <dt>联系人</dt>
                  <dd>{meta.contact.name}</dd>
                </div>
                <div>
                  <dt>公司</dt>
                  <dd>{meta.contact.company || '—'}</dd>
                </div>
                <div>
                  <dt>邮箱</dt>
                  <dd>{meta.contact.email}</dd>
                </div>
                <div>
                  <dt>电话</dt>
                  <dd>{meta.contact.phone || '—'}</dd>
                </div>
              </dl>
            </section>

            {/* [2025-01-28 21:30:00] 产品列表部分 */}
            {config?.productItems && config.productItems.length > 0 && (
              <section className="sales-order-wide">
                <h2>产品列表</h2>
                <div className="sales-order-products">
                  {config.productItems.map((item) => {
                    const totals = productTotals[item.id] || { quantity: 0, total: 0 };
                    return (
                      <div key={item.id} className="sales-order-product-card">
                        <h3 className="sales-order-product-title">
                          {item.categoryName}
                          <span className="sales-order-product-summary">
                            {totals.quantity} 件 · ${totals.total.toFixed(2)} CAD
                          </span>
                        </h3>
                        <table className="sales-order-variants-table">
                          <thead>
                            <tr>
                              <th>尺码</th>
                              <th>颜色</th>
                              <th>数量</th>
                              <th>单价 (CAD)</th>
                              <th>小计 (CAD)</th>
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
                                  <td className="sales-order-variant-total">${variantTotal.toFixed(2)}</td>
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

            {/* [2025-01-28 21:30:00] 印刷位置部分 */}
            {config?.printPositions && config.printPositions.length > 0 && (
              <section className="sales-order-wide">
                <h2>印刷位置</h2>
                <div className="sales-order-print-positions">
                  {/* 先显示有产品关联的印刷位置 */}
                  {config.productItems?.map((item) => {
                    // 尝试通过产品 ID 或分类名称匹配
                    const positions = printPositionsByProduct[item.id] || 
                                     printPositionsByProduct[item.categoryName] || [];
                    if (positions.length === 0) return null;
                    return (
                      <div key={item.id} className="sales-order-print-group">
                        <h3 className="sales-order-print-group-title">{item.categoryName}</h3>
                        <div className="sales-order-print-list">
                          {positions.map((pos, idx) => (
                            <div key={idx} className="sales-order-print-item">
                              <div className="sales-order-print-header">
                                <strong>位置 {idx + 1}: {pos.position}</strong>
                                <span className="sales-order-print-size">
                                  {pos.width}&quot; × {pos.height}&quot;
                                </span>
                              </div>
                              {pos.notes && (
                                <p className="sales-order-print-notes">{pos.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* 显示按分类名称分组但没有产品 ID 的印刷位置 */}
                  {Object.entries(printPositionsByProduct).map(([key, positions]) => {
                    // 跳过已经通过产品显示的位置
                    if (config.productItems?.some(item => item.id === key || item.categoryName === key)) {
                      return null;
                    }
                    // 跳过"其他"组，稍后单独处理
                    if (key === '其他') {
                      return null;
                    }
                    return (
                      <div key={key} className="sales-order-print-group">
                        <h3 className="sales-order-print-group-title">{key}</h3>
                        <div className="sales-order-print-list">
                          {positions.map((pos, idx) => (
                            <div key={idx} className="sales-order-print-item">
                              <div className="sales-order-print-header">
                                <strong>位置 {idx + 1}: {pos.position}</strong>
                                <span className="sales-order-print-size">
                                  {pos.width}&quot; × {pos.height}&quot;
                                </span>
                              </div>
                              {pos.notes && (
                                <p className="sales-order-print-notes">{pos.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* 处理没有关联产品的印刷位置 */}
                  {printPositionsByProduct['其他'] && printPositionsByProduct['其他'].length > 0 && (
                    <div className="sales-order-print-group">
                      <h3 className="sales-order-print-group-title">其他</h3>
                      <div className="sales-order-print-list">
                        {printPositionsByProduct['其他'].map((pos, idx) => (
                          <div key={idx} className="sales-order-print-item">
                            <div className="sales-order-print-header">
                              <strong>位置 {idx + 1}: {pos.position}</strong>
                              <span className="sales-order-print-size">
                                {pos.width}&quot; × {pos.height}&quot;
                              </span>
                            </div>
                            {pos.notes && (
                              <p className="sales-order-print-notes">{pos.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* [2025-01-28 21:30:00] 价格信息部分 */}
            {config?.pricing && (
              <section>
                <h2>价格信息</h2>
                <dl>
                  <div>
                    <dt>小计</dt>
                    <dd>${config.pricing.subtotal.toFixed(2)} {config.pricing.currency}</dd>
                  </div>
                  {config.pricing.discount > 0 && (
                    <>
                      <div>
                        <dt>折扣 ({config.pricing.discount}%)</dt>
                        <dd className="sales-order-discount">-${config.pricing.discountAmount.toFixed(2)}</dd>
                      </div>
                    </>
                  )}
                  <div className="sales-order-total-row">
                    <dt>总计</dt>
                    <dd className="sales-order-total">${config.pricing.total.toFixed(2)} {config.pricing.currency}</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* [2025-01-28 21:30:00] 发票信息部分 */}
            {config?.requiresInvoice && config.invoiceInfo && (
              <section>
                <h2>发票信息</h2>
                <dl>
                  <div>
                    <dt>公司名称</dt>
                    <dd>{config.invoiceInfo.companyName}</dd>
                  </div>
                  <div>
                    <dt>公司邮箱</dt>
                    <dd>{config.invoiceInfo.companyEmail}</dd>
                  </div>
                  <div>
                    <dt>税号</dt>
                    <dd>{config.invoiceInfo.taxNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>地址</dt>
                    <dd>{config.invoiceInfo.address}</dd>
                  </div>
                  <div>
                    <dt>城市</dt>
                    <dd>{config.invoiceInfo.city}</dd>
                  </div>
                  <div>
                    <dt>省份</dt>
                    <dd>{config.invoiceInfo.province}</dd>
                  </div>
                  <div>
                    <dt>邮编</dt>
                    <dd>{config.invoiceInfo.postalCode}</dd>
                  </div>
                  <div>
                    <dt>国家</dt>
                    <dd>{config.invoiceInfo.country || 'Canada'}</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* [2025-01-28 21:30:00] 设计说明和其他选项 */}
            <section className="sales-order-wide">
              <h2>订单选项和说明</h2>
              <dl>
                {(meta.requiresMockups !== undefined || meta.requiresProof !== undefined) && (
                  <div>
                    <dt>特殊要求</dt>
                    <dd>
                      {meta.requiresMockups && <span className="tag tag-option">需要 Mockups</span>}
                      {meta.requiresProof && <span className="tag tag-option">需要打样</span>}
                      {!meta.requiresMockups && !meta.requiresProof && '—'}
                    </dd>
                  </div>
                )}
                {(config?.artworkNotes || meta.description) && (
                  <div className="sales-order-notes-row">
                    <dt>设计说明</dt>
                    <dd className="sales-order-notes">
                      {config?.artworkNotes || meta.description || '—'}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* [2025-01-28 21:30:00] 附件列表 */}
            {meta.assets && meta.assets.length > 0 && (
              <section className="sales-order-wide">
                <h2>附件 ({meta.assets.length})</h2>
                <div className="sales-order-assets">
                  {meta.assets.map((asset: any) => (
                    <div key={asset.id} className="sales-order-asset-item">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sales-order-asset-link"
                      >
                        {asset.fileName}
                      </a>
                      <span className="sales-order-asset-size">
                        {(asset.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="sales-order-wide">
              <h2>生产信息</h2>
              {meta.productionWorkOrder ? (
                <dl>
                  <div>
                    <dt>工单编号</dt>
                    <dd>{meta.productionWorkOrder.workOrderCode}</dd>
                  </div>
                  <div>
                    <dt>生产状态</dt>
                    <dd>{meta.productionWorkOrder.status}</dd>
                  </div>
                  <div>
                    <dt>负责人</dt>
                    <dd>{meta.productionWorkOrder.assignee?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt>计划开始</dt>
                    <dd>
                      {meta.productionWorkOrder.startDate
                        ? new Date(meta.productionWorkOrder.startDate).toLocaleDateString()
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>计划完成</dt>
                    <dd>
                      {meta.productionWorkOrder.dueDate
                        ? new Date(meta.productionWorkOrder.dueDate).toLocaleDateString()
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>该订单尚未创建生产工单。</p>
              )}
            </section>
          </div>
        )}
      </div>

      <style jsx>{`
        .sales-order-shell {
          min-height: 100vh;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top, #e0f2fe, #f9fafb);
          display: flex;
          justify-content: center;
        }
        .sales-order-card {
          width: 100%;
          max-width: 1100px;
          background: #ffffff;
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        }
        .sales-order-header h1 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .sales-order-header p {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }
        .sales-order-back {
          border: none;
          background: transparent;
          color: #2563eb;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
        }
        .sales-order-error {
          margin-top: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
        }
        .sales-order-grid {
          margin-top: 1.5rem;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
        }
        .sales-order-grid section {
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          padding: 1rem 1rem;
          background: #f9fafb;
        }
        .sales-order-grid h2 {
          margin: 0 0 0.75rem;
          font-size: 1rem;
          font-weight: 600;
        }
        dl {
          margin: 0;
        }
        dl > div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.35rem 0;
          border-bottom: 1px dashed #e5e7eb;
        }
        dl > div:last-child {
          border-bottom: none;
        }
        dt {
          font-size: 0.85rem;
          color: #6b7280;
        }
        dd {
          margin: 0;
          font-size: 0.9rem;
          color: #111827;
          text-align: right;
        }
        .sales-order-wide {
          grid-column: 1 / -1;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.25rem;
        }
        .tag-active {
          background: #ecfdf3;
          color: #15803d;
        }
        .tag-completed {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .tag-cancelled {
          background: #fef2f2;
          color: #b91c1c;
        }
        .tag-rush {
          background: #fef3c7;
          color: #b45309;
        }
        .tag-option {
          background: #e0f2fe;
          color: #0369a1;
        }
        /* [2025-01-28 21:30:00] 产品列表样式 */
        .sales-order-products {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .sales-order-product-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          background: #ffffff;
        }
        .sales-order-product-title {
          margin: 0 0 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sales-order-product-summary {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }
        .sales-order-variants-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .sales-order-variants-table thead {
          background: #f9fafb;
        }
        .sales-order-variants-table th {
          padding: 0.5rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        .sales-order-variants-table td {
          padding: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .sales-order-variant-total {
          font-weight: 600;
          color: #2563eb;
        }
        /* [2025-01-28 21:30:00] 印刷位置样式 */
        .sales-order-print-positions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .sales-order-print-group {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1rem;
          background: #ffffff;
        }
        .sales-order-print-group-title {
          margin: 0 0 0.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
        }
        .sales-order-print-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .sales-order-print-item {
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        .sales-order-print-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .sales-order-print-header strong {
          font-size: 0.875rem;
          color: #111827;
        }
        .sales-order-print-size {
          font-size: 0.8rem;
          color: #6b7280;
          background: #e5e7eb;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }
        .sales-order-print-notes {
          margin: 0.5rem 0 0;
          font-size: 0.8rem;
          color: #6b7280;
          font-style: italic;
        }
        /* [2025-01-28 21:30:00] 价格信息样式 */
        .sales-order-discount {
          color: #dc2626;
        }
        .sales-order-total-row {
          border-top: 2px solid #e5e7eb;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }
        .sales-order-total {
          font-size: 1.1rem;
          font-weight: 700;
          color: #2563eb;
        }
        /* [2025-01-28 21:30:00] 设计说明样式 */
        .sales-order-notes-row {
          flex-direction: column;
          align-items: flex-start;
        }
        .sales-order-notes {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          white-space: pre-wrap;
          text-align: left;
          width: 100%;
        }
        /* [2025-01-28 21:30:00] 附件列表样式 */
        .sales-order-assets {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sales-order-asset-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
        .sales-order-asset-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.875rem;
        }
        .sales-order-asset-link:hover {
          text-decoration: underline;
        }
        .sales-order-asset-size {
          font-size: 0.8rem;
          color: #6b7280;
        }
        @media (max-width: 768px) {
          .sales-order-card {
            padding: 1.5rem 1rem;
          }
          .sales-order-grid {
            grid-template-columns: 1fr;
          }
          .sales-order-variants-table {
            font-size: 0.75rem;
          }
          .sales-order-variants-table th,
          .sales-order-variants-table td {
            padding: 0.4rem 0.3rem;
          }
        }
      `}</style>
    </div>
  );
}


