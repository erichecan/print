import React, { useState, useEffect } from 'react';
import { ShippingRule } from '@/lib/api';
import { GeographicSelector } from './GeographicSelector';

interface ShippingPreviewProps {
    rules: ShippingRule[];
}

export const ShippingPreview: React.FC<ShippingPreviewProps> = ({ rules }) => {
    const [cartValue, setCartValue] = useState<number>(50);
    const [cartWeight, setCartWeight] = useState<number>(0.5);
    const [country, setCountry] = useState<string | null>('CA');
    const [provinces, setProvinces] = useState<string[]>([]); // Although we select one destination, selector uses array
    const [postalCode, setPostalCode] = useState<string>('');

    const [matchedRule, setMatchedRule] = useState<ShippingRule | null>(null);

    // Calculate match whenever inputs change
    useEffect(() => {
        calculateShipping();
    }, [rules, cartValue, cartWeight, country, provinces, postalCode]);

    const calculateShipping = () => {
        // Simple client-side simulation of backend logic
        // Find the first rule that matches criteria
        // Rules should be sorted by priority in backend, but here we just take the first valid one from the list provided

        const destinationProvince = provinces.length > 0 ? provinces[0] : null;

        const match = rules.find(rule => {
            // 1. Geographic Check
            const regionMatch = checkRegionMatch(rule, country, destinationProvince, postalCode);
            if (!regionMatch) return false;

            // 2. Order Value Check
            if (rule.minOrderAmount !== null && rule.minOrderAmount !== undefined && cartValue < rule.minOrderAmount) return false;
            if (rule.maxOrderAmount !== null && rule.maxOrderAmount !== undefined && cartValue > rule.maxOrderAmount) return false;

            // 3. Weight Check
            if (rule.minWeight !== null && rule.minWeight !== undefined && cartWeight < rule.minWeight) return false;
            if (rule.maxWeight !== null && rule.maxWeight !== undefined && cartWeight > rule.maxWeight) return false;

            return true;
        });

        setMatchedRule(match || null);
    };

    const checkRegionMatch = (rule: ShippingRule, c: string | null, p: string | null, zip: string) => {
        // Country
        if (rule.country !== 'ALL' && rule.country !== c) {
            // Special case: INTL covers everything not US/CA? Or just "International" code? 
            // In our system 'INTL' usually means "Not US or CA" or specifically "International" selection.
            // If rule.country is INTL and c is CA, it's NOT a match.
            // If rule.country is ALL, it matches everything.
            return false;
        }

        // Provinces
        if (rule.provinces && rule.provinces.length > 0) {
            if (!p || !rule.provinces.includes(p)) return false;
        }

        // Postal Code (Simplified prefix check)
        if (rule.postalCodePattern) {
            const pattern = rule.postalCodePattern.replace('*', '');
            if (!zip.startsWith(pattern)) return false;
        }

        return true;
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Rate Calculator Preview</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cart Total ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={cartValue}
                            onChange={(e) => setCartValue(parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Total Weight (kg)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={cartWeight}
                            onChange={(e) => setCartWeight(parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                        <div className="rounded-md bg-gray-50 p-3">
                            <GeographicSelector
                                country={country}
                                provinces={provinces}
                                postalCodePattern={postalCode}
                                onChange={(update) => {
                                    if (update.country !== undefined) setCountry(update.country);
                                    if (update.provinces !== undefined) setProvinces(update.provinces);
                                    if (update.postalCodePattern !== undefined) setPostalCode(update.postalCodePattern || '');
                                }}
                                className="scale-90 origin-top-left" // Make it slightly smaller
                            />
                        </div>
                    </div>
                </div>

                {/* Result */}
                <div className="flex flex-col justify-center items-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Estimated Shipping</span>

                    {matchedRule ? (
                        <div className="mt-4 text-center">
                            <div className="text-4xl font-extrabold text-gray-900">
                                {matchedRule.isFreeShipping ? 'FREE' : `$${Number(matchedRule.cost ?? 0).toFixed(2)}`}
                            </div>
                            <div className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                {matchedRule.shippingMethod === 'standard' ? 'Standard' : 'Express'}
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                {matchedRule.estimatedDays} Business Days
                            </p>
                            <p className="mt-4 text-xs text-gray-400">
                                Matched Rule: {matchedRule.country || 'Global'} / {matchedRule.shippingMethod}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 text-center text-gray-400">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="mt-2">No matching rule found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
