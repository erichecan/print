'use client';

import React, { useState, useEffect } from 'react';
import { productsApi, Product } from '@/lib/api';
import Image from 'next/image';

interface ProductSelectorProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export function ProductSelector({ selectedIds, onChange }: ProductSelectorProps) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = async (pageToLoad = 1) => {
        setLoading(true);
        try {
            const response: any = await productsApi.list({
                limit: 20,
                page: pageToLoad,
                search: searchTerm
            });

            // Handle standard pagination response
            const items = response.data || response.products || response.items || response || [];
            const newProducts = Array.isArray(items) ? items : [];

            setSearchResults(newProducts);

            // Handle pagination metadata
            if (response.pagination && response.pagination.totalPages) {
                setTotalPages(response.pagination.totalPages);
            } else {
                // Fallback if no total pages (mock it or infer)
                // If we got full page, assume there's at least one more? 
                // But simplified logic: just keep current totalPages if not provided, or set based on items length
                if (newProducts.length === 0 && pageToLoad > 1) {
                    // We apparently went too far? 
                }
                // Without explicit total, simple numeric pagination is hard. 
                // But we verified backend HAS pagination.
            }

            setPage(pageToLoad);
            setHasMore(newProducts.length === 20); // Legacy check
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setHasMore(true);
            fetchProducts(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);



    const toggleProduct = (productId: string) => {
        if (selectedIds.includes(productId)) {
            onChange(selectedIds.filter(id => id !== productId));
        } else {
            onChange([...selectedIds, productId]);
        }
    };

    const isSelected = (productId: string) => selectedIds.includes(productId);

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div>
                <label htmlFor="product-search" className="sr-only">Search products</label>
                <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        id="product-search"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Search products by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    {selectedIds.length} selected.
                </p>
            </div>

            {/* Pagination Controls - Numeric */}
            <div className="flex items-center justify-between rounded-t-md border border-gray-200 border-b-0 bg-gray-50 px-4 py-3">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            {/* Previous */}
                            <button
                                type="button"
                                onClick={() => fetchProducts(Math.max(1, page - 1))}
                                disabled={page === 1 || loading}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                // Logic to show window around current page if totalPages is large
                                // For simplicity and requested "1,2,3,4,5,6,7", let's just show first 7 or sliding window?
                                // User asked "1,2,3,4,5,6,7".
                                // Let's try to center the current page.
                                let pNum = i + 1;
                                if (totalPages > 7) {
                                    if (page > 4) {
                                        pNum = page - 3 + i;
                                    }
                                    if (pNum > totalPages) return null; // Should not happen with correct math but safety
                                }

                                // Better simple logic for limited window:
                                // If totalPages <= 7, show all.
                                // If totalPages > 7, show start, end, and around current? 
                                // Or just simple sliding:
                                let showPage = false;
                                const startPage = Math.max(1, Math.min(page - 3, totalPages - 6));
                                const pToRender = startPage + i;

                                if (pToRender > totalPages) return null;

                                return (
                                    <button
                                        key={pToRender}
                                        type="button"
                                        onClick={() => fetchProducts(pToRender)}
                                        aria-current={page === pToRender ? 'page' : undefined}
                                        className={`relative z-10 inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${page === pToRender
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pToRender}
                                    </button>
                                );
                            })}

                            {/* Next */}
                            <button
                                type="button"
                                onClick={() => fetchProducts(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || loading}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Product List */}
            <div className="max-h-96 overflow-y-auto rounded-b-md border border-gray-200 bg-white">
                {searchResults.length === 0 && !loading ? (
                    <div className="p-8 text-center text-gray-500">
                        No products found matching "{searchTerm}"
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {searchResults.map((product) => (
                            <li
                                key={product.id}
                                className={`flex cursor-pointer items-center p-3 hover:bg-gray-50 ${isSelected(product.id) ? 'bg-blue-50' : ''}`}
                                onClick={() => toggleProduct(product.id)}
                            >
                                <div className="flex h-5 items-center">
                                    <input
                                        type="checkbox"
                                        checked={isSelected(product.id)}
                                        onChange={() => { }} // Handled by li onClick
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="ml-3 flex flex-1 items-center">
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                                        {product.images && product.images.length > 0 ? (
                                            <Image
                                                src={product.images[0].url}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="40px"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                                No Img
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <p className={`text-sm font-medium ${isSelected(product.id) ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {product.sku ? (
                                                <span className="font-mono text-gray-600">SKU: {product.sku}</span>
                                            ) : product.variants && product.variants.length > 0 ? (
                                                <span className="italic text-gray-500">
                                                    {product.variants.length === 1
                                                        ? `SKU: ${product.variants[0].sku}`
                                                        : `${product.variants.length} Variants`}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">No SKU</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Selected Summary (Chips) */}
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600 self-center">Selected:</span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {selectedIds.length} items
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs text-red-600 hover:text-red-800"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
