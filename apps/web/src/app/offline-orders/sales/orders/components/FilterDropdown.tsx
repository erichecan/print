'use client';

import { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    color?: string; // CSS classes for badges/colors
}

interface FilterDropdownProps {
    title: string;
    icon?: React.ReactNode;
    options: DropdownOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    // Optional: Custom rendering for the trigger button content
    renderTrigger?: (selectedValues: string[]) => React.ReactNode;
}

export function FilterDropdown({
    title,
    icon,
    options,
    selectedValues,
    onChange,
    renderTrigger
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        const newValues = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newValues);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                    ${selectedValues.length > 0
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }
                `}
            >
                {icon}
                <span>{title}</span>
                {selectedValues.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center bg-indigo-200 text-indigo-800 text-[10px] font-bold h-5 w-5 rounded-full">
                        {selectedValues.length}
                    </span>
                )}
                <svg
                    className={`w-4 h-4 ml-1 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {options.length === 0 ? (
                            <p className="text-sm text-slate-500 italic p-2">No options available</p>
                        ) : (
                            options.map(option => (
                                <label
                                    key={option.value}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
                                        ${selectedValues.includes(option.value) ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedValues.includes(option.value)}
                                        onChange={() => toggleOption(option.value)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                        {option.icon && <span>{option.icon}</span>}
                                        <span className={`text-sm ${selectedValues.includes(option.value) ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                                            {option.label}
                                        </span>
                                        {option.color && (
                                            <span className={`ml-auto w-2 h-2 rounded-full ${option.color.replace(/text-[\w-]+|border-[\w-]+/g, '')}`} />
                                        )}
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                    {selectedValues.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded text-center transition-colors"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
