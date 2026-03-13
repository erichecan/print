/**
 * Sales Dashboard Tab — 销售与经营分析看板
 * 仅从销售角度、经营角度展示数据，不包含任何订单状态/阶段维度
 * 2026-03-10 重构
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { adminOfflineOrdersApi, salesOrdersApi, OfflineOrderMetricsResponse } from '@/lib/api';
import type { OfflineOrdersLocale } from '@/translations/offlineOrders';
import { OFFLINE_ORDERS_TRANSLATIONS } from '@/translations/offlineOrders';

type TimeRangeKey = 'today' | 'week' | 'month' | 'all' | 'custom';

function getTimeRangeBounds(
  range: TimeRangeKey,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } | null {
  if (range === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  if (range === 'custom') return null;

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start: Date;
  switch (range) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const Icons = {
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  currency: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trending: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0115.306 3.28l1.5-1.5" />
    </svg>
  ),
  cube: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
};

interface SalesDashboardTabProps {
  locale: OfflineOrdersLocale;
  isManager: boolean;
}

export function SalesDashboardTab({ locale, isManager }: SalesDashboardTabProps) {
  const t = useCallback(
    (key: string) => OFFLINE_ORDERS_TRANSLATIONS[locale]?.[key] ?? OFFLINE_ORDERS_TRANSLATIONS.en[key] ?? key,
    [locale]
  );

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [topProductFilter, setTopProductFilter] = useState('');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [primaryProductFilter, setPrimaryProductFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');

  const params = useMemo(() => {
    const bounds = getTimeRangeBounds(timeRange, customStart, customEnd);
    return {
      scope: scope === 'mine' ? ('mine' as const) : undefined,
      startDate: bounds?.startDate,
      endDate: bounds?.endDate,
      primaryProduct: primaryProductFilter.trim() || undefined,
      creatorId: creatorFilter || undefined,
    };
  }, [timeRange, scope, customStart, customEnd, primaryProductFilter, creatorFilter]);

  const { data: creatorsData } = useSWR(
    isManager ? 'sales-orders-creators' : null,
    () => salesOrdersApi.getCreators().then((r) => r.data)
  );
  const creators = creatorsData ?? [];

  const { data, error, isLoading, mutate } = useSWR<OfflineOrderMetricsResponse>(
    ['sales-dashboard-metrics', params.scope, params.startDate, params.endDate, params.primaryProduct, params.creatorId],
    () => adminOfflineOrdersApi.getMetrics(params)
  );

  const sales = data?.sales ?? {
    orderCount: 0,
    revenueTotal: 0,
    averageOrderValue: 0,
    inventoryConsumed: 0,
    averageUnitPrice: 0,
  };
  const cost = data?.cost ?? { costTotal: 0, marginTotal: 0, marginPercent: 0 };
  const byCreator = data?.byCreator ?? [];
  const byProductLineRaw = data?.byProductLine ?? [];
  const timeSeries = data?.timeSeries ?? [];
  const byProductLine = useMemo(() => {
    if (!topProductFilter) return byProductLineRaw;
    const q = topProductFilter.toLowerCase();
    return byProductLineRaw.filter((p: any) => (p.productName || '').toLowerCase().includes(q));
  }, [byProductLineRaw, topProductFilter]);

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-slate-600">{t('errorLoadingDashboard')}</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
        >
          {Icons.refresh}
          {t('refresh')}
        </button>
      </div>
    );
  }

  // 销售与经营 KPI：销售笔数、总营收、客单价、总成本、毛利、库存消耗、件均价
  const kpiCards = [
    { key: 'orders', value: sales.orderCount, label: t('salesCount'), border: 'border-l-violet-500', bg: 'bg-violet-50', labelClr: 'text-violet-700', valueClr: 'text-violet-900' },
    { key: 'revenue', value: `$${sales.revenueTotal.toFixed(2)}`, label: t('revenueTotal'), border: 'border-l-emerald-500', bg: 'bg-emerald-50', labelClr: 'text-emerald-700', valueClr: 'text-emerald-900' },
    { key: 'aov', value: `$${sales.averageOrderValue.toFixed(2)}`, label: t('averageOrderValue'), border: 'border-l-blue-500', bg: 'bg-blue-50', labelClr: 'text-blue-700', valueClr: 'text-blue-900' },
    { key: 'cost', value: `$${cost.costTotal.toFixed(2)}`, label: t('costTotal'), border: 'border-l-amber-500', bg: 'bg-amber-50', labelClr: 'text-amber-700', valueClr: 'text-amber-900' },
    { key: 'margin', value: `$${cost.marginTotal.toFixed(2)} (${cost.marginPercent.toFixed(0)}%)`, label: t('marginTotal'), border: 'border-l-teal-500', bg: 'bg-teal-50', labelClr: 'text-teal-700', valueClr: 'text-teal-900' },
    { key: 'inventory', value: sales.inventoryConsumed ?? 0, label: t('inventoryConsumed') || 'Inventory Consumed', border: 'border-l-rose-500', bg: 'bg-rose-50', labelClr: 'text-rose-700', valueClr: 'text-rose-900' },
    { key: 'avgUnitPrice', value: `$${(sales.averageUnitPrice ?? 0).toFixed(2)}`, label: t('averageUnitPrice') || 'Avg Unit Price', border: 'border-l-indigo-500', bg: 'bg-indigo-50', labelClr: 'text-indigo-700', valueClr: 'text-indigo-900' },
  ];

  return (
    <div className="sales-dashboard-tab space-y-6">
      {/* 筛选栏：时间范围 + 自定义日期 + 我的业绩 + 刷新 */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{t('timeRange')}</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            aria-label={t('timeRange')}
          >
            <option value="today">{t('today')}</option>
            <option value="week">{t('thisWeek')}</option>
            <option value="month">{t('thisMonth')}</option>
            <option value="all">{t('allTime')}</option>
            <option value="custom">{t('customRange')}</option>
          </select>
        </div>
        {timeRange === 'custom' && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              {t('startDate')}
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              {t('endDate')}
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm cursor-pointer"
              />
            </label>
          </>
        )}
        {isManager && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{t('scope')}</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'all' | 'mine')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">{t('allOrders')}</option>
              <option value="mine">{t('myPerformance')}</option>
            </select>
          </div>
        )}

        {/* 2026-03-13: 保留 API 层面的产品筛选，但默认不强调 UI 文案 */}
        {/* 如后续主产品字段使用更规范，可再强化这个筛选 */}

        {isManager && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{t('filterByCreator') || 'Creator'}</span>
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">{t('allCreators') || 'All Creators'}</option>
              {creators.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={() => mutate()}
          disabled={isLoading}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors duration-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 cursor-pointer"
          aria-label={t('refresh')}
        >
          {Icons.refresh}
          {t('refresh')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-600">{t('loadingDashboard')}</p>
      ) : (
        <>
          {/* 核心指标：销售笔数、总营收、客单价、总成本、毛利、库存消耗、件均价 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {kpiCards.map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border-l-4 border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md cursor-default ${item.border} ${item.bg} border-slate-200`}
              >
                <div className={`flex items-center gap-2 text-sm font-medium ${item.labelClr}`}>
                  {item.key === 'revenue' || item.key === 'aov' || item.key === 'cost' || item.key === 'margin' ? Icons.currency : Icons.chart}
                  {item.label}
                </div>
                <p className={`mt-2 text-xl font-bold tabular-nums ${item.valueClr}`}>{item.value}</p>
              </div>
            ))}
          </div>


          {/* 经营视角：按负责人 + 按产品线 + 简单时间趋势 */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* 按负责人 */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                {Icons.chart}
                {t('byCreator') || 'By Creator'}
              </h2>
              {byCreator.length === 0 ? (
                <p className="text-sm text-slate-500">{t('noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <tr>
                        <th className="py-3 px-4 font-semibold">{t('creator') || 'Creator'}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('orderCount')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('revenueTotal')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('costTotal')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('marginTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byCreator.map((row: any) => (
                        <tr key={row.creatorId} className="transition-colors hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {row.creatorName || (row.creatorId === 'unknown' ? t('unknownCreator') || 'Unknown' : row.creatorId)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">{row.orderCount}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-700">${row.revenue.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-amber-700">${row.cost.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-teal-700">
                            ${row.margin.toFixed(2)} ({row.marginPercent.toFixed(0)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 按产品线 / 主产品 */}
            <section className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-indigo-900">
                  {Icons.cube}
                  {t('byProductLine') || 'By Product Line'}
                </h2>
                <input
                  type="text"
                  value={topProductFilter}
                  onChange={(e) => setTopProductFilter(e.target.value)}
                  placeholder="按主产品名称筛选…"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-48"
                />
              </div>
              {byProductLine.length === 0 ? (
                <p className="text-sm text-slate-500">{topProductFilter ? '没有匹配的产品线' : t('noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <tr>
                        <th className="py-3 px-4 font-semibold">{t('productName')}</th>
                        <th className="py-3 px-4 font-semibold">{t('category')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('orderCount')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('revenueTotal')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('costTotal')}</th>
                        <th className="py-3 px-4 font-semibold tabular-nums text-right">{t('marginTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byProductLine.slice(0, 12).map((row: any, i: number) => (
                        <tr key={row.productName + i} className="transition-colors hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{row.productName}</td>
                          <td className="py-3 px-4">
                            {row.category ? (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                                {row.category}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">{row.orderCount}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-700">${row.revenue.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-amber-700">${row.cost.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-teal-700">
                            ${row.margin.toFixed(2)} ({row.marginPercent.toFixed(0)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {/* 时间趋势 */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                {Icons.trending}
                {t('ordersTrend') || 'Orders Trend'}
              </h2>
              {timeSeries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('noData')}
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {timeSeries.map((row: any) => (
                    <li key={row.date} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm text-slate-600">{row.date}</span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-2 rounded-full bg-indigo-200"
                          style={{
                            width: `${Math.max(
                              8,
                              (row.orderCount / Math.max(1, ...timeSeries.map((t: any) => t.orderCount))) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-700">
                        {row.orderCount}
                      </span>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
                        ${row.revenue.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
