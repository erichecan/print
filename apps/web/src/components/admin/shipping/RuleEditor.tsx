import React, { useState, useEffect } from 'react';
import { ShippingRule } from '@/lib/api';
import { GeographicSelector } from './GeographicSelector';

interface RuleEditorProps {
    rule: ShippingRule;
    onChange: (updatedRule: ShippingRule) => void;
    onDelete: () => void;
    index: number;
    lockedCountry?: string | null;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({
    rule,
    onChange,
    onDelete,
    index,
    lockedCountry,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Helper to update specific fields
    const updateField = (field: keyof ShippingRule, value: any) => {
        onChange({
            ...rule,
            [field]: value,
        });
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div
                className="flex cursor-pointer items-center justify-between rounded-t-lg bg-gray-50 px-4 py-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {index + 1}
                    </span>
                    <span className="font-medium text-gray-700">
                        {rule.shippingMethod === 'standard' ? 'Standard' : 'Express'} Shipping
                        {/* Display locked country if set, otherwise rule country */}
                        {(lockedCountry || rule.country) && ` - ${(lockedCountry || rule.country) === 'ALL'
                                ? 'All Countries'
                                : (lockedCountry === 'US' ? 'United States' : (lockedCountry === 'CA' ? 'Canada' : (lockedCountry || rule.country)))
                            }`}
                        {rule.isFreeShipping && ' (Free)'}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="space-y-6 p-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Geographic Conditions */}
                        <div className="lg:col-span-2">
                            <h4 className="mb-2 text-sm font-semibold text-gray-900">Geographic Conditions</h4>
                            <GeographicSelector
                                country={lockedCountry || rule.country}
                                provinces={rule.provinces}
                                postalCodePattern={rule.postalCodePattern}
                                onChange={(updates) => onChange({ ...rule, ...updates })}
                                lockedCountry={lockedCountry}
                            />
                        </div>

                        {/* Time Conditions */}
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-gray-900">Time Conditions (Optional)</h4>
                            <div className="space-y-4 rounded-md border border-gray-200 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Start Date</label>
                                        <input
                                            type="date"
                                            value={rule.startDate ? rule.startDate.split('T')[0] : ''}
                                            onChange={(e) => updateField('startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">End Date</label>
                                        <input
                                            type="date"
                                            value={rule.endDate ? rule.endDate.split('T')[0] : ''}
                                            onChange={(e) => updateField('endDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Season Tag</label>
                                    <input
                                        type="text"
                                        value={rule.seasonTag || ''}
                                        onChange={(e) => updateField('seasonTag', e.target.value || null)}
                                        placeholder="e.g. winter, holiday"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Order Conditions */}
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-gray-900">Order Conditions (Optional)</h4>
                            <div className="space-y-4 rounded-md border border-gray-200 p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Min Order ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={rule.minOrderAmount ?? ''}
                                            onChange={(e) => updateField('minOrderAmount', e.target.value ? parseFloat(e.target.value) : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Max Order ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={rule.maxOrderAmount ?? ''}
                                            onChange={(e) => updateField('maxOrderAmount', e.target.value ? parseFloat(e.target.value) : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Min Weight (kg)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={rule.minWeight ?? ''}
                                            onChange={(e) => updateField('minWeight', e.target.value ? parseFloat(e.target.value) : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Max Weight (kg)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={rule.maxWeight ?? ''}
                                            onChange={(e) => updateField('maxWeight', e.target.value ? parseFloat(e.target.value) : null)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Options */}
                        <div className="lg:col-span-2">
                            <h4 className="mb-2 text-sm font-semibold text-gray-900">Shipping Options</h4>
                            <div className="rounded-md border border-gray-200 bg-blue-50 p-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Method</label>
                                        <select
                                            value={rule.shippingMethod}
                                            onChange={(e) => updateField('shippingMethod', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="express">Express</option>
                                            <option value="rush">Rush</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Cost ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={rule.cost}
                                            disabled={rule.isFreeShipping}
                                            onChange={(e) => updateField('cost', parseFloat(e.target.value))}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Est. Days</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={rule.estimatedDays}
                                            onChange={(e) => updateField('estimatedDays', parseInt(e.target.value))}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={rule.isFreeShipping}
                                                onChange={(e) => {
                                                    onChange({
                                                        ...rule,
                                                        isFreeShipping: e.target.checked,
                                                        cost: e.target.checked ? 0 : rule.cost,
                                                    });
                                                }}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Free Shipping</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
