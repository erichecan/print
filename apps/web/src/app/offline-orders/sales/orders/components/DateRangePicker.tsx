/**
 * Date Range Picker Component
 * A custom date range picker with calendar UI and quick presets
 */
'use client';

import { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (start: Date | null, end: Date | null) => void;
    onClose?: () => void;
    locale?: 'en' | 'zh';
}

export function DateRangePicker({
    startDate,
    endDate,
    onChange,
    onClose,
    locale = 'en'
}: DateRangePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectingStart, setSelectingStart] = useState(true);
    const pickerRef = useRef<HTMLDivElement>(null);

    const t = (key: string) => {
        const translations: Record<string, Record<string, string>> = {
            en: {
                startDate: 'Start Date',
                endDate: 'End Date',
                today: 'Today',
                last7Days: 'Last 7 Days',
                last30Days: 'Last 30 Days',
                thisMonth: 'This Month',
                clear: 'Clear',
                apply: 'Apply',
                cancel: 'Cancel',
            },
            zh: {
                startDate: '开始日期',
                endDate: '结束日期',
                today: '今天',
                last7Days: '最近7天',
                last30Days: '最近30天',
                thisMonth: '本月',
                clear: '清除',
                apply: '应用',
                cancel: '取消',
            }
        };
        return translations[locale]?.[key] || translations.en[key] || key;
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const handleDateClick = (day: number) => {
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        if (selectingStart) {
            onChange(selectedDate, endDate && selectedDate <= endDate ? endDate : null);
            setSelectingStart(false);
        } else {
            if (startDate && selectedDate >= startDate) {
                onChange(startDate, selectedDate);
            } else {
                onChange(selectedDate, null);
                setSelectingStart(false);
            }
        }
    };

    const handlePreset = (preset: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let start: Date, end: Date;

        switch (preset) {
            case 'today':
                start = end = today;
                break;
            case 'last7Days':
                end = today;
                start = new Date(today);
                start.setDate(start.getDate() - 6);
                break;
            case 'last30Days':
                end = today;
                start = new Date(today);
                start.setDate(start.getDate() - 29);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;
            default:
                return;
        }

        onChange(start, end);
        setSelectingStart(true);
    };

    const handleClear = () => {
        onChange(null, null);
        setSelectingStart(true);
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const monthNames = locale === 'zh'
        ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayNames = locale === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const isDateInRange = (day: number) => {
        if (!startDate || !endDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date >= startDate && date <= endDate;
    };

    const isDateSelected = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = date.toDateString();
        return dateStr === startDate?.toDateString() || dateStr === endDate?.toDateString();
    };

    return (
        <div
            ref={pickerRef}
            className="absolute z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 min-w-[320px]"
            style={{
                backdropFilter: 'blur(10px)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
            }}
        >
            {/* Quick Presets */}
            <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => handlePreset('today')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                >
                    {t('today')}
                </button>
                <button
                    type="button"
                    onClick={() => handlePreset('last7Days')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                >
                    {t('last7Days')}
                </button>
                <button
                    type="button"
                    onClick={() => handlePreset('last30Days')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                >
                    {t('last30Days')}
                </button>
                <button
                    type="button"
                    onClick={() => handlePreset('thisMonth')}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                >
                    {t('thisMonth')}
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-sm font-semibold text-slate-900">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                    </div>
                ))}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = isDateSelected(day);
                    const isInRange = isDateInRange(day);

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleDateClick(day)}
                            className={`
                aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                ${isSelected
                                    ? 'bg-indigo-600 text-white font-semibold shadow-md'
                                    : isInRange
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-slate-700 hover:bg-slate-100'
                                }
              `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Selected Range Display */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t('startDate')}:</span>
                    <span className="font-medium text-slate-900">
                        {startDate ? startDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '—'}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-600">{t('endDate')}:</span>
                    <span className="font-medium text-slate-900">
                        {endDate ? endDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '—'}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    {t('clear')}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md"
                >
                    {t('apply')}
                </button>
            </div>
        </div>
    );
}
