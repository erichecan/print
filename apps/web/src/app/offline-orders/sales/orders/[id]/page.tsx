/**
 * Sales Offline Order Detail Page
* 重新设计订单详情页面，展示所有创建订单时的字段，采用 refined minimalism 风格
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { authApi, salesOrdersApi, SalesOfflineOrderDetail, OfflineOrderConfiguration, authenticatedFetch, offlineOrderProductApi, OfflineOrderConfig } from '@/lib/api';
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

  // PRD v2.1: Fetch global configuration for fallback (Legacy orders mostly)
  const { data: globalConfigData } = useSWR(
    'offline-order-config',
    () => offlineOrderProductApi.getOrderConfig(),
    {
      revalidateOnFocus: false,
    }
  );
  const globalConfig: OfflineOrderConfig | undefined = globalConfigData?.data;

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
  const isPrintMode = searchParams?.get('print') === 'true';

  useEffect(() => {
    if (isPrintMode && !loading && order && !error) {
      // 直接使用紧凑布局，不显示设置面板
      setShowPrintSettings(false);
      // 自动触发浏览器打印对话框（仅在 print=true 时）
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }, 300);
    }
  }, [isPrintMode, loading, order, error]);

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
          Object.entries(group.quantities || {}).forEach(([size, qtyStr]) => {
            const qty = Number(qtyStr) || 0;
            if (qty > 0) {
              totalQty += qty;
              // Calculate price with size fee (Case-insensitive) - Fallback to global config
              const sizeFees = config.sizeFees || globalConfig?.sizeFees;
              const sizeFee = sizeFees?.find((sf: any) => sf.size?.toLowerCase() === size?.toLowerCase())?.additionalFee || 0;
              totalAmount += qty * ((group.unitPrice || 0) + Number(sizeFee));
            }
          });
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

  // [2026-03-12 03:40:00] 生成紧凑版对账/报价单用的产品行数据
  const compactBillingLines = useMemo(() => {
    if (!config?.productItems) return [];
    const lines: Array<{
      productName: string;
      colorName: string;
      size: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    if (config.colorGroupsByProduct) {
      Object.entries(config.colorGroupsByProduct).forEach(([productId, groups]) => {
        const product = config.productItems.find((p) => p.id === productId);
        const productName = product?.productName || product?.productId || 'Product';

        (groups as any[]).forEach((group) => {
          const colorName = group.colorName || group.colorCode || 'Color';
          const unitPrice = Number(group.unitPrice || 0);
          Object.entries(group.quantities || {}).forEach(([size, qtyStr]) => {
            const quantity = Number(qtyStr) || 0;
            if (!quantity) return;
            const sizeFees = config.sizeFees || globalConfig?.sizeFees;
            const sizeFee =
              sizeFees?.find(
                (sf: any) => sf.size?.toLowerCase() === (size as string).toLowerCase(),
              )?.additionalFee || 0;
            const pricePerUnit = unitPrice + Number(sizeFee || 0);
            lines.push({
              productName,
              colorName,
              size: size as string,
              quantity,
              unitPrice: pricePerUnit,
              subtotal: quantity * pricePerUnit,
            });
          });
        });
      });
      return lines;
    }

    // 旧数据结构回退：按 variants 生成
    config.productItems.forEach((item) => {
      (item.variants || []).forEach((variant: any) => {
        const quantity = Number(variant.quantity || 0);
        if (!quantity) return;
        const unitPrice = Number(variant.unitPrice || 0);
        lines.push({
          productName: item.productName || item.productId || 'Product',
          colorName: variant.color || 'Color',
          size: variant.size || 'Size',
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice,
        });
      });
    });
    return lines;
  }, [config, globalConfig]);

  // Transform data for BillingDetails component
  const billingData = useMemo(() => {
    if (!config?.productItems) return null;

    const transformedItems = config.productItems.map(item => {
      const colorsMap: Record<string, any> = {};

      if (config.colorGroupsByProduct && config.colorGroupsByProduct[item.id]) {
        config.colorGroupsByProduct[item.id].forEach((group, idx) => {
          const sizes = Object.entries(group.quantities || {}).map(([size, quantity]) => {
            // Fix: Case-insensitive size lookup - Fallback to global config
            const sizeFees = config.sizeFees || globalConfig?.sizeFees;
            const sizeFee = sizeFees?.find((sf: any) => sf.size?.toLowerCase() === size?.toLowerCase())?.additionalFee || 0;
            const unitPrice = group.unitPrice || 0;
            const finalPrice = unitPrice + Number(sizeFee);

            return {
              size,
              quantity: Number(quantity),
              unitPrice: unitPrice,
              additionalFee: Number(sizeFee),
              subtotal: Number(quantity) * finalPrice
            };
          }).filter(s => s.quantity > 0);

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

  // [2026-03-12 03:40:30] 紧凑版对账/报价单 UI（基于 docs/offline-order-print-compact-preview.html）
  const renderCompactInvoice = () => {
    if (!meta || !config) return null;
    const subtotal = Number(config.pricing?.subtotal || 0);
    const dstFee = Number(meta.dst_file_fee || 0);
    const rushFee = Number(config.pricing?.rushFee || 0);
    const taxAmount = Number(config.pricing?.taxAmount || 0);
    const total = Number(config.pricing?.total || subtotal + dstFee + rushFee + taxAmount);

    return (
      <>
        <style
          // [2026-03-12 03:40:40] 紧凑版样式内联，后续可抽到全局
          dangerouslySetInnerHTML={{
            __html: `
        * { box-sizing: border-box; }
        body.print-offline-invoice-mode {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          font-size: 9pt;
          line-height: 1.25;
          color: #1a1a1a;
          margin: 0;
          padding: 8px;
          background: #f5f5f5;
        }
        @media print {
          body.print-offline-invoice-mode { padding: 0; background: #fff; }
          .no-print { display: none !important; }
          .compact-page { padding: 5mm; max-width: none; }
          @page { margin: 6mm; size: A4; }
        }
        .compact-page {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          padding: 6mm;
          box-shadow: 0 1px 3px rgba(0,0,0,.08);
        }
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #333;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }
        .doc-title { font-size: 11pt; font-weight: 700; margin: 0; }
        .order-code { font-family: monospace; font-size: 9pt; font-weight: 600; }
        .badges { display: flex; gap: 4px; font-size: 7pt; }
        .badge { padding: 1px 4px; border-radius: 2px; border: 1px solid #e5e7eb; }
        .badge-active { background: #dcfce7; color: #166534; }
        .badge-rush { background: #fef3c7; color: #b45309; }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 6px;
        }
        .sec { margin-bottom: 4px; }
        .sec-title {
          font-size: 9pt;
          font-weight: 700;
          margin: 0 0 2px 0;
          padding-bottom: 1px;
          border-bottom: 1px solid #ccc;
        }
        .info-row { display: flex; gap: 6px; margin-bottom: 1px; }
        .info-label { min-width: 56px; color: #555; }
        .info-value { flex: 1; }
        .product-block {
          border: 1px solid #ddd;
          padding: 4px 6px;
          margin-bottom: 4px;
          break-inside: avoid;
        }
        .product-head {
          display: flex; justify-content: space-between; align-items: center;
          font-weight: 700; font-size: 9pt; margin-bottom: 2px;
        }
        .print-specs {
          font-size: 7pt; background: #fefce8; border: 1px solid #fde047;
          padding: 4px 6px; margin: 3px 0 4px 0; border-radius: 2px;
        }
        .print-specs-label {
          font-weight: 700; color: #854d0e; margin-bottom: 3px;
          display: flex; align-items: center; gap: 4px;
        }
        .pos-table { width: 100%; border-collapse: collapse; font-size: 7pt; }
        .pos-table th {
          text-align: left; color: #92400e; font-weight: 600;
          padding: 1px 5px 2px 0; border-bottom: 1px solid #fde68a; white-space: nowrap;
        }
        .pos-table td { padding: 1.5px 5px 1.5px 0; color: #713f12; vertical-align: top; }
        .pos-table tr:not(:last-child) td { border-bottom: 1px solid #fef9c3; }
        .logo-size-cell {
          font-family: monospace; color: #1d4ed8; background: #eff6ff;
          padding: 0 3px; border-radius: 2px; white-space: nowrap; font-size: 6.5pt;
        }
        .method-badge {
          display: inline-block; background: #fff; border: 1px solid #fde68a;
          border-radius: 2px; padding: 0 3px; font-size: 6pt; color: #92400e;
        }
        .color-block { margin-top: 2px; }
        .color-line {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 8pt;
          margin-bottom: 1px;
          justify-content: space-between;
        }
        .color-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #999; margin-right: 4px; }
        table.compact-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
        }
        .compact-table th,
        .compact-table td {
          padding: 1px 4px;
          border: 1px solid #e0e0e0;
          text-align: left;
        }
        .compact-table th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .compact-table td.num { text-align: right; }
        .pricing-box {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          padding: 4px 6px;
          margin-bottom: 4px;
          font-size: 8pt;
        }
        .pricing-box .row { display: flex; justify-content: space-between; margin-bottom: 1px; }
        .pricing-box .total { font-weight: 700; font-size: 10pt; margin-top: 2px; padding-top: 2px; border-top: 1px solid #93c5fd; }
        .billing-table { margin-top: 4px; }
        .billing-table .compact-table { font-size: 7pt; }
        .billing-table .compact-table th,
        .billing-table .compact-table td { padding: 0 3px; }
        .no-print-bar {
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #dbeafe;
          border-radius: 6px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .no-print-bar button {
          padding: 6px 14px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        .no-print-bar button:hover { background: #1d4ed8; }
      `,
          }}
        />
        <div className="no-print-bar no-print">
          <span>
            <strong>线下订单 - 紧凑型对账/报价单</strong>（留白少、省纸，可直接打印本页查看效果）
          </span>
          <button type="button" onClick={() => window.print()}>
            🖨️ 打印预览 / 打印
          </button>
        </div>
        <div className="compact-page">
          {/* 头部 */}
          <div className="doc-header">
            <div>
              <h1 className="doc-title">{t('orderDetail')}</h1>
              <span className="order-code">{meta.orderCode}</span>
            </div>
            <div className="badges">
              <span className="badge badge-active">{meta.status}</span>
              {meta.rushOrder && <span className="badge badge-rush">{t('tagRush')}</span>}
              {meta.stage?.label && <span className="badge">{meta.stage.label}</span>}
            </div>
          </div>

          {/* 项目信息 + 客户信息 两列 */}
          <div className="two-col">
            <div className="sec">
              <h2 className="sec-title">Project Info / 项目信息</h2>
              <div className="info-row">
                <span className="info-label">{t('projectName')}</span>
                <span className="info-value">{meta.projectName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('primaryProduct')}</span>
                <span className="info-value">{meta.primaryProduct || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('quantity')}</span>
                <span className="info-value">{meta.quantity ?? '—'} pcs</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('deliveryDate')}</span>
                <span className="info-value">
                  {meta.deliveryDate
                    ? new Date(meta.deliveryDate).toLocaleDateString(
                        locale === 'zh' ? 'zh-CN' : 'en-US',
                      )
                    : '—'}
                </span>
              </div>
              {(config?.artworkNotes || meta.description) && (
                <div className="info-row">
                  <span className="info-label">{t('designNotes')}</span>
                  <span className="info-value">{config?.artworkNotes || meta.description}</span>
                </div>
              )}
            </div>
            <div className="sec">
              <h2 className="sec-title">Customer / 客户信息</h2>
              <div className="info-row">
                <span className="info-label">{t('contactName')}</span>
                <span className="info-value">{meta.contact?.name || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('company')}</span>
                <span className="info-value">{meta.contact?.company || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('email')}</span>
                <span className="info-value">{meta.contact?.email || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('phone')}</span>
                <span className="info-value">{meta.contact?.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* 产品列表（基于 colorGroupsByProduct / variants） */}
          <div className="sec">
            <h2 className="sec-title">Product List / 产品明细</h2>
            {(!config.productItems || config.productItems.length === 0) && (
              <div className="product-block">
                <div className="product-head">
                  <span>{meta.primaryProduct || '—'}</span>
                  <span>{meta.quantity != null ? `${meta.quantity} pcs` : '—'}</span>
                </div>
                {config.printPositions && config.printPositions.length > 0 && (
                  <div className="print-specs">
                    <div className="print-specs-label">🛠️ {t('printPositions') || 'Print Positions'}:</div>
                    <table className="pos-table">
                      <thead>
                        <tr>
                          <th style={{ width: '18%' }}>Position</th>
                          <th style={{ width: '18%' }}>Method</th>
                          <th style={{ width: '28%' }}>Logo Size</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.printPositions.map((pos: any, idx: number) => {
                          const posName = pos.positionName || pos.position || pos.positionKey || '—';
                          const method = pos.method || pos.printingStyle || '—';
                          const logoSize = (() => {
                            if (pos.widthMm || pos.heightMm) {
                              const parts: string[] = [];
                              if (pos.widthMm) parts.push(`W: ${(pos.widthMm / 25.4).toFixed(2)}"`);
                              if (pos.heightMm) parts.push(`H: ${(pos.heightMm / 25.4).toFixed(2)}"`);
                              return parts.join(' × ');
                            }
                            const w = pos.width;
                            const h = pos.height;
                            if (w && h && w !== '0' && h !== '0') return `W: ${w}" × H: ${h}"`;
                            if (w && w !== '0') return `W: ${w}"`;
                            if (h && h !== '0') return `H: ${h}"`;
                            return null;
                          })();
                          return (
                            <tr key={idx}>
                              <td><strong>{posName}</strong></td>
                              <td>{method !== '—' ? <span className="method-badge">{method}</span> : '—'}</td>
                              <td>{logoSize ? <span className="logo-size-cell">{logoSize}</span> : '—'}</td>
                              <td>{pos.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {(config.artworkNotes || config.orderNotes) && (
                  <div style={{ fontSize: '8pt', color: '#555', marginTop: '4px' }}>
                    {config.artworkNotes && <div>Artwork Notes: {config.artworkNotes}</div>}
                    {config.orderNotes && <div>Order Notes: {config.orderNotes}</div>}
                  </div>
                )}
              </div>
            )}
            {config.productItems?.map((item) => {
              const productId = item.id;
              const totals = productTotals[productId] || { quantity: 0, total: 0 };
              const colorGroups = config.colorGroupsByProduct?.[productId] as any[] | undefined;

              return (
                <div key={productId} className="product-block">
                  <div className="product-head">
                    <span>{item.productName || item.productId || 'Product'}</span>
                    <span>
                      {totals.quantity} pcs · ${totals.total.toFixed(2)} CAD
                    </span>
                  </div>

                  {/* 印刷位置详情表格（含 Logo Size） */}
                  {printPositionsByProduct[productId] && printPositionsByProduct[productId].length > 0 && (
                    <div className="print-specs">
                      <div className="print-specs-label">🛠️ {t('printPositions') || 'Print Positions'}:</div>
                      <table className="pos-table">
                        <thead>
                          <tr>
                            <th style={{ width: '18%' }}>Position</th>
                            <th style={{ width: '18%' }}>Method</th>
                            <th style={{ width: '28%' }}>Logo Size</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printPositionsByProduct[productId].map((pos: any, idx: number) => {
                            const posName = pos.positionName || pos.position || pos.positionKey || '—';
                            const method = pos.method || pos.printingStyle || '—';
                            const logoSize = (() => {
                              if (pos.widthMm || pos.heightMm) {
                                const parts = [];
                                if (pos.widthMm) parts.push(`W: ${(pos.widthMm / 25.4).toFixed(2)}"`);
                                if (pos.heightMm) parts.push(`H: ${(pos.heightMm / 25.4).toFixed(2)}"`);
                                return parts.join(' × ');
                              }
                              const w = pos.width;
                              const h = pos.height;
                              if (w && h && w !== '0' && h !== '0') return `W: ${w}" × H: ${h}"`;
                              if (w && w !== '0') return `W: ${w}"`;
                              if (h && h !== '0') return `H: ${h}"`;
                              return null;
                            })();
                            return (
                              <tr key={idx}>
                                <td><strong>{posName}</strong></td>
                                <td>{method !== '—' ? <span className="method-badge">{method}</span> : '—'}</td>
                                <td>{logoSize ? <span className="logo-size-cell">{logoSize}</span> : '—'}</td>
                                <td>{pos.notes || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 颜色 + 尺码表 */}
                  {colorGroups && colorGroups.length > 0 ? (
                    colorGroups.map((group: any, idx: number) => {
                      const colorName = group.colorName || group.colorCode || `Color ${idx + 1}`;
                      const colorHex = group.colorHex || group.colorCodeHex;
                      return (
                        <div key={group.id || colorName || idx} className="color-block">
                          <div className="color-line">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              <span
                                className="color-dot"
                                style={{
                                  background: colorHex || '#ffffff',
                                  borderColor: '#999',
                                }}
                              />
                              <strong>{colorName}</strong>
                            </span>
                            {group.unitPrice && (
                              <span>Unit: ${Number(group.unitPrice).toFixed(2)}</span>
                            )}
                          </div>
                          <table className="compact-table">
                            <thead>
                              <tr>
                                <th>Size</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th className="num">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(group.quantities || {}).map(([size, qtyStr]) => {
                                const quantity = Number(qtyStr) || 0;
                                if (!quantity) return null;
                                const sizeFees = config.sizeFees || globalConfig?.sizeFees;
                                const sizeFee =
                                  sizeFees?.find(
                                    (sf: any) =>
                                      sf.size?.toLowerCase() ===
                                      (size as string).toLowerCase(),
                                  )?.additionalFee || 0;
                                const unitPrice = Number(group.unitPrice || 0) + Number(sizeFee || 0);
                                const subtotalRow = quantity * unitPrice;
                                return (
                                  <tr key={size}>
                                    <td>{size}</td>
                                    <td>{quantity}</td>
                                    <td>${unitPrice.toFixed(2)}</td>
                                    <td className="num">${subtotalRow.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })
                  ) : (
                    <div className="color-block">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Variant</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th className="num">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(item.variants || []).map((v: any, idx: number) => {
                            const quantity = Number(v.quantity || 0);
                            if (!quantity) return null;
                            const unitPrice = Number(v.unitPrice || 0);
                            const subtotalRow = quantity * unitPrice;
                            return (
                              <tr key={v.id || idx}>
                                <td>
                                  {v.size} {v.color && `· ${v.color}`}
                                </td>
                                <td>{quantity}</td>
                                <td>${unitPrice.toFixed(2)}</td>
                                <td className="num">${subtotalRow.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 价格汇总 */}
          <div className="sec">
            <h2 className="sec-title">Pricing / 价格</h2>
            <div className="pricing-box">
              <div className="row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)} CAD</span>
              </div>
              {dstFee > 0 && (
                <div className="row">
                  <span>DST File Fee:</span>
                  <span>${dstFee.toFixed(2)} CAD</span>
                </div>
              )}
              {rushFee > 0 && (
                <div className="row">
                  <span>Rush Fee:</span>
                  <span>${rushFee.toFixed(2)} CAD</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="row">
                  <span>Tax (HST):</span>
                  <span>${taxAmount.toFixed(2)} CAD</span>
                </div>
              )}
              <div className="row total">
                <span>Total (incl. tax):</span>
                <span>${total.toFixed(2)} CAD</span>
              </div>
            </div>
          </div>

          {/* 计费明细（按产品/颜色/尺码平铺的小票式明细） */}
          {compactBillingLines.length > 0 && (
            <div className="sec billing-table">
              <h2 className="sec-title">Billing Details / 计费明细</h2>
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th className="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {compactBillingLines.map((line, idx) => (
                    <tr key={idx}>
                      <td>{line.productName}</td>
                      <td>{line.colorName}</td>
                      <td>{line.size}</td>
                      <td>{line.quantity}</td>
                      <td>${line.unitPrice.toFixed(2)}</td>
                      <td className="num">${line.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  // [2026-03-12 03:45:00] 打印模式下，直接只渲染紧凑版对账单，避免页面上重复的 Project/Product 区块
  if (isPrintMode && compactMode && !loading && meta && !error) {
    return (
      <div className="order-detail-shell print-compact-mode">
        <div className="order-detail-card">
          {renderCompactInvoice()}
        </div>
      </div>
    );
  }

  return (
    <div className={`order-detail-shell ${isPrintMode || (compactMode && showPrintSettings) ? 'print-compact-mode' : ''}`}>
      {/* Print Settings Panel（仅非 print=true 时显示） */}
      {!isPrintMode && showPrintSettings && (
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
        {/* 紧凑打印：仅打印时显示的页眉（订单号+状态）2026-03-10 */}
        {meta && compactMode && showPrintSettings && (
          <div className="hidden print:flex order-detail-print-header" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '2px', marginBottom: '4px', padding: '0 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="order-detail-print-title" style={{ margin: 0, fontSize: '11pt', fontWeight: 700 }}>{t('orderDetail')}</h1>
              <span className="order-code">{meta.orderCode}</span>
            </div>
            <div className="order-status-badges">
              <span className={`status-badge status-${meta.status.toLowerCase()}`}>{meta.status}</span>
              {meta.rushOrder && <span className="status-badge status-rush">{t('tagRush')}</span>}
              {meta.stage?.label && <span className="status-badge status-stage">{meta.stage.label}</span>}
            </div>
          </div>
        )}
        {/* [2026-03-12 03:41:30] 打印紧凑对账单模式：直接渲染紧凑版组件 */}
        {isPrintMode && compactMode && (
          <div className="print-compact-invoice-wrapper">
            {renderCompactInvoice()}
          </div>
        )}

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
              {/* 紧凑打印：项目信息 + 客户信息 两列并排 2026-03-10 */}
              {compactMode && showPrintSettings ? (
                (visibleSections.projectInfo && (
                  <div className="compact-print-two-col">
                    <section className="order-section mb-2">
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
                    <section className="order-section mb-2">
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
                  </div>
                ))
              ) : (
                <>
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
                </>
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
                                        {/* Display Dimensions in inches */}
                                        {(() => {
                                          if (pos.widthMm || pos.heightMm) {
                                            const parts = [];
                                            if (pos.widthMm) parts.push(`W: ${(pos.widthMm / 25.4).toFixed(2)}"`);
                                            if (pos.heightMm) parts.push(`H: ${(pos.heightMm / 25.4).toFixed(2)}"`);
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

                                          // Fix: Calculate price with size fee (Case-insensitive) - Fallback to global config
                                          const sizeFees = config?.sizeFees || globalConfig?.sizeFees;
                                          const sizeFee = sizeFees?.find((sf: any) => sf.size?.toLowerCase() === size?.toLowerCase())?.additionalFee || 0;
                                          const finalUnitPrice = (group.unitPrice || 0) + Number(sizeFee);
                                          const subtotal = q * finalUnitPrice;

                                          return (
                                            <tr key={idx}>
                                              <td>{size}</td>
                                              <td>{q}</td>
                                              <td>
                                                ${finalUnitPrice.toFixed(2)}
                                                {Number(sizeFee) > 0 && (
                                                  <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '4px' }}>
                                                    ({t('base')}: ${group.unitPrice?.toFixed(2)} + {t('size')}: ${Number(sizeFee).toFixed(2)})
                                                  </span>
                                                )}
                                                {/* Debug Info */}
                                                <div style={{ display: 'none' }}>
                                                  Debug: Size={size}, Base={group.unitPrice}, Fee={sizeFee}, Final={finalUnitPrice}
                                                </div>
                                              </td>
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
                  <div
                    className="order-pricing-box"
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '0.75rem',
                      marginBottom: '2rem'
                    }}
                  >
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

                  {/* 计费明细 Table - 紧凑打印时使用 billing-details-compact 2026-03-10 */}
                  {billingData && (!showPrintSettings || visibleSections.billing) && (
                    <div style={{ marginBottom: '2rem' }} className={compactMode && showPrintSettings ? 'mt-2' : ''}>
                      <BillingDetails
                        productItems={billingData.productItems}
                        colorGroupsByProduct={billingData.colorGroupsByProduct}
                        dstFileFee={billingData.dstFileFee}
                        rushFee={billingData.rushFee}
                        locale={locale}
                        className={compactMode && showPrintSettings ? 'billing-details-compact' : undefined}
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

              {/* 操作日志 */}
              {meta.auditLogs && meta.auditLogs.length > 0 && (
                <section className={`order-section order-section-wide ${compactMode && showPrintSettings ? 'mb-2' : ''}`}>
                  <h2 className="section-title">操作日志</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {meta.auditLogs.map((log: any, idx: number) => {
                      const actionLabels: Record<string, string> = {
                        ORDER_CREATED: '订单已创建',
                        FIELD_UPDATED: '字段更新',
                        STAGE_CHANGED: '阶段变更',
                        NOTE_ADDED: '添加备注',
                        FILE_UPLOADED: '上传文件',
                        FILE_DELETED: '删除文件',
                        WORK_ORDER_AUTO_CREATED: '工单自动创建',
                        WORK_ORDER_CREATED: '工单已创建',
                        WORK_ORDER_UPDATED: '工单字段更新',
                        ASSIGNEE_CHANGED: '负责人变更',
                      };
                      const actionLabel = actionLabels[log.action] || log.action;
                      const hasDiff = log.field && (log.oldValue !== null || log.newValue !== null);
                      return (
                        <div key={log.id || idx} style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '0.75rem 0',
                          borderBottom: idx < meta.auditLogs.length - 1 ? '1px solid #f0f2f5' : 'none',
                          alignItems: 'flex-start',
                        }}>
                          <div style={{ color: '#718096', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '150px', paddingTop: '2px' }}>
                            {new Date(log.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '1px 8px',
                                borderRadius: '999px',
                                background: log.action === 'ORDER_CREATED' ? '#dcfce7' :
                                  log.action.includes('FILE') ? '#fef9c3' :
                                  log.action.includes('WORK_ORDER') ? '#ede9fe' :
                                  log.action === 'STAGE_CHANGED' ? '#dbeafe' :
                                  '#f1f5f9',
                                color: log.action === 'ORDER_CREATED' ? '#166534' :
                                  log.action.includes('FILE') ? '#713f12' :
                                  log.action.includes('WORK_ORDER') ? '#5b21b6' :
                                  log.action === 'STAGE_CHANGED' ? '#1e40af' :
                                  '#475569',
                              }}>
                                {actionLabel}
                              </span>
                              {log.field && (
                                <span style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500 }}>{log.field}</span>
                              )}
                              {log.actorName && (
                                <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>{log.actorName}</span>
                              )}
                            </div>
                            {hasDiff && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0 6px', borderRadius: '4px', textDecoration: 'line-through' }}>
                                  {log.oldValue ?? '(空)'}
                                </span>
                                <span>→</span>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '0 6px', borderRadius: '4px' }}>
                                  {log.newValue ?? '(空)'}
                                </span>
                              </div>
                            )}
                            {!hasDiff && log.newValue && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#4b5563' }}>{log.newValue}</div>
                            )}
                            {log.metadata?.note && (
                              <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic' }}>{log.metadata.note}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                      <div key={asset.id} className="asset-item-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="asset-item"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12.5 2.5H17.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8.33333 11.6667L17.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="asset-name">{asset.fileName}</span>
                          <span className="asset-size">{(asset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                        </a>
                        {!showPrintSettings && (
                          <button
                            type="button"
                            title="删除附件"
                            style={{ flexShrink: 0, padding: '4px 8px', color: '#9ca3af', cursor: 'pointer', background: 'none', border: 'none', borderRadius: '4px', fontSize: '14px' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
                            onClick={async () => {
                              // eslint-disable-next-line no-alert
                              if (!confirm(`确认删除 ${asset.fileName}？`)) return;
                              try {
                                const res = await authenticatedFetch(
                                  `/api/proxy/admin/offline-orders/${orderId}/assets/${asset.id}`,
                                  { method: 'DELETE' }
                                );
                                if (!res.ok) throw new Error(await res.text());
                                setOrder((prev) => prev ? {
                                  ...prev,
                                  assets: prev.assets.filter((a: any) => a.id !== asset.id)
                                } : prev);
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(`删除失败：${err instanceof Error ? err.message : err}`);
                              }
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
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

        /* 紧凑打印模式：在 print=true 或开启 Compact Layout 时生效 */
        .order-detail-shell.print-compact-mode {
          padding: 0.5rem;
          background: #ffffff;
          font-size: 9pt;
          line-height: 1.25;
        }

        .order-detail-shell.print-compact-mode .order-detail-card {
          max-width: none;
          border-radius: 0;
          box-shadow: none;
        }

        .order-detail-shell.print-compact-mode .order-detail-header {
          padding: 0.75rem 1rem;
          margin-bottom: 0.25rem;
        }

        .order-detail-shell.print-compact-mode .order-detail-content {
          padding: 0.75rem 1rem 1rem 1rem;
          gap: 0.5rem;
        }

        .order-detail-shell.print-compact-mode .order-section {
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.4rem;
        }

        .order-detail-shell.print-compact-mode .order-section-header h2 {
          font-size: 0.9rem;
        }

        .order-detail-shell.print-compact-mode .info-grid {
          gap: 0.25rem;
        }

        .order-detail-shell.print-compact-mode .info-label {
          font-size: 0.7rem;
        }

        .order-detail-shell.print-compact-mode .info-value {
          font-size: 0.75rem;
        }

        .order-detail-shell.print-compact-mode .product-card {
          padding: 0.4rem 0.6rem;
          margin-bottom: 0.35rem;
        }

        .order-detail-shell.print-compact-mode .product-header {
          margin-bottom: 0.2rem;
        }

        .order-detail-shell.print-compact-mode .product-meta {
          font-size: 0.7rem;
        }

        .order-detail-shell.print-compact-mode .billing-summary-card {
          padding: 0.5rem 0.75rem;
        }

        .order-detail-shell.print-compact-mode .billing-summary-card .summary-row {
          margin-bottom: 0.1rem;
        }

        .order-detail-shell.print-compact-mode .billing-summary-card .summary-total {
          padding-top: 0.15rem;
          margin-top: 0.2rem;
        }

        @media print {
          .order-detail-shell.print-compact-mode {
            padding: 0;
            background: #ffffff;
          }

          .order-detail-shell.print-compact-mode .order-detail-card {
            box-shadow: none;
          }
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
