'use client';

import { useState, useCallback, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
    adminOfflineOrdersApi,
    AdminOfflineOrderDetail,
    OfflineOrderHistoryEntry,
    ProductionWorkOrderPayload
} from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
});

function formatDate(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return dateFormatter.format(date);
}

function toInputDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

export default function MobileOrderDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { t, locale } = useAdminI18n();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [noteDraft, setNoteDraft] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showProductionEdit, setShowProductionEdit] = useState(false);

    // Fetch detail
    const {
        data: detailWrapper,
        error,
        isLoading,
        mutate
    } = useSWR(['admin-offline-orders-detail', id],
        () => adminOfflineOrdersApi.get(id)
    );

    const order = detailWrapper?.order;

    // Add Note Handler
    const handleAddNote = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!id || !noteDraft.trim()) return;
            try {
                await adminOfflineOrdersApi.addNote(id, noteDraft.trim());
                setNoteDraft('');
                mutate();
            } catch (error) {
                console.error(error);
                alert((error as Error).message);
            }
        },
        [noteDraft, id, mutate]
    );

    // Upload Assets Handler
    const handleUploadAssets = useCallback(
        async (files: FileList | null) => {
            if (!id || !files?.length) return;
            try {
                setUploading(true);
                await adminOfflineOrdersApi.uploadAssets(id, Array.from(files));
                mutate();
            } catch (error) {
                console.error(error);
                alert((error as Error).message);
            } finally {
                setUploading(false);
            }
        },
        [id, mutate]
    );

    // Production Stage Update (Simple Version for Mobile)
    const handleStageChange = useCallback(
        async (stageKey: string) => {
            try {
                await adminOfflineOrdersApi.updateStage(id, { stageKey });
                mutate();
            } catch (error) {
                console.error(error);
                alert((error as Error).message);
            }
        },
        [id, mutate]
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-slate-500 text-sm">{t('loadingOrderDetail')}</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-6 rounded-xl shadow-sm text-center max-w-sm w-full">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('errorCantLoadOrder')}</h3>
                    <p className="text-sm text-gray-500 mb-4">{t('errorOrderNotFound')}</p>
                    <button
                        onClick={() => router.back()}
                        className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg active:bg-gray-200 transition-colors"
                    >
                        {t('btnBack')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            {/* Mobile Header */}
            <header className="sticky top-0 bg-white border-b border-gray-200 z-30 px-4 py-3 shadow-sm flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full active:scale-95 transition-transform"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-slate-900 truncate">
                        {order.projectName}
                    </h1>
                    <p className="text-xs text-slate-500">#{order.orderCode}</p>
                </div>
                <StatusBadge
                    status={locale === 'zh' ? order.stage?.labelZh || order.stage?.label : order.stage?.labelEn || order.stage?.label}
                    color={order.stage?.color}
                />
            </header>

            <main className="p-4 space-y-5">

                {/* Customer Card */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 border-l-4 border-blue-500 pl-2 uppercase tracking-wide">
                        {t('customerInfo')}
                    </h2>
                    <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                        <span className="text-gray-500">{t('thCustomer')}:</span>
                        <span className="font-medium text-gray-900">{order.contact.name || '—'}</span>

                        <span className="text-gray-500">{t('company')}:</span>
                        <span className="font-medium text-gray-900">{order.contact.company || '—'}</span>

                        <span className="text-gray-500">{t('email')}:</span>
                        <a href={`mailto:${order.contact.email}`} className="text-blue-600 truncate">{order.contact.email || '—'}</a>

                        <span className="text-gray-500">{t('phone')}:</span>
                        <a href={`tel:${order.contact.phone}`} className="text-blue-600">{order.contact.phone || '—'}</a>
                    </div>
                </section>

                {/* Payment & Billing */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 border-l-4 border-green-500 pl-2 uppercase tracking-wide">
                        {t('paymentInfo')}
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">{t('paymentMethod')}</span>
                            <span className="font-medium">{order.payment?.method || '—'}</span>
                        </div>
                        {order.payment?.referenceNumber && (
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">{t('referenceNumber')}</span>
                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{order.payment.referenceNumber}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-gray-500">{t('depositAmount')}</span>
                            <span className="text-green-600 font-bold text-base">${order.payment?.depositAmount?.toFixed(2) || '0.00'}</span>
                        </div>
                        {Number(order.payment?.dstFileFee) > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">{t('dstFileFee')}</span>
                                <span className="text-gray-900">${order.payment?.dstFileFee?.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Status & Production */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 border-l-4 border-purple-500 pl-2 uppercase tracking-wide">
                        {t('productionInfo')}
                    </h2>

                    {/* Simple Stage Selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('thStage')}</label>
                        <div className="relative">
                            <select
                                value={order.stage?.key || ''}
                                onChange={(e) => handleStageChange(e.target.value)}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-3 pr-8 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {/* We don't have stages list here easily, simplified or reuse if needed. 
                            Actually AdminOfflineOrderDetail doesn't include full stage list.
                            We might need to fetch stages? Or just show current stage text for now.
                            Let's keep it read-only mostly if we can't easily get stages list without extra fetch.
                        */}
                                <option value={order.stage?.key || ''}>{locale === 'zh' ? order.stage?.labelZh || order.stage?.label : order.stage?.labelEn || order.stage?.label}</option>
                            </select>
                            {/* For a real edit, we'd need the stages list. Skip edit for MVP unless critical. */}
                            <div className="absolute right-3 top-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                            <span className="block text-xs text-gray-500 mb-1">{t('thDueDate')}</span>
                            <span className="font-medium text-gray-900">{formatDate(order.productionWorkOrder?.dueDate || order.deliveryDate)}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 mb-1">{t('thPriority')}</span>
                            <span className={`font-bold ${order.rushOrder ? 'text-red-500' : 'text-gray-700'}`}>
                                {order.rushOrder ? 'RUSH' : 'Standard'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Notes Timeline */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 border-l-4 border-orange-500 pl-2 uppercase tracking-wide">
                        {t('notes')} & {t('timeline')}
                    </h2>

                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="mb-6">
                        <div className="relative">
                            <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Add internal note..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                            />
                            <button
                                type="submit"
                                disabled={!noteDraft.trim()}
                                className="absolute bottom-2 right-2 p-1.5 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </form>

                    {/* Timeline List */}
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        {/* Combine histories and events if possible, or just histories */}
                        {(order.histories || []).map((history) => (
                            <div key={history.id} className="relative">
                                <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 bg-slate-200 border-2 border-white rounded-full ring-1 ring-slate-100"></div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start mb-1 text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700">{history.actorName || 'System'}</span>
                                        <span>{formatDate(history.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 break-words">
                                        {history.note || (
                                            <span className="italic text-gray-500">
                                                {t('movedTo')} {locale === 'zh' ? history.toStageKey : history.toStageKey}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Upload Assets */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 pb-20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-900 border-l-4 border-gray-500 pl-2 uppercase tracking-wide">
                            {t('assets')}
                        </h2>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full active:bg-gray-200"
                        >
                            {uploading ? 'Uploading...' : '+ Upload'}
                        </button>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => handleUploadAssets(e.target.files)}
                        />
                    </div>

                    {(!order.assets || order.assets.length === 0) ? (
                        <div className="text-center py-6 bg-slate-50 rounded-lg text-xs text-gray-400 border border-dashed border-gray-200">
                            No assets attached
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {order.assets.map((asset) => (
                                <a
                                    key={asset.id}
                                    href={asset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg active:bg-blue-50 transition-colors"
                                >
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{asset.fileName}</p>
                                        <p className="text-xs text-gray-500">{formatDate(asset.uploadedAt)}</p>
                                    </div>
                                    <div className="text-gray-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}

function StatusBadge({ status, color }: { status?: string, color?: string }) {
    if (!status) return null;
    return (
        <span
            className="px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 border border-black/5 whitespace-nowrap"
            style={{ backgroundColor: color || '#e2e8f0' }}
        >
            {status}
        </span>
    );
}
