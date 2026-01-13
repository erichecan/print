'use client';

import { useState, useEffect, useRef } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { FilterDropdown, DropdownOption } from './FilterDropdown';

export interface FilterOptions {
    statuses: string[];
    paymentStatuses: string[];
    printMethods: string[];
    dateRange: { start: Date | null; end: Date | null };
}

interface FilterPanelProps {
    filters: FilterOptions;
    onChange: (filters: FilterOptions) => void;
    availablePrintMethods: string[];
    locale?: 'en' | 'zh';
}

export function FilterPanel({
    filters,
    onChange,
    availablePrintMethods,
    locale = 'en'
}: FilterPanelProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const t = (key: string) => {
        const translations: Record<string, Record<string, string>> = {
            en: {
                orderStatus: 'Status',
                paymentStatus: 'Payment',
                printMethod: 'Method',
                dateRange: 'Date',
                active: 'ACTIVE',
                activeRush: 'ACTIVE (RUSH)',
                printed: 'PRINTED',
                completed: 'COMPLETED',
                cancelled: 'CANCELLED',
                hasDeposit: 'Has Deposit',
                noDeposit: 'No Deposit',
                fullyPaid: 'Fully Paid',
                balanceDue: 'Balance Due',
                selectDateRange: 'Select Date',
                selected: 'Selected',
                clearAll: 'Clear All',
            },
            zh: {
                orderStatus: '状态',
                paymentStatus: '付款',
                printMethod: '工艺',
                dateRange: '日期',
                active: '进行中',
                activeRush: '加急',
                printed: '已印刷',
                completed: '已完成',
                cancelled: '已取消',
                hasDeposit: '已付定金',
                noDeposit: '未付定金',
                fullyPaid: '已结清',
                balanceDue: '有余额',
                selectDateRange: '选择日期',
                selected: '已选',
                clearAll: '清除全部',
            }
        };
        return translations[locale]?.[key] || translations.en[key] || key;
    };

    // Close DatePicker on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const statusOptions: DropdownOption[] = [
        { value: 'ACTIVE', label: t('active'), color: 'bg-green-500' },
        { value: 'ACTIVE_RUSH', label: t('activeRush'), color: 'bg-orange-500' },
        { value: 'PRINTED', label: t('printed'), color: 'bg-blue-500' },
        { value: 'COMPLETED', label: t('completed'), color: 'bg-indigo-500' },
        { value: 'CANCELLED', label: t('cancelled'), color: 'bg-red-500' },
    ];

    const paymentStatusOptions: DropdownOption[] = [
        { value: 'hasDeposit', label: t('hasDeposit'), icon: '💰' },
        { value: 'noDeposit', label: t('noDeposit'), icon: '❌' },
        { value: 'fullyPaid', label: t('fullyPaid'), icon: '✅' },
        { value: 'balanceDue', label: t('balanceDue'), icon: '📊' },
    ];

    const printMethodOptions: DropdownOption[] = availablePrintMethods.map(method => ({
        value: method,
        label: method
    }));

    const handleStatusChange = (newStatuses: string[]) => {
        onChange({ ...filters, statuses: newStatuses });
    };

    const handlePaymentChange = (newPaymentStatuses: string[]) => {
        onChange({ ...filters, paymentStatuses: newPaymentStatuses });
    };

    const handlePrintMethodChange = (newMethods: string[]) => {
        onChange({ ...filters, printMethods: newMethods });
    };

    const handleDateRangeChange = (start: Date | null, end: Date | null) => {
        onChange({ ...filters, dateRange: { start, end } });
        // Don't close immediately to allow range adjustment
    };

    const clearAllFilters = () => {
        onChange({
            statuses: [],
            paymentStatuses: [],
            printMethods: [],
            dateRange: { start: null, end: null }
        });
    };

    const hasActiveFilters =
        filters.statuses.length > 0 ||
        filters.paymentStatuses.length > 0 ||
        filters.printMethods.length > 0 ||
        filters.dateRange.start !== null ||
        filters.dateRange.end !== null;

    const dateRangeLabel = filters.dateRange.start && filters.dateRange.end
        ? `${filters.dateRange.start.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })} - ${filters.dateRange.end.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}`
        : t('selectDateRange');

    const hasDateFilter = !!(filters.dateRange.start || filters.dateRange.end);

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdowns */}
            <FilterDropdown
                title={t('orderStatus')}
                options={statusOptions}
                selectedValues={filters.statuses}
                onChange={handleStatusChange}
                icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                }
            />

            <FilterDropdown
                title={t('paymentStatus')}
                options={paymentStatusOptions}
                selectedValues={filters.paymentStatuses}
                onChange={handlePaymentChange}
                icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                }
            />

            <FilterDropdown
                title={t('printMethod')}
                options={printMethodOptions}
                selectedValues={filters.printMethods}
                onChange={handlePrintMethodChange}
                icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                }
            />

            {/* Date Range Picker Trigger */}
            <div className="relative" ref={datePickerRef}>
                <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`
                        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                        ${hasDateFilter
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }
                    `}
                >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{dateRangeLabel}</span>
                    <svg
                        className={`w-4 h-4 ml-1 text-slate-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showDatePicker && (
                    <DateRangePicker
                        startDate={filters.dateRange.start}
                        endDate={filters.dateRange.end}
                        onChange={handleDateRangeChange}
                        onClose={() => setShowDatePicker(false)}
                        locale={locale}
                    />
                )}
            </div>

            {/* Clear All Button */}
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors ml-2 px-2 py-1 rounded hover:bg-red-50"
                >
                    {t('clearAll')}
                </button>
            )}
        </div>
    );
}

