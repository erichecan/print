import React from 'react';
import Link from 'next/link';
import { ShippingTemplate } from '@/lib/api';

interface TemplateCardProps {
    template: ShippingTemplate;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string, isActive: boolean) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onDuplicate,
    onDelete,
    onToggleStatus,
}) => {
    const isActive = template.isActive;
    const isExpired = template.endDate && new Date(template.endDate) < new Date();

    return (
        <div className={`relative flex flex-col justify-between rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md ${isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'}`}>

            {/* Priority Badge */}
            <div className="absolute top-4 right-4 flex space-x-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Priority: {template.priority}
                </span>
                {isExpired && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Expired
                    </span>
                )}
            </div>

            <div>
                <div className="mb-4">
                    <Link
                        href={`/admin/settings/shipping/${template.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                        {template.name}
                    </Link>
                    {template.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
                    )}
                </div>

                <div className="space-y-2">
                    {/* Rules Summary */}
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>{template._count?.rules || template.rules?.length || 0} Rules defined</span>
                    </div>

                    {/* Products Summary */}
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>
                            {template._count?.products || template.products?.length
                                ? `${template._count?.products || template.products?.length} Products linked`
                                : 'Applies to all products (General)'}
                        </span>
                    </div>

                    {/* Date Range */}
                    {(template.startDate || template.endDate) && (
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                                {template.startDate ? new Date(template.startDate).toLocaleDateString() : 'Start'}
                                {' - '}
                                {template.endDate ? new Date(template.endDate).toLocaleDateString() : 'End'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                {/* Status Toggle */}
                <label className="flex cursor-pointer items-center">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={isActive}
                            onChange={() => onToggleStatus(template.id, !isActive)}
                        />
                        <div className={`block h-6 w-10 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${isActive ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </label>

                {/* Actions */}
                <div className="flex space-x-2">
                    <button
                        onClick={() => onDuplicate(template.id)}
                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Duplicate"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <Link
                        href={`/admin/settings/shipping/${template.id}`}
                        className="rounded p-2 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </Link>
                    <button
                        onClick={() => onDelete(template.id)}
                        className="rounded p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
