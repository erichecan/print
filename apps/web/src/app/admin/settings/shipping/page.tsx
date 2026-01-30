'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { shippingTemplateApi, ShippingTemplate } from '@/lib/api';
import { TemplateCard } from '@/components/admin/shipping/TemplateCard';

export default function ShippingSettingsPage() {
    const [templates, setTemplates] = useState<ShippingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { templates } = await shippingTemplateApi.list(showInactive);
            setTemplates(templates);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load templates:', err);
            setError('Failed to load shipping templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, [showInactive]); // Reload when filter changes

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this shipping template?')) return;
        try {
            await shippingTemplateApi.delete(id);
            setTemplates(templates.filter((t) => t.id !== id));
        } catch (err) {
            alert('Failed to delete template');
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const { template } = await shippingTemplateApi.duplicate(id);
            // Refresh list to show duplicate
            loadTemplates();
        } catch (err) {
            alert('Failed to duplicate template');
        }
    };

    const handleToggleStatus = async (id: string, isActive: boolean) => {
        try {
            await shippingTemplateApi.update(id, { isActive });
            setTemplates(
                templates.map((t) => (t.id === id ? { ...t, isActive } : t))
            );
        } catch (err) {
            alert('Failed to update status');
        }
    };

    if (loading && templates.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shipping Configuration</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage shipping rates, zones, and rules
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link
                        href="/admin/settings/shipping/new"
                        className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Create New Template
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-end">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Show Inactive Templates</span>
                </label>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {templates.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new shipping template.</p>
                    <div className="mt-6">
                        <Link
                            href="/admin/settings/shipping/new"
                            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Create New Template
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            onToggleStatus={handleToggleStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
