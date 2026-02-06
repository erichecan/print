
import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Option {
    value: string;
    label: string;
    isAdded?: boolean; // Optional flag to show if item is already added
}

interface SearchableSelectProps {
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    emptyMessage?: string;
}

export function SearchableSelect({
    options,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className = '',
    emptyMessage = 'No options found',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter options
    const filteredOptions = useMemo(() => {
        if (!search) return options;
        const lowerSearch = search.toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(lowerSearch)
        );
    }, [options, search]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearch(''); // Reset search on close
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // When opening, focus input and clear search
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure render
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else {
            setSearch('');
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        // Keep it open? No, usually close.
        // User wants to add product. They might want to add multiple?
        // The previous behavior was <select value="" onChange> which resets immediately.
        // So selecting one adds it.
        // I should close it after selection.
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger */}
            <div
                className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white flex justify-between items-center transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-300' : 'cursor-pointer hover:border-blue-400'
                    } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className="text-gray-700 truncate">
                    {placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto flex flex-col">
                    {/* Search Input */}
                    <div className="p-2 sticky top-0 bg-white border-b border-gray-100 z-10">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Options List */}
                    <div className="py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center group transition-colors ${option.isAdded ? 'text-gray-400 bg-gray-50' : 'text-gray-700'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option.value);
                                    }}
                                >
                                    <span className="font-medium group-hover:text-blue-700">{option.label}</span>
                                    {option.isAdded && (
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">Added</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
