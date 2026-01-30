import React, { useMemo } from 'react';

interface GeographicSelectorProps {
    country: string | null;
    provinces: string[];
    postalCodePattern: string | null;
    onChange: (updates: { country?: string | null; provinces?: string[]; postalCodePattern?: string | null }) => void;
    className?: string;
    lockedCountry?: string | null;
}

const COUNTRIES = [
    { code: 'CA', name: 'Canada' },
];

const PROVINCES_CA = [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
];



export const GeographicSelector: React.FC<GeographicSelectorProps> = ({
    country,
    provinces,
    postalCodePattern,
    onChange,
    className = '',
    lockedCountry,
}) => {
    // Force country if locked
    const effectiveCountry = lockedCountry || country;

    const availableProvinces = useMemo(() => {
        if (effectiveCountry === 'CA') return PROVINCES_CA;
        return [];
    }, [effectiveCountry]);

    const toggleProvince = (code: string) => {
        const newProvinces = provinces.includes(code)
            ? provinces.filter((p) => p !== code)
            : [...provinces, code];
        onChange({ provinces: newProvinces });
    };

    const selectAllProvinces = () => {
        const all = availableProvinces.map((p) => p.code);
        onChange({ provinces: all });
    };

    const clearProvinces = () => {
        onChange({ provinces: [] });
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Country Selector - Hidden if locked */}
                {!lockedCountry && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Country / Region</label>
                        <select
                            value={effectiveCountry || 'ALL'}
                            onChange={(e) => {
                                const val = e.target.value;
                                onChange({
                                    country: val === 'ALL' ? null : val,
                                    provinces: [], // Clear provinces when country changes
                                });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Postal Code Pattern */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Postal Code (Optional)
                    </label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                        <input
                            type="text"
                            value={postalCodePattern || ''}
                            onChange={(e) => onChange({ postalCodePattern: e.target.value || null })}
                            placeholder={country === 'US' ? '902*' : 'M5V*'}
                            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-400 sm:text-sm">Use * for wildcard</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Province Selector (Only for CA/US) */}
            {availableProvinces.length > 0 && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                            Select {country === 'CA' ? 'Provinces' : 'States'} (Leave empty for all)
                        </label>
                        <div className="space-x-2 text-xs">
                            <button
                                type="button"
                                onClick={selectAllProvinces}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                Select All
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                type="button"
                                onClick={clearProvinces}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {availableProvinces.map((prov) => (
                            <label key={prov.code} className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={provinces.includes(prov.code)}
                                    onChange={() => toggleProvince(prov.code)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate" title={prov.name}>
                                    {prov.code}
                                </span>
                            </label>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        {provinces.length === 0
                            ? `All ${country === 'CA' ? 'provinces' : 'states'} included`
                            : `${provinces.length} selected`}
                    </p>
                </div>
            )}
        </div>
    );
};
