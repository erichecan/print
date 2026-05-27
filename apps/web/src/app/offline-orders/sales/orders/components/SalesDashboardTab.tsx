/**
 * Sales Dashboard Tab — 统一浅色风格，无深色背景
 * 保留顶部核心指标（含环比）；其余为 Total sales/Orders、Net profit+AOV、P&L、畅销榜、类目/支付方式环形图；全部白/浅色卡片
 * 2026-03-14 style unified per frontend-design + ui-ux-pro-max
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

function formatPeriodLabel(range: TimeRangeKey): string {
  const r: Record<TimeRangeKey, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    all: 'All time',
    custom: 'Custom',
  };
  return r[range] || range;
}

const Icons = {
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
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

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [creatorFilter, setCreatorFilter] = useState('');

  const params = useMemo(() => {
    const bounds = getTimeRangeBounds(timeRange, customStart, customEnd);
    return {
      scope: scope === 'mine' ? ('mine' as const) : undefined,
      startDate: bounds?.startDate,
      endDate: bounds?.endDate,
      creatorId: creatorFilter || undefined,
    };
  }, [timeRange, scope, customStart, customEnd, creatorFilter]);

  const { data: creatorsData } = useSWR(
    isManager ? 'sales-orders-creators' : null,
    () => salesOrdersApi.getCreators().then((r) => r.data)
  );
  const creators = creatorsData ?? [];

  const { data, error, isLoading, mutate } = useSWR<OfflineOrderMetricsResponse>(
    ['sales-dashboard-metrics', params.scope, params.startDate, params.endDate, params.creatorId],
    () => adminOfflineOrdersApi.getMetrics(params)
  );

  const sales = data?.sales ?? { orderCount: 0, revenueTotal: 0, averageOrderValue: 0, inventoryConsumed: 0, averageUnitPrice: 0 };
  const cost = data?.cost ?? { costTotal: 0, marginTotal: 0, marginPercent: 0 };
  const byCreator = data?.byCreator ?? [];
  const prev = data?.previousPeriod ?? null;
  const timeSeries = data?.timeSeries ?? [];
  const timeSeriesPrev = data?.timeSeriesPrev ?? [];
  const plStatement = data?.plStatement ?? { salePrice: 0, totalCosts: 0, netProfit: 0 };
  const bestSellers = data?.bestSellers ?? [];
  const byCategory = data?.byCategory ?? [];
  const byPaymentMode = data?.byPaymentMode ?? [];

  const diff = useMemo(() => {
    if (!prev) return null;
    return {
      orderCount: sales.orderCount - prev.orderCount,
      revenueTotal: sales.revenueTotal - prev.revenueTotal,
      marginTotal: cost.marginTotal - prev.marginTotal,
      marginPercent: cost.marginPercent - prev.marginPercent,
      averageOrderValue: sales.averageOrderValue - prev.averageOrderValue,
    };
  }, [prev, sales, cost]);

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-slate-600">{t('errorLoadingDashboard')}</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          {Icons.refresh}
          {t('refresh')}
        </button>
      </div>
    );
  }

  const periodLabel = formatPeriodLabel(timeRange);

  const kpiCards = [
    { key: 'revenue', value: sales.revenueTotal, label: t('revenueTotal'), format: (v: number) => `$${v.toFixed(2)}`, diffKey: 'revenueTotal' as const },
    { key: 'orders', value: sales.orderCount, label: t('salesCount') || 'Orders', format: (v: number) => String(v), diffKey: 'orderCount' as const },
    { key: 'aov', value: sales.averageOrderValue, label: t('averageOrderValue'), format: (v: number) => `$${v.toFixed(2)}`, diffKey: 'averageOrderValue' as const },
    { key: 'cost', value: cost.costTotal, label: t('costTotal'), format: (v: number) => `$${v.toFixed(2)}` },
    { key: 'margin', value: cost.marginTotal, label: t('marginTotal'), format: (v: number) => `$${v.toFixed(2)} (${cost.marginPercent.toFixed(0)}%)`, diffKey: 'marginTotal' as const },
  ];

  const maxRev = Math.max(1, ...timeSeries.map((x) => x.revenue), ...timeSeriesPrev.map((x) => x.revenue));
  const maxOrders = Math.max(1, ...timeSeries.map((x) => x.orderCount), ...timeSeriesPrev.map((x) => x.orderCount));

  return (
    <div className="sales-dashboard-tab min-h-[60vh] space-y-6 bg-slate-50/80 rounded-xl p-4 md:p-6">
      {/* 筛选栏 — 与卡片统一浅色 */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{t('timeRange')}</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer"
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
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm cursor-pointer" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              {t('endDate')}
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm cursor-pointer" />
            </label>
          </>
        )}
        {isManager && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{t('scope')}</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as 'all' | 'mine')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer">
              <option value="all">{t('allOrders')}</option>
              <option value="mine">{t('myPerformance')}</option>
            </select>
          </div>
        )}
        {isManager && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{t('filterByCreator') || 'Creator'}</span>
            <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer">
              <option value="">{t('allCreators') || 'All Creators'}</option>
              {creators.map((c: { id: string; name?: string; email?: string }) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
        )}
        <button type="button" onClick={() => mutate()} disabled={isLoading} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          {Icons.refresh}
          {t('refresh')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-600">{t('loadingDashboard')}</p>
      ) : (
        <>
          {/* 1. 顶部核心指标：数值 + 环比 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map((item) => {
              const d = diff && item.diffKey ? (diff as Record<string, number>)[item.diffKey] : undefined;
              const hasDiff = d !== undefined && d !== 0 && prev !== null;
              return (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow">
                  <div className="text-sm font-medium text-slate-600">{item.label}</div>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{item.format(item.value)}</p>
                  {hasDiff && (
                    <p className={`mt-1 text-xs font-medium ${d > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {d > 0 ? '▲' : '▼'} {typeof d === 'number' && (item.diffKey === 'revenueTotal' || item.diffKey === 'marginTotal' || item.diffKey === 'averageOrderValue') ? `$${Math.abs(d).toFixed(2)}` : Math.abs(d)} vs last period
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sales by Creator 表格 */}
          {byCreator.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm border-l-4 border-l-indigo-500 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    Sales by Creator
                    <span className="text-sm font-normal text-slate-400">— {periodLabel}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">按创建人统计订单量与销售额</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total orders</div>
                  <div className="text-xl font-bold tabular-nums text-indigo-600">{sales.orderCount}</div>
                </div>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="w-10 px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Creator</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Orders</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Revenue</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Avg. Order</th>
                  </tr>
                </thead>
                <tbody>
                  {byCreator.map((row, idx) => {
                    const avg = row.orderCount > 0 ? row.revenue / row.orderCount : 0;
                    const rankBadge = idx === 0
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-300'
                      : idx === 1
                      ? 'bg-slate-100 text-slate-600 border border-slate-300'
                      : idx === 2
                      ? 'bg-amber-50 text-amber-700 border border-amber-300'
                      : 'bg-slate-50 text-slate-400 border border-slate-200';
                    return (
                      <tr key={row.creatorId} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${rankBadge}`}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.creatorName || row.creatorId}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block bg-blue-50 text-blue-700 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">{row.orderCount}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">${row.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">${avg.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 font-semibold text-slate-700" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{sales.orderCount}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">${sales.revenueTotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">${sales.averageOrderValue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 2. Total sales + Orders 卡片（浅色统一风格：白底+左边 accent） */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-indigo-500">
              <div className="text-sm font-medium text-slate-500">Total sales</div>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">${sales.revenueTotal.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{periodLabel}</p>
              {diff && prev && (
                <p className={`mt-1 text-sm ${diff.revenueTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff.revenueTotal >= 0 ? '↑' : '▼'} ${Math.abs(diff.revenueTotal).toFixed(2)} vs same period last time
                </p>
              )}
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> This period</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Last period</span>
                </div>
                <div className="h-24">
                  {timeSeries.length > 0 || timeSeriesPrev.length > 0 ? (
                    <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                      {timeSeries.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgb(99 102 241)"
                          strokeWidth="1.5"
                          points={timeSeries.map((p, i) => `${(i / (timeSeries.length - 1 || 1)) * 280 + 10},${70 - (p.revenue / maxRev) * 60}`).join(' ')}
                        />
                      )}
                      {timeSeriesPrev.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgb(245 158 11)"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          points={timeSeriesPrev.map((p, i) => `${(i / (timeSeriesPrev.length - 1 || 1)) * 280 + 10},${70 - (p.revenue / maxRev) * 60}`).join(' ')}
                        />
                      )}
                    </svg>
                  ) : (
                    <p className="text-xs text-slate-500">Select a time range to see trend</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-indigo-500">
              <div className="text-sm font-medium text-slate-500">Orders</div>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{sales.orderCount}</p>
              <p className="text-xs text-slate-500">{periodLabel}</p>
              {diff && prev && (
                <p className={`mt-1 text-sm ${diff.orderCount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff.orderCount >= 0 ? '↑' : '▼'} {Math.abs(diff.orderCount)} vs same period last time
                </p>
              )}
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> This period</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Last period</span>
                </div>
                <div className="h-24">
                  {timeSeries.length > 0 || timeSeriesPrev.length > 0 ? (
                    <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                      {timeSeries.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgb(99 102 241)"
                          strokeWidth="1.5"
                          points={timeSeries.map((p, i) => `${(i / (timeSeries.length - 1 || 1)) * 280 + 10},${70 - (p.orderCount / maxOrders) * 60}`).join(' ')}
                        />
                      )}
                      {timeSeriesPrev.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="rgb(245 158 11)"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          points={timeSeriesPrev.map((p, i) => `${(i / (timeSeriesPrev.length - 1 || 1)) * 280 + 10},${70 - (p.orderCount / maxOrders) * 60}`).join(' ')}
                        />
                      )}
                    </svg>
                  ) : (
                    <p className="text-xs text-slate-500">Select a time range to see trend</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Net profit + AOV 仪表盘（浅色卡片） */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-emerald-500">
              <div className="text-sm font-medium text-slate-500">Net profit</div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">${cost.marginTotal.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{periodLabel}</p>
              {diff && prev && (
                <p className={`mt-1 text-sm ${diff.marginTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff.marginTotal >= 0 ? '↑' : '▼'} ${Math.abs(diff.marginTotal).toFixed(2)} vs last period
                </p>
              )}
              <div className="mt-3 text-sm font-medium text-slate-600">Net profit margin</div>
              <p className="text-xl font-bold tabular-nums text-slate-900">{cost.marginPercent.toFixed(0)}%</p>
              {diff && prev && (
                <p className={`text-xs ${diff.marginPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff.marginPercent >= 0 ? '↑' : '▼'} {Math.abs(diff.marginPercent).toFixed(0)}% vs last period
                </p>
              )}
            </div>

            {/* AOV 仪表盘：留足边距避免图案被裁切 2026-03-11 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-indigo-500 overflow-visible">
              <div className="text-sm font-medium text-slate-500">Avg. order value</div>
              <div className="mt-3 flex justify-center px-2">
                <div className="relative w-full max-w-[240px] aspect-[2/1] min-h-[100px]">
                  <svg viewBox="-12 -8 224 96" className="w-full h-full block" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                    <path d="M 20 72 A 72 72 0 0 1 180 72" fill="none" stroke="rgb(226 232 240)" strokeWidth="10" strokeLinecap="round" />
                    <path
                      d="M 20 72 A 72 72 0 0 1 180 72"
                      fill="none"
                      stroke="rgb(34 197 94)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min(100, (sales.averageOrderValue / Math.max(sales.averageOrderValue, 50)) * 100)} 100`}
                    />
                  </svg>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-2xl font-bold tabular-nums text-slate-900">${sales.averageOrderValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. P&L statement（浅色统一） */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">P&L statement — {periodLabel}</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between text-slate-700">
                <span>Sale price</span>
                <span className="tabular-nums font-medium text-slate-900">${plStatement.salePrice.toFixed(2)}</span>
              </li>
              <li className="flex justify-between text-slate-700">
                <span>Total costs</span>
                <span className="tabular-nums font-medium text-slate-900">${plStatement.totalCosts.toFixed(2)}</span>
              </li>
              <li className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Net profit</span>
                <span className="tabular-nums">${plStatement.netProfit.toFixed(2)}</span>
              </li>
            </ul>
          </div>

          {/* 5. AOV + Best sellers 一行（统一白卡） */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-base font-semibold text-slate-900">AOV — {periodLabel}</h2>
              <p className="text-2xl font-bold tabular-nums text-slate-900">${sales.averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Best sellers — {periodLabel}</h2>
              {bestSellers.length === 0 ? (
                <p className="text-sm text-slate-500">{t('noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {bestSellers.map((row, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700">{row.productName}</span>
                      <span className="tabular-nums font-medium text-slate-900">{row.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 6. 环形图：按类目、按支付方式（浅色卡片） */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Quantity by Category</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-slate-500">{t('noData')}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <DonutChart data={byCategory.map((x) => ({ label: x.category, value: x.quantity }))} colors={['#eab308', '#3b82f6', '#22c55e', '#f97316', '#a855f7']} />
                  <ul className="text-sm text-slate-600">
                    {byCategory.map((row, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ['#eab308', '#3b82f6', '#22c55e', '#f97316', '#a855f7'][i % 5] }} />
                        {row.category}: {row.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Orders by Payment Mode</h2>
              {byPaymentMode.length === 0 ? (
                <p className="text-sm text-slate-500">{t('noData')}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <DonutChart data={byPaymentMode.map((x) => ({ label: x.paymentMode, value: x.orderCount }))} colors={['#38bdf8', '#1e40af', '#f97316', '#a855f7', '#ec4899']} />
                  <ul className="text-sm text-slate-600">
                    {byPaymentMode.map((row, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ['#38bdf8', '#1e40af', '#f97316', '#a855f7', '#ec4899'][i % 5] }} />
                        {row.paymentMode}: {row.orderCount}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DonutChart({ data, colors }: { data: Array<{ label: string; value: number }>; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="h-32 w-32 rounded-full border-8 border-slate-200" />;
  let acc = 0;
  const segments = data.map((d, i) => {
    const p = (d.value / total) * 100;
    const segment = { ...d, start: acc, pct: p, color: colors[i % colors.length] };
    acc += p;
    return segment;
  });
  const r = 40;
  const C = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0">
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth="16"
          strokeDasharray={`${(seg.pct / 100) * C} ${C}`}
          strokeDashoffset={-((seg.start / 100) * C)}
          transform="rotate(-90 50 50)"
        />
      ))}
    </svg>
  );
}
