'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shippingTemplateApi, ShippingTemplatePayload, ShippingRule } from '@/lib/api';
import { RuleEditor } from '@/components/admin/shipping/RuleEditor';
import { ProductSelector } from '@/components/admin/shipping/ProductSelector';
import { ShippingPreview } from '@/components/admin/shipping/ShippingPreview';



export default function ShippingTemplateEditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    // Next.js 14: params is an object, not a promise
    const id = params.id;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<'CA'>('CA');

    const [formData, setFormData] = useState<ShippingTemplatePayload>({
        name: '',
        description: '',
        priority: 50,
        isActive: true,
        startDate: null,
        endDate: null,
        rules: [],
        productIds: [],
    });

    useEffect(() => {
        if (!isNew) {
            loadTemplate(id);
        }
    }, [id, isNew]);

    const loadTemplate = async (templateId: string) => {
        try {
            const { template } = await shippingTemplateApi.get(templateId);
            setFormData({
                name: template.name,
                description: template.description,
                priority: template.priority,
                isActive: template.isActive,
                startDate: template.startDate,
                endDate: template.endDate,
                rules: template.rules,
                productIds: template.products?.map(p => p.productId) || [],
            });

            // Infer region from existing rules (Default to CA)
            // if (template.rules.length > 0) {
            //    const firstRuleCountry = template.rules[0].country;
            //    // Simplified to always use CA as per requirements
            // }
            setSelectedRegion('CA');
        } catch (err) {
            setError('Failed to load template');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (isNew) {
                await shippingTemplateApi.create(formData);
            } else {
                await shippingTemplateApi.update(id, formData);
            }
            router.push('/admin/settings/shipping');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save template');
            setSaving(false);
        }
    };

    const addRule = () => {
        const newRule: ShippingRule = {
            country: selectedRegion, // Default to selected region
            provinces: [],
            postalCodePattern: null,
            startDate: null,
            endDate: null,
            seasonTag: null,
            minOrderAmount: null,
            maxOrderAmount: null,
            minWeight: null,
            maxWeight: null,
            shippingMethod: 'standard', // Default
            estimatedDays: 7,
            cost: 15.00,
            isFreeShipping: false,
        };

        setFormData({
            ...formData,
            rules: [...formData.rules, newRule],
        });
    };

    const updateRule = (index: number, updatedRule: ShippingRule) => {
        const newRules = [...formData.rules];
        newRules[index] = updatedRule;
        setFormData({ ...formData, rules: newRules });
    };

    const deleteRule = (index: number) => {
        const newRules = formData.rules.filter((_, i) => i !== index);
        setFormData({ ...formData, rules: newRules });
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNew ? 'Create Shipping Template' : 'Edit Shipping Template'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Configure shipping rates and rules for specific regions or products.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Link
                        href="/admin/settings/shipping"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {/* Basic Info */}
            <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Template Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="e.g. Standard Shipping, Heavy Items"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Priority (1-100)
                            <span className="ml-1 text-xs text-gray-500 font-normal">
                                Higher priority checks first
                            </span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>

                    <div className="flex items-center pt-6">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Active</span>
                        </label>
                    </div>
                </div>
            </div>



            {/* Associated Products */}
            <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                <h2 className="text-lg font-medium text-gray-900">Associated Products (Optional)</h2>
                <p className="text-sm text-gray-500">
                    If products are selected, this template will trigger when these products are in the cart.
                    Otherwise, it acts as a general template.
                </p>
                <div className="border-t border-gray-200 pt-4">
                    <ProductSelector
                        selectedIds={formData.productIds || []}
                        onChange={(ids) => setFormData({ ...formData, productIds: ids })}
                    />
                </div>
            </div>

            {/* Rules */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Shipping Rules</h2>
                    <button
                        type="button"
                        onClick={addRule}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Rule
                    </button>
                </div>

                {formData.rules.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                        <p className="text-gray-500">No rules defined yet. Add a rule to define shipping rates.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {formData.rules.map((rule, index) => {
                            // Check if rule matches current region (soft check for UI warning)
                            // Since strict CA only, any rule not CA is mismatch
                            const isMismatch = rule.country && rule.country !== 'CA';
                            return (
                                <div key={index} className={isMismatch ? "opacity-75" : ""}>
                                    {isMismatch && (
                                        <div className="mb-1 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700">
                                            Warning: This rule (Country: {rule.country || 'Any'}) does not match the selected region (Canada).
                                            It is recommended to remove it.
                                        </div>
                                    )}
                                    <RuleEditor
                                        index={index}
                                        rule={{ ...rule, country: rule.country || selectedRegion }} // Ensure country is set for display if null
                                        onChange={(updatedRule) => updateRule(index, updatedRule)}
                                        onDelete={() => deleteRule(index)}
                                        lockedCountry={selectedRegion}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Preview */}
            <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                <h2 className="text-lg font-medium text-gray-900">Preview Calculator</h2>
                <p className="text-sm text-gray-500">
                    Test your shipping rules against different scenarios.
                </p>
                <div className="border-t border-gray-200 pt-4">
                    <ShippingPreview rules={formData.rules} />
                </div>
            </div>
        </form>
    );
}
