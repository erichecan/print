/**
 * Sales Offline Order Detail Page
* 重新设计订单详情页面，展示所有创建订单时的字段，采用 refined minimalism 风格
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderDetail, OfflineOrderConfiguration, authenticatedFetch } from '@/lib/api';
import { BillingDetails } from '@/app/offline-orders/components/BillingDetails';
import { OrderItemColorGroup } from '@/types/order';
import { OFFLINE_ORDERS_TRANSLATIONS, OfflineOrdersLocale } from '@/translations/offlineOrders';
import { useCallback } from 'react';

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.id as string | undefined;

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOfflineOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [stages, setStages] = useState<Array<{ key: string; label: string; position: number }>>([]);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stageNote, setStageNote] = useState('');

  // Print Settings State
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [visibleSections, setVisibleSections] = useState({
    projectInfo: true,
    productList: true,
    printPositions: true,
    pricing: true,
    billing: true,
    history: false, // Default hidden for print
    attachments: true
  });

  // 语言环境状态
  const [locale, setLocale] = useState<OfflineOrdersLocale>('en');

  // 翻译函数
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const translations = OFFLINE_ORDERS_TRANSLATIONS[locale] || OFFLINE_ORDERS_TRANSLATIONS.en;
    const fallback = OFFLINE_ORDERS_TRANSLATIONS.en;
    let text = translations[key] || fallback[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    return text;
  }, [locale]);

  // 切换语言
  const handleLocaleChange = (newLocale: OfflineOrdersLocale) => {
    setLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('offline-orders-locale', newLocale);
    }
  };

  // 初始化语言
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offline-orders-locale') as OfflineOrdersLocale;
      if (stored === 'en' || stored === 'zh') {
        setLocale(stored);
      }
    }
  }, []);

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
        // 获取订单详情和阶段配置
        // 修复：使用 adminOfflineOrdersApi 直接调用，而不是通过 proxy
        const detail = await salesOrdersApi.get(orderId);

        // 尝试获取阶段配置，如果失败则从订单数据中推断阶段信息
        let stagesList: Array<{ key: string; label: string; position: number }> = [];
        try {
          const { adminOfflineOrdersApi } = await import('@/lib/api');
          const stagesRes = await adminOfflineOrdersApi.getWorkflowStages();
          // 转换类型以匹配组件期望的格式
          stagesList = (stagesRes.stages || []).map(stage => ({
            key: stage.key,
            label: stage.label || stage.labelEn || stage.labelZh || '',
            position: stage.position ?? 0
          }));
        } catch (err) {
          console.warn('[Order Detail] Failed to fetch stages config, will try to infer from order data:', err);
          // 如果API失败，尝试从订单数据中获取当前阶段信息
          // 至少显示当前订单的阶段，让用户能看到阶段信息
          if (detail?.stage?.key && detail?.stage?.label) {
            stagesList = [{
              key: detail.stage.key,
              label: detail.stage.label,
              position: detail.stage.position || 0
            }];
          }
        }

        if (!cancelled) {
          // 添加详细的数据结构日志以诊断产品信息问题
          console.log('[Order Detail] Full order data:', {
            hasDetails: !!detail,
            hasConfiguration: !!detail?.configuration,
            hasProductItems: !!detail?.configuration?.productItems,
            productItemsCount: detail?.configuration?.productItems?.length || 0,
            productItemsSample: detail?.configuration?.productItems?.[0],
            hasVariants: detail?.configuration?.productItems?.some(item => item.variants?.length > 0),
            variantsCount: detail?.configuration?.productItems?.reduce((sum, item) => sum + (item.variants?.length || 0), 0) || 0,
            stagesCount: stagesList.length,
            stagesSample: stagesList[0]
          });
          setOrder(detail);
          setStages(stagesList);
        }
      } catch (err: any) {
        if (!cancelled) {
          // 友好的错误提示
          if (err.message?.includes('404') || err.message?.includes('不存在') || err.message?.includes('Not Found')) {
            setError(t('errorOrderNotFound'));
          } else {
            setError(err.message || t('errorLoadOrderDetail'));
          }
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

  // Handle Print Mode
  useEffect(() => {
    const isPrintMode = searchParams?.get('print') === 'true';
    if (isPrintMode && !loading && order && !error) {
      setShowPrintSettings(true);
      // Auto-print is now optional, user triggers it from settings
    }
  }, [searchParams, loading, order, error]);

  const handlePrint = () => {
    window.print();
  };

  const meta = order;

  // 解析配置信息
  const config: OfflineOrderConfiguration | null = meta?.configuration || null;

  // 按产品分组印刷位置
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
  }, [config]);

  const productTotals = useMemo(() => {
    if (!config?.productItems) return {};
    const totals: Record<string, { quantity: number; total: number }> = {};

    // PRD v2.0: 优先使用 colorGroupsByProduct
    if (config.colorGroupsByProduct) {
      Object.entries(config.colorGroupsByProduct).forEach(([productId, groups]) => {
        let totalQty = 0;
        let totalAmount = 0;
        groups.forEach((group: any) => {
          const qty = Object.values(group.quantities || {}).reduce((sum: number, q: any) => sum + (Number(q) || 0), 0);
          totalQty += qty;
          totalAmount += qty * (group.unitPrice || 0);
        });
        totals[productId] = { quantity: totalQty, total: totalAmount };
      });
      return totals;
    }

    config.productItems.forEach((item) => {
      const variants = item.variants || [];
      const quantity = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
      const total = variants.reduce((sum, v) => sum + ((v.quantity || 0) * (v.unitPrice || 0)), 0);
      totals[item.id] = { quantity, total };
    });
    return totals;
  }, [config?.productItems, config?.colorGroupsByProduct]);

  // Transform data for BillingDetails component
  const billingData = useMemo(() => {
    if (!config?.productItems) return null;

    const transformedItems = config.productItems.map(item => {
      const colorsMap: Record<string, any> = {};

      if (config.colorGroupsByProduct && config.colorGroupsByProduct[item.id]) {
        config.colorGroupsByProduct[item.id].forEach((group, idx) => {
          const sizes = Object.entries(group.quantities || {}).map(([size, quantity]) => ({
            size,
            quantity: Number(quantity),
            unitPrice: group.unitPrice || 0,
            additionalFee: 0, // In this structure, unitPrice is often inclusive
            subtotal: Number(quantity) * (group.unitPrice || 0)
          })).filter(s => s.quantity > 0);

          if (sizes.length > 0) {
            // Use unique key (group.id or index) to prevent overwriting same-color groups
            const key = group.id || `${group.colorCode}-${idx}`;
            colorsMap[key] = {
              colorId: group.colorCode,
              colorName: group.colorName,
              sizes
            };
          }
        });
      } else {
        // Fallback for legacy variants
        (item.variants || []).forEach(v => {
          const key = v.color; // Legacy behavior implies unique colors per item
          if (!colorsMap[key]) {
            colorsMap[key] = {
              colorId: v.color,
              colorName: v.color,
              sizes: []
            };
          }
          colorsMap[key].sizes.push({
            size: v.size,
            quantity: v.quantity,
            unitPrice: v.unitPrice,
            additionalFee: 0,
            subtotal: v.quantity * v.unitPrice
          });
        });
      }

      return {
        id: item.id,
        productName: item.productName || item.categoryName || meta?.primaryProduct || t('unknownProduct'),
        colors: Object.values(colorsMap)
      };
    }).filter(item => item.colors.length > 0);

    return {
      productItems: transformedItems,
      colorGroupsByProduct: (config.colorGroupsByProduct as Record<string, OrderItemColorGroup[]>) || {},
      dstFileFee: Number(config.pricing?.dstFileFee || meta?.dst_file_fee || 0),
      rushFee: Number(config.pricing?.rushFee || meta?.rushFee || 0)
    };
  }, [config, meta?.dst_file_fee, meta?.rushFee]);

  if (authChecking) {
    return (
      <div className="order-detail-shell">
        <div className="order-detail-card">
          <p>{t('checkLoginStatus')}</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/offline-orders/sales/orders');
  };

  // Update order stage
  const handleUpdateStage = async (newStageKey: string) => {
    if (!order || updatingStage) return;

    setUpdatingStage(true);
    try {
      const updated = await salesOrdersApi.updateStage(order.id, {
        stageKey: newStageKey,
        note: stageNote || undefined,
      });
      setOrder(updated.order);
      setStageNote('');
      setError('');
    } catch (err: any) {
      setError(err.message || t('errorUpdateStage'));
    } finally {
      setUpdatingStage(false);
    }
  };

  return (
    <div className={`order-detail-shell ${compactMode && showPrintSettings ? 'print-compact-mode' : ''}`}>
      {/* Print Settings Panel */}
      {showPrintSettings && (
        <div className="print:hidden bg-blue-50 border-b border-blue-200 p-4 sticky top-0 z-50 shadow-md mb-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-blue-900">Print Options</h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Compact Layout (Save Paper)</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700">
              {Object.entries({
                projectInfo: 'Project Info',
                productList: 'Products',
                printPositions: 'Positions',
                pricing: 'Pricing',
                billing: 'Billing',
                history: 'History'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleSections[key as keyof typeof visibleSections]}
                    onChange={(e) => setVisibleSections({ ...visibleSections, [key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2"
              >
                <span>🖨️ Print Now</span>
              </button>
              <button
                onClick={() => setShowPrintSettings(false)}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 underline text-sm"
              >
                Close Settings
              </button>
            </div>
          </div>
          {/* Print styles moved to globals.css */}
        </div>
      )}

      <div className="order-detail-card">
        <header className="order-detail-header print:hidden">
          <button type="button" className="order-detail-back" onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t('btnBack')}</span>
          </button>
          <div className="order-detail-header-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* 语言切换按钮 */}
                <div className="print:hidden" style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: locale === 'en' ? '#3b82f6' : 'transparent',
                      color: locale === 'en' ? 'white' : '#475569',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleLocaleChange('en')}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: locale === 'zh' ? '#3b82f6' : 'transparent',
                      color: locale === 'zh' ? 'white' : '#475569',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleLocaleChange('zh')}
                  >
                    中文
                  </button>
                </div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{t('orderDetail')}</h1>
              </div>
              {/* 编辑按钮 */}
              {meta && (
                <button
                  type="button"
                  onClick={() => router.push(`/offline-orders?editId=${meta.id}`)}
                  className="order-detail-edit-btn print:hidden"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.05 3.00002L4.20831 10.2417C3.94998 10.5167 3.69998 11.0584 3.64998 11.4334L3.34165 14.1334C3.23331 15.1084 3.93331 15.775 4.89998 15.6084L7.58331 15.15C7.95831 15.0834 8.48331 14.8084 8.74165 14.525L15.5833 7.28335C16.7666 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2333 1.75002 11.05 3.00002Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 18.3334H17.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t('btnEditOrder')}
                </button>
              )}
            </div>
            {meta && (
              <div className="order-detail-header-meta">
                <span className="order-code">{meta.orderCode}</span>
                <div className="order-status-badges">
                  <span className={`status-badge status-${meta.status.toLowerCase()}`}>
                    {meta.status}
                  </span>
                  {meta.rushOrder && <span className="status-badge status-rush">{t('tagRush')}</span>}
                  {meta.stage?.label && <span className="status-badge status-stage">{meta.stage.label}</span>}
                </div>
                {/* 修改阶段 */}
                {stages.length > 0 && (
                  <div className="order-stage-update print:hidden">
                    <label className="stage-update-label">
                      <span>{t('updateStage')}:</span>
                      <select
                        value={meta.stage?.key || ''}
                        onChange={(e) => handleUpdateStage(e.target.value)}
                        disabled={updatingStage}
                        className="stage-update-select"
                      >
                        {stages.map((stage) => (
                          <option key={stage.key} value={stage.key}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      value={stageNote}
                      onChange={(e) => setStageNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      className="stage-update-note"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {
          error && (
            <div className="order-detail-error">
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>{t('errorCantLoadOrder')}</div>
              <div>{error}</div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setLoading(true);
                  // 重新加载
                  const reloadOrder = async () => {
                    try {
                      const detail = await salesOrdersApi.get(orderId!);
                      setOrder(detail);
                      setError('');
                    } catch (err: any) {
                      if (err.message?.includes('404') || err.message?.includes('不存在') || err.message?.includes('Not Found')) {
                        setError(t('errorOrderNotFound'));
                      } else {
                        setError(err.message || t('errorLoadOrderDetail'));
                      }
                    } finally {
                      setLoading(false);
                    }
                  };
                  reloadOrder();
                }}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t('btnRetry')}
              </button>
            </div>
          )
        }

        {
          loading || !meta ? (
            <div className="order-detail-loading">
              <p>{t('loadingOrderDetail')}</p>
            </div>
          ) : (
            <div className="order-detail-content">
              {/* 项目信息 */}
              {(!showPrintSettings || visibleSections.projectInfo) && (
                <section className={`order-section ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('projectInfo')}</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">{t('projectName')}</span>
                      <span className="info-value">{meta.projectName}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('primaryProduct')}</span>
                      <span className="info-value">{meta.primaryProduct || '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('quantity')}</span>
                      <span className="info-value">{meta.quantity ?? '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('deliveryDate')}</span>
                      <span className="info-value">
                        {meta.deliveryDate ? new Date(meta.deliveryDate).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : '—'}
                      </span>
                    </div>
                    {meta!.dst_file_fee && Number(meta!.dst_file_fee) > 0 && (
                      <div className="info-item">
                        <span className="info-label">DST File Fee</span>
                        <span className="info-value">${Number(meta!.dst_file_fee).toFixed(2)} CAD</span>
                      </div>
                    )}
                    {(meta.requiresMockups || meta.requiresProof || meta.rushOrder) && (
                      <div className="info-item info-item-full">
                        <span className="info-label">{t('specialRequirements')}</span>
                        <div className="info-tags">
                          {meta.requiresMockups && <span className="info-tag tag-mockups">{t('requiresMockups')}</span>}
                          {meta.requiresProof && <span className="info-tag tag-proof">{t('requiresProof')}</span>}
                          {meta.rushOrder && <span className="info-tag tag-rush">{t('rushOrder')}</span>}
                        </div>
                      </div>
                    )}
                    {(config?.artworkNotes || meta.description) && (
                      <div className="info-item info-item-full">
                        <span className="info-label">{t('designNotes')}</span>
                        <div className="info-text">
                          {config?.artworkNotes || meta.description || '—'}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 客户信息 */}
              {(!showPrintSettings || visibleSections.projectInfo) && (
                <section className={`order-section ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('customerInfo')}</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">{t('contactName')}</span>
                      <span className="info-value">{meta.contact.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('company')}</span>
                      <span className="info-value">{meta.contact.company || '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('email')}</span>
                      <a href={`mailto:${meta.contact.email}`} className="info-value info-link">
                        {meta.contact.email}
                      </a>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('phone')}</span>
                      <a href={`tel:${meta.contact.phone}`} className="info-value info-link">
                        {meta.contact.phone || '—'}
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* Product List Section */}
              {(!showPrintSettings || visibleSections.productList) && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('productList')}</h2>
                  {config?.productItems && config.productItems.length > 0 ? (
                    <div className="products-list">
                      {config.productItems.map((item) => {
                        const totals = productTotals[item.id] || { quantity: 0, total: 0 };
                        // PRD v2.0: 获取该产品的颜色组
                        const colorGroups = config.colorGroupsByProduct?.[item.id] || [];

                        // [2026-01-29] User Request: Truncate product name to 100 chars
                        const displayName = item.productName || item.categoryName || meta?.primaryProduct || t('unknownProduct');
                        const truncatedName = displayName.length > 100 ? `${displayName.substring(0, 100)}...` : displayName;

                        // [2026-01-29] User Request: Production-Centric View - Get Positions
                        const positions = printPositionsByProduct[item.id] || [];

                        return (
                          <div key={item.id} className="product-card">
                            <div className="product-header">
                              <h3 className="product-name" title={displayName} style={{ cursor: displayName.length > 100 ? 'help' : 'default' }}>
                                {truncatedName}
                              </h3>
                              <div className="product-summary">
                                <span>{totals.quantity} {t('items')}</span>
                                <span className="product-total">${totals.total.toFixed(2)} CAD</span>
                              </div>
                            </div>

                            {/* [2026-01-29] Production-Centric View: Embed Print Positions here */}
                            {positions.length > 0 && (
                              <div className="product-print-specs" style={{
                                marginTop: '1rem',
                                marginBottom: '1rem',
                                padding: '1rem',
                                backgroundColor: '#fefce8',
                                border: '1px solid #fde047',
                                borderRadius: '8px'
                              }}>
                                <h4 style={{
                                  margin: '0 0 0.5rem 0',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#854d0e',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <span>🛠️ {t('printPositions') || 'Print Specs'}</span>
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                  {positions.map((pos, idx) => (
                                    <div key={idx} style={{
                                      backgroundColor: '#fff',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '6px',
                                      border: '1px solid #fef08a',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                      fontSize: '0.875rem',
                                      flex: '1 1 auto',
                                      minWidth: '200px'
                                    }}>
                                      <div style={{ fontWeight: 600, color: '#422006', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{pos.position}</span>
                                        {pos.dstFileFee !== undefined && Number(pos.dstFileFee) > 0 && (
                                          <span style={{ fontSize: '0.7rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 4px', borderRadius: '4px' }}>DST Fee</span>
                                        )}
                                      </div>
                                      <div style={{ color: '#713f12', fontSize: '0.8rem', marginTop: '4px', lineHeight: 1.4 }}>
                                        <div style={{ fontWeight: 500 }}>{pos.method || (pos as any).printingStyle}</div>
                                        {/* Display Dimensions: Prefer mm if available (as requested), otherwise inch */}
                                        {(() => {
                                          // Prioritize mm if available
                                          if (pos.widthMm || pos.heightMm) {
                                            const parts = [];
                                            if (pos.widthMm) parts.push(`W: ${pos.widthMm}mm`);
                                            if (pos.heightMm) parts.push(`H: ${pos.heightMm}mm`);
                                            return <div>{parts.join(' x ')}</div>;
                                          }

                                          // Fallback to inch string
                                          let w = pos.width;
                                          let h = pos.height;

                                          // If converted values were calculated above (which we removed), we'd use them.
                                          // But now we check mm first. So here we handle string fallback.

                                          // Display logic: show whatever is available
                                          if (w && h && w !== '0' && h !== '0') {
                                            return <div>{w} inch x {h} inch</div>;
                                          } else if (w && w !== '0') {
                                            return <div>Width: {w} inch</div>;
                                          } else if (h && h !== '0') {
                                            return <div>Height: {h} inch</div>;
                                          }
                                          return null;
                                        })()}
                                        {pos.notes && (
                                          <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#a16207' }}>"{pos.notes}"</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {colorGroups.length > 0 ? (
                              <div className="color-groups">
                                {colorGroups.map((group: any, gIdx: number) => (
                                  <div key={gIdx} className="color-group-box" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #f0f0f0', borderRadius: '12px' }}>
                                    <div style={{ marginBottom: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: group.colorHex || '#eee', border: '1px solid #ddd' }} />
                                      <span>{group.colorName}</span>
                                      <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.875rem' }}>{t('unitPrice')}: ${group.unitPrice?.toFixed(2)}</span>
                                    </div>
                                    <table className="variants-table">
                                      <thead>
                                        <tr>
                                          <th>{t('size')}</th>
                                          <th>{t('quantity')}</th>
                                          <th>{t('unitPrice')}</th>
                                          <th>{t('subtotal')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(group.quantities || {}).map(([size, qty], idx) => {
                                          const q = Number(qty) || 0;
                                          if (q === 0) return null;
                                          const subtotal = q * (group.unitPrice || 0);
                                          return (
                                            <tr key={idx}>
                                              <td>{size}</td>
                                              <td>{q}</td>
                                              <td>${(group.unitPrice || 0).toFixed(2)}</td>
                                              <td className="variant-total">${subtotal.toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <table className="variants-table">
                                <thead>
                                  <tr>
                                    <th>{t('size')}</th>
                                    <th>{t('color')}</th>
                                    <th>{t('quantity')}</th>
                                    <th>{t('unitPrice')}</th>
                                    <th>{t('subtotal')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.variants || []).map((variant, idx) => {
                                    const variantTotal = (variant.quantity || 0) * (variant.unitPrice || 0);
                                    return (
                                      <tr key={idx}>
                                        <td>{variant.size || '—'}</td>
                                        <td>{variant.color || '—'}</td>
                                        <td>{variant.quantity || 0}</td>
                                        <td>${(variant.unitPrice || 0).toFixed(2)}</td>
                                        <td className="variant-total">${variantTotal.toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="info-text" style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 500, color: '#374151' }}>{t('noProductInfo')}</p>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('noProductInfoDesc')}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Pricing Section */}
              {config?.pricing && (!showPrintSettings || visibleSections.pricing) && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '0.75rem',
                    marginBottom: '2rem'
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem 0' }}>
                      {t('pricingDetail')}{Number(config.pricing.taxAmount || 0) > 0 ? ` ${t('includingTax')}` : ''}
                    </h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>{t('subtotalCAD')}:</span>
                        <span>${Number(config.pricing.subtotal || 0).toFixed(2)} CAD</span>
                      </div>
                      {Number(config.pricing.discountAmount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#dc2626' }}>
                          <span>{t('discount')} ({config.pricing.discount}%):</span>
                          <span>-${Number(config.pricing.discountAmount).toFixed(2)} CAD</span>
                        </div>
                      )}
                      {Number(config.pricing.dstFileFee || meta?.dst_file_fee || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>{t('dstFileFee')}:</span>
                          <span>${Number(config.pricing.dstFileFee || meta?.dst_file_fee).toFixed(2)} CAD</span>
                        </div>
                      )}
                      {Number(config.pricing.rushFee || meta?.rushFee || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#b45309' }}>
                          <span>{t('rushFee') || 'Rush Fee'}:</span>
                          <span>${Number(config.pricing.rushFee || meta?.rushFee).toFixed(2)} CAD</span>
                        </div>
                      )}
                      {Number(config.pricing.taxAmount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '1px dashed #bfdbfe' }}>
                          <span>{t('totalExcludingTax')}:</span>
                          <span>${(Number(config.pricing.subtotal || 0) - Number(config.pricing.discountAmount || 0) + Number(config.pricing.dstFileFee || meta?.dst_file_fee || 0) + Number(config.pricing.rushFee || meta?.rushFee || 0)).toFixed(2)} CAD</span>
                        </div>
                      )}
                      {(Number(config.pricing.taxAmount || 0) > 0) ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>{t('tax')} ({((Number(config.pricing.taxRate || 0.13)) * 100).toFixed(0)}% HST):</span>
                          <span>${Number(config.pricing.taxAmount).toFixed(2)} CAD</span>
                        </div>
                      ) : (
                        (() => {
                          const base = Number(config.pricing.subtotal || 0) - (Number(config.pricing.discountAmount || 0)) + (Number(config.pricing.dstFileFee ?? meta?.dst_file_fee ?? 0)) + (Number(config.pricing.rushFee ?? meta?.rushFee ?? 0));
                          const total = Number(config.pricing.total || 0);
                          const calculatedTax = total - base;
                          if (calculatedTax > 0.01) {
                            return (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span>{t('taxEstimate')}:</span>
                                <span>${calculatedTax.toFixed(2)} CAD</span>
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '1.25rem',
                        paddingTop: '0.75rem',
                        marginTop: '0.5rem',
                        borderTop: '1px solid #bfdbfe',
                        color: '#1d4ed8'
                      }}>
                        <span style={{ fontWeight: 600 }}>{t('total')}{Number(config.pricing.taxAmount || 0) > 0 ? ` ${t('includingTax')}` : ''}:</span>
                        <strong style={{ fontSize: '1.5rem' }}>${Number(config.pricing.total || 0).toFixed(2)} CAD</strong>
                      </div>
                    </div>
                  </div>

                  {/* 计费明细 Table */}
                  {billingData && (!showPrintSettings || visibleSections.billing) && (
                    <div style={{ marginBottom: '2rem' }} className={compactMode && showPrintSettings ? 'mt-2' : ''}>
                      <BillingDetails
                        productItems={billingData.productItems}
                        colorGroupsByProduct={billingData.colorGroupsByProduct}
                        dstFileFee={billingData.dstFileFee}
                        rushFee={billingData.rushFee}
                        locale={locale}
                      />
                    </div>
                  )}

                  {/* 支付信息 - 如果已支付定金 */}
                  {Number(order?.payment?.depositAmount || 0) > 0 && (
                    <div style={{
                      padding: '1.5rem',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '0.75rem',
                      marginBottom: '0'
                    }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem 0' }}>
                        {t('paymentInfo')}
                      </h4>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span style={{ color: '#4b5563' }}>{t('totalAmount')}:</span>
                          <span style={{ fontWeight: 500, color: '#059669' }}>
                            ${Number(config.pricing?.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span style={{ color: '#4b5563' }}>{t('deposit')}:</span>
                          <span style={{ fontWeight: 500, color: '#059669' }}>
                            -${Number(order?.payment?.depositAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '1rem',
                          paddingTop: '0.5rem',
                          marginTop: '0.5rem',
                          borderTop: '1px solid #a7f3d0'
                        }}>
                          <span style={{ fontWeight: 600, color: '#111827' }}>{t('remainingBalance')}:</span>
                          <strong style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>
                            ${Math.max(0, Number(config.pricing?.total || 0) - Number(order?.payment?.depositAmount || 0)).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Order History */}
              {meta.histories && meta.histories.length > 0 && (!showPrintSettings || visibleSections.history) && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('orderHistory')}</h2>
                  <div className="histories-list">
                    {meta.histories.map((log: any, idx: number) => (
                      <div key={log.id || idx} className="history-item" style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem 0',
                        borderBottom: idx < meta.histories.length - 1 ? '1px solid #f0f2f5' : 'none'
                      }}>
                        <div className="history-time" style={{ color: '#718096', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '150px' }}>
                          {new Date(log.timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                        </div>
                        <div className="history-info">
                          <div className="history-action" style={{ fontWeight: 600, color: '#2d3748', fontSize: '0.875rem' }}>{log.action}</div>
                          {log.note && <div className="history-note" style={{ color: '#718096', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{log.note}</div>}
                          {log.operator && <div className="history-operator" style={{ color: '#2563eb', fontSize: '0.75rem', marginTop: '0.25rem' }}>{t('operator')}: {log.operator}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 支付信息 - 新增 */}
              <section className="order-section">
                <h2 className="section-title">{t('paymentInfo')}</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">{t('paymentMethod')}</span>
                    <span className="info-value">
                      {config?.invoiceInfo?.paymentMethod
                        ? (config.invoiceInfo.paymentMethod === 'card' ? t('paymentMethodCard') :
                          config.invoiceInfo.paymentMethod === 'etrans' ? t('paymentMethodEtrans') :
                            config.invoiceInfo.paymentMethod)
                        : (config?.paymentMethod || '—')}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('referenceNumber')}</span>
                    <span className="info-value">
                      {config?.invoiceInfo?.referenceNumber || config?.referenceNumber || '—'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('depositAmount')}</span>
                    <span className="info-value text-green-600">
                      ${Number(order?.payment?.depositAmount || 0).toFixed(2)} CAD
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('remainingAmount')}</span>
                    <span className="info-value text-blue-600 font-bold">
                      ${Math.max(0, Number(config?.pricing?.total || 0) - Number(order?.payment?.depositAmount || 0)).toFixed(2)} CAD
                    </span>
                  </div>
                </div>
              </section>

              {/* 发票信息 */}
              {config?.requiresInvoice && config.invoiceInfo && (
                <section className="order-section">
                  <h2 className="section-title">{t('invoiceInfo')}</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">{t('companyName')}</span>
                      <span className="info-value">{config.invoiceInfo.companyName}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('companyEmail')}</span>
                      <a href={`mailto:${config.invoiceInfo.companyEmail}`} className="info-value info-link">
                        {config.invoiceInfo.companyEmail}
                      </a>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('taxNumber')}</span>
                      <span className="info-value">{config.invoiceInfo.taxNumber || '—'}</span>
                    </div>
                    <div className="info-item info-item-full">
                      <span className="info-label">{t('address')}</span>
                      <span className="info-value">{config.invoiceInfo.address}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('city')}</span>
                      <span className="info-value">{config.invoiceInfo.city}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('province')}</span>
                      <span className="info-value">{config.invoiceInfo.province}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('postalCode')}</span>
                      <span className="info-value">{config.invoiceInfo.postalCode}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('country')}</span>
                      <span className="info-value">{config.invoiceInfo.country || 'Canada'}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* 附件 */}
              {meta.assets && meta.assets.length > 0 && (!showPrintSettings || visibleSections.attachments) && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('attachmentsCount', { count: meta.assets.length })}</h2>
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
                          <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12.5 2.5H17.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8.33333 11.6667L17.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="asset-name">{asset.fileName}</span>
                        <span className="asset-size">{(asset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* 生产信息 */}
              {meta.productionWorkOrder && (!showPrintSettings || visibleSections.history) && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">{t('productionInfo')}</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">{t('workOrderNumber')}</span>
                      <span className="info-value">{meta.productionWorkOrder.workOrderCode}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('productionStatus')}</span>
                      <span className="info-value">{meta.productionWorkOrder.status}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('assignee')}</span>
                      <span className="info-value">{meta.productionWorkOrder.assignee?.name || '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('plannedStart')}</span>
                      <span className="info-value">
                        {meta.productionWorkOrder.startDate
                          ? new Date(meta.productionWorkOrder.startDate).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                          : '—'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">{t('plannedEnd')}</span>
                      <span className="info-value">
                        {meta.productionWorkOrder.dueDate
                          ? new Date(meta.productionWorkOrder.dueDate).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
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
          )
        }
      </div>

      <style jsx>{`
/* Refined Minimalism 设计风格 - 优雅、精致、简洁 */
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
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          letter-spacing: -0.02em;
        }

        .order-detail-edit-btn:hover {
          background-color: #1d4ed8 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
        }

        .order-detail-edit-btn:active {
          transform: translateY(0);
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

        .order-stage-update {
          margin-top: 1rem;
          padding: 1rem;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .stage-update-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
        }

        .stage-update-select {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 0.875rem;
          background: #ffffff;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .stage-update-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .stage-update-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .stage-update-note {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          min-height: 60px;
        }

        .stage-update-note:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
