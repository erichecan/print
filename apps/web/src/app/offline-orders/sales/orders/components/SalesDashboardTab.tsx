/**
 * Sales Dashboard Tab — 销售数字看板
 * 配色增强、自定义时间段、多维度统计（最受欢迎产品、趋势、成本/毛利）
 * 2025-02-19, 2025-02-20
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { adminOfflineOrdersApi, OfflineOrderMetricsResponse } from '@/lib/api';
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

// 阶段条形图配色（渐变感）
const STAGE_COLORS = [
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-amber-500',
];

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
  funnel: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
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
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  const params = useMemo(() => {
    const bounds = getTimeRangeBounds(timeRange, customStart, customEnd);
    return {
      scope: scope === 'mine' ? 'mine' : undefined,
      startDate: bounds?.startDate,
      endDate: bounds?.endDate,
    };
  }, [timeRange, scope, customStart, customEnd]);

  const { data, error, isLoading, mutate } = useSWR<OfflineOrderMetricsResponse>(
    ['sales-dashboard-metrics', params.scope, params.startDate, params.endDate],
    () => adminOfflineOrdersApi.getMetrics(params)
  );

  const summary = data?.summary ?? null;
  const stages = data?.stages ?? [];
  const revenue = data?.revenue;
  const topProducts = data?.topProducts ?? [];
  const timeSeries = data?.timeSeries ?? [];
  const cost = data?.cost;
  const maxStageCount = useMemo(() => Math.max(1, ...stages.map((s) => s.count)), [stages]);
  const maxTimeSeriesCount = useMemo(() => Math.max(1, ...timeSeries.map((ts) => ts.orderCount)), [timeSeries]);

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

  const kpiCards = [
    { key: 'total', value: summary?.total ?? 0, label: t('totalOrders'), border: 'border-l-violet-500', bg: 'bg-violet-50', labelClr: 'text-violet-700', valueClr: 'text-violet-900' },
    { key: 'active', value: summary?.active ?? 0, label: t('active'), border: 'border-l-emerald-500', bg: 'bg-emerald-50', labelClr: 'text-emerald-700', valueClr: 'text-emerald-900' },
    { key: 'completed', value: summary?.completed ?? 0, label: t('completed'), border: 'border-l-blue-500', bg: 'bg-blue-50', labelClr: 'text-blue-700', valueClr: 'text-blue-900' },
    { key: 'cancelled', value: summary?.cancelled ?? 0, label: t('cancelled'), border: 'border-l-red-500', bg: 'bg-red-50', labelClr: 'text-red-700', valueClr: 'text-red-900' },
    { key: 'rush', value: summary?.rushActive ?? 0, label: t('rushOrders'), border: 'border-l-amber-500', bg: 'bg-amber-50', labelClr: 'text-amber-700', valueClr: 'text-amber-900' },
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
            <span className="text-sm font-medium text-slate-700">{t('allOrders')}</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'all' | 'mine')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              aria-label={t('myPerformance')}
            >
              <option value="all">{t('allOrders')}</option>
              <option value="mine">{t('myPerformance')}</option>
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
          {/* KPI 卡片：配色区分 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpiCards.map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border-l-4 border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md cursor-default ${item.border} ${item.bg} border-slate-200`}
              >
                <div className={`flex items-center gap-2 text-sm font-medium ${item.labelClr}`}>
                  {Icons.chart}
                  {item.label}
                </div>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${item.valueClr}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* 营收 + 成本/毛利 同一行 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {revenue && (revenue.revenueTotal > 0 || revenue.revenueActive > 0 || revenue.revenueCompleted > 0) && (
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  {Icons.currency}
                  {t('revenueTotal')} / {t('revenueActive')} / {t('revenueCompleted')}
                </h3>
                <div className="flex flex-wrap gap-4">
                  <span className="text-lg font-semibold text-emerald-900 tabular-nums">
                    ${(revenue.revenueTotal ?? 0).toFixed(2)} CAD
                  </span>
                  <span className="text-sm text-emerald-700">
                    Active: ${(revenue.revenueActive ?? 0).toFixed(2)} · Done: ${(revenue.revenueCompleted ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {cost && (
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  {Icons.currency}
                  {t('costTotal')} / {t('margin')}
                </h3>
                <div className="flex flex-wrap gap-4 text-slate-900">
                  <span className="tabular-nums">Cost: ${(cost.costTotal ?? 0).toFixed(2)}</span>
                  <span className="font-semibold tabular-nums">{t('marginTotal')}: ${(cost.marginTotal ?? 0).toFixed(2)} CAD</span>
                  <span className="text-sm text-slate-600">{t('marginPercent')}: {(cost.marginPercent ?? 0).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 最受欢迎产品 + 订单趋势 两列 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-indigo-900">
                {Icons.cube}
                {t('topProducts')}
              </h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">{t('noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {topProducts.slice(0, 8).map((row, i) => (
                    <li key={row.productName + i} className="flex items-center gap-3 rounded-lg bg-slate-50 py-2 px-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{row.productName}</span>
                      <span className="shrink-0 text-sm tabular-nums text-slate-600">{row.orderCount} {t('orderCount')}</span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-emerald-700">${row.revenue.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                {Icons.trending}
                {t('ordersTrend')}
              </h2>
              {timeSeries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {params.startDate && params.endDate ? t('noData') : t('timeRange') + ' → ' + t('customRange') + ' / ' + t('thisWeek') + ' / ' + t('thisMonth')}
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {timeSeries.map((row) => (
                    <li key={row.date} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm text-slate-600">{row.date}</span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-6 rounded bg-indigo-200 transition-all duration-300"
                          style={{ width: `${Math.max(8, (row.orderCount / maxTimeSeriesCount) * 100)}%` }}
                          role="presentation"
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900">{row.orderCount}</span>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">${row.revenue.toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* 阶段漏斗：多色条形 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              {Icons.funnel}
              {t('stageFunnel')}
            </h2>
            <ul className="space-y-3">
              {stages.map((stage, i) => (
                <li key={stage.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm font-medium text-slate-700">{stage.label}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`h-8 rounded-lg transition-all duration-300 ${STAGE_COLORS[i % STAGE_COLORS.length]}`}
                      style={{ width: `${Math.max(4, (stage.count / maxStageCount) * 100)}%` }}
                      role="presentation"
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{stage.count}</span>
                </li>
              ))}
            </ul>
            {stages.length === 0 && <p className="text-sm text-slate-500">{t('noOrdersYet')}</p>}
          </section>
        </>
      )}
    </div>
  );
}
