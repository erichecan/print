'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { adminOfflineOrdersApi, AdminOfflineOrderListResponse, AdminOfflineOrderSummary } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export default function MobileOrderListPage() {
  const { t, locale } = useAdminI18n();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [rushFilter, setRushFilter] = useState<'all' | 'rush' | 'standard'>('all');
  const [stageKey, setStageKey] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('ACTIVE');
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<string>('');

  // Fetch data
  const listParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (search.trim()) params.search = search.trim();
    if (rushFilter !== 'all') params.rush = rushFilter === 'rush';
    if (stageKey) params.stageKey = stageKey;
    if (statusFilter) params.status = statusFilter;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    if (dateFilter) params.date = dateFilter;
    return params;
  }, [search, rushFilter, stageKey, statusFilter]);

  const {
    data: boardData,
    error,
    isLoading,
    mutate
  } = useSWR<AdminOfflineOrderListResponse>(['admin-offline-orders-mobile', listParams],
    () => adminOfflineOrdersApi.list(listParams)
  );

  const orders = boardData?.orders || [];
  const stages = useMemo(() => {
    return (boardData?.stages || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [boardData?.stages]);

  // Calculate counts
  const rushCounts = useMemo(() => {
    return {
      rush: orders.filter((order) => order.rushOrder).length,
      standard: orders.filter((order) => !order.rushOrder).length,
    };
  }, [orders]);

  // Group by stage for mobile list (optional, maybe just flat list better?)
  // For mobile, a flat list sorted by date or priority is often better.
  // Let's keep it flat but maybe show stage as badge.

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-30 shadow-sm transition-all duration-200">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('salesOrderManagement')}</h1>
            <Link
              href="/mobile/offline-orders/create"
              className="p-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
            />
            <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Custom Filter Bar: 4 items (Status, Payment, Method, Date) */}
          <div className="space-y-2">
            {/* Row 1: Status, Payment, Method */}
            <div className="grid grid-cols-3 gap-2">
              {/* Status Filter */}
              <div className="relative">
                <div
                  className={`flex items-center justify-between w-full bg-white border ${statusFilter ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-gray-200 text-slate-700'
                    } rounded-lg py-2 px-1.5 shadow-sm transition-all`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${statusFilter ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-[10px] sm:text-xs font-semibold truncate ${statusFilter ? 'text-blue-600' : 'text-slate-700'}`}>
                      {statusFilter ? (statusFilter === 'ACTIVE' ? 'Processing' : statusFilter === 'COMPLETED' ? 'Done' : 'Cancel') : 'Status'}
                    </span>
                  </div>
                  <svg className={`w-3 h-3 flex-shrink-0 ml-0.5 ${statusFilter ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || undefined)}
                  className="absolute inset-0 w-full h-full opacity-0 z-10"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Processing</option>
                  <option value="COMPLETED">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Payment Filter (Visual Shell) */}
              <div className="relative">
                <div className={`flex items-center justify-between w-full bg-white border ${paymentStatus ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-gray-200 text-slate-700'} rounded-lg py-2 px-1.5 shadow-sm transition-all`}>
                  <div className="flex items-center gap-1 min-w-0">
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${paymentStatus ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-[10px] sm:text-xs font-semibold truncate ${paymentStatus ? 'text-blue-600' : 'text-slate-700'}`}>
                      {paymentStatus === 'PAID' ? 'Paid' : paymentStatus === 'UNPAID' ? 'Unpaid' : 'Payment'}
                    </span>
                  </div>
                  <svg className={`w-3 h-3 flex-shrink-0 ml-0.5 ${paymentStatus ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={paymentStatus || ''}
                  onChange={(e) => setPaymentStatus(e.target.value || undefined)}
                  className="absolute inset-0 w-full h-full opacity-0 z-10"
                >
                  <option value="">All Payments</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>

              {/* Method Filter (Visual Shell) */}
              <div className="relative">
                <div className={`flex items-center justify-between w-full bg-white border ${paymentMethod ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-gray-200 text-slate-700'} rounded-lg py-2 px-1.5 shadow-sm transition-all`}>
                  <div className="flex items-center gap-1 min-w-0">
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${paymentMethod ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className={`text-[10px] sm:text-xs font-semibold truncate ${paymentMethod ? 'text-blue-600' : 'text-slate-700'}`}>
                      {paymentMethod || 'Method'}
                    </span>
                  </div>
                  <svg className={`w-3 h-3 flex-shrink-0 ml-0.5 ${paymentMethod ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  value={paymentMethod || ''}
                  onChange={(e) => setPaymentMethod(e.target.value || undefined)}
                  className="absolute inset-0 w-full h-full opacity-0 z-10"
                >
                  <option value="">All Methods</option>
                  <option value="Square">Square</option>
                  <option value="Cash">Cash</option>
                  <option value="E-Transfer">E-Transfer</option>
                  <option value="Debit">Debit</option>
                </select>
              </div>
            </div>

            {/* Row 2: Select Date */}
            <div className="relative">
              <div className={`flex items-center justify-between w-full bg-white border ${dateFilter ? 'border-blue-600 text-blue-600 bg-blue-50/10' : 'border-gray-200 text-slate-700'} rounded-lg py-2 px-3 shadow-sm transition-all`}>
                <div className="flex items-center gap-2 min-w-0">
                  <svg className={`w-4 h-4 flex-shrink-0 ${dateFilter ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className={`text-xs font-semibold truncate ${dateFilter ? 'text-blue-600' : 'text-slate-700'}`}>
                    {dateFilter || 'Select Date'}
                  </span>
                </div>
                <svg className={`w-3 h-3 flex-shrink-0 ml-1 ${dateFilter ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Date picker input (hidden opacity but clickable) */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 z-10"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Order List */}
      <main className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            {t('loadingOrders')}
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 bg-red-50 rounded-xl">
            {t('failedToLoadOrders')}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-gray-200">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>{t('noOrdersMatchFilters')}</p>
          </div>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/mobile/orders/${order.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 line-clamp-1">{order.projectName}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">#{order.orderCode}</div>
                </div>
                <StatusBadge
                  status={locale === 'zh' ? order.stage?.labelZh || order.stage?.label : order.stage?.labelEn || order.stage?.label}
                />
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {order.contact.company || '—'}
                </div>
                <div className="flex items-center text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {order.contact.name || '—'}
                </div>
                <div className="flex items-center text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(order.deliveryDate)}
                </div>
              </div>

              {order.rushOrder && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                    RUSH
                  </span>
                </div>
              )}
            </Link>
          ))
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status, color }: { status?: string, color?: string }) {
  if (!status) return null;

  // Default to gray if no color
  const bgColor = color || '#e2e8f0';
  // Simple brightness check or just hardcode text color
  return (
    <span
      className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-800 border border-black/5 whitespace-nowrap"
      style={{ backgroundColor: bgColor }}
    >
      {status}
    </span>
  );
}
