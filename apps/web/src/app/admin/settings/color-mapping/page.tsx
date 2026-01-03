'use client';

import React, { useState, useEffect } from 'react';
import { ProductColor } from '@/lib/product-data';
import { getDefaultProductBaseImages } from '@/lib/customink-images';

export default function ColorMappingPage() {
    const [colors, setColors] = useState<ProductColor[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showTopBtn, setShowTopBtn] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ id: string, name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Initialize from API
    useEffect(() => {
        const fetchColors = async () => {
            try {
                const res = await fetch('/api/product-color-images', { cache: 'no-store' });
                if (!res.ok) throw new Error('Failed to fetch colors');
                const data = await res.json();
                setColors(data);
            } catch (error) {
                console.error('Error fetching colors:', error);
            }
        };
        fetchColors();

        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowTopBtn(true);
            } else {
                setShowTopBtn(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleHexChange = (index: number, newHex: string) => {
        const updated = [...colors];
        updated[index] = { ...updated[index], hex: newHex };
        setColors(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            // Only Update HEX mapping
            const res = await fetch('/api/product-color-images/update-mapping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ colors }),
            });

            if (!res.ok) throw new Error('Failed to update mapping file');

            setMessage('Successfully saved settings! Reloading...');

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err: any) {
            console.error(err);
            setMessage('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (id: string | undefined, name: string) => {
        if (!id) return;
        setDeleteModal({ id, name });
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        const { id, name } = deleteModal;
        setDeleting(true);

        try {
            const res = await fetch(`/api/product-color-images/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete mapping');

            setMessage(`Successfully deleted ${name}`);
            setColors(colors.filter(c => c.id !== id));
            setDeleteModal(null);
        } catch (err: any) {
            console.error(err);
            setMessage('Error: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto bg-gray-50 min-h-screen relative">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 py-4 z-10 border-b shadow-sm px-4 -mx-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Color & Image Editor</h1>
                    <p className="text-gray-500 text-sm">Review scraped images and adjust hex codes.</p>
                </div>
                <div className="flex gap-4 items-center">
                    {message && (
                        <div className={`px-4 py-2 rounded shadow-sm text-sm font-medium ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {message}
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 font-bold transition-all transform hover:scale-105 active:scale-95"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Hex Changes'}
                    </button>
                </div>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-2xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">#</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase w-48">Product Color</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase w-64">Values</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product Images (4 Views)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {colors.map((color, index) => (
                            <tr key={`${color.name}-${index}`} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-300 font-mono">{index + 1}</td>
                                <td className="px-6 py-6 whitespace-nowrap">
                                    <div className="text-sm font-black text-slate-800">{color.name}</div>
                                    {color.externalColorId && (
                                        <div className="text-[10px] text-gray-400 font-mono mt-1">ID: {color.externalColorId}</div>
                                    )}
                                </td>
                                <td className="px-6 py-6 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <input
                                                type="color"
                                                value={color.hex}
                                                onChange={(e) => handleHexChange(index, e.target.value)}
                                                className="h-10 w-10 p-0.5 border border-gray-200 rounded-lg bg-white cursor-pointer shadow-sm hover:ring-2 ring-indigo-500 transition-all"
                                            />
                                            <span className="text-[10px] text-gray-400 font-mono">{color.hex}</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={color.hex}
                                            onChange={(e) => handleHexChange(index, e.target.value)}
                                            className="border border-gray-200 rounded-lg px-3 py-2 w-28 font-mono text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="grid grid-cols-4 gap-4">
                                        {(['front', 'back', 'left_sleeve', 'right_sleeve'] as const).map(view => {
                                            // Map underscore (DB) to hyphen (Helper)
                                            const helperKey = view.replace('_', '-') as 'front' | 'back' | 'left-sleeve' | 'right-sleeve';

                                            // 1. Try Scraped Data (DB)
                                            const scrapedUrl = color.imageUrls?.[view];

                                            // 2. Try Helper Default (Local/Hardcoded)
                                            const defaultUrl = getDefaultProductBaseImages(color.name)[helperKey];

                                            const currentUrl = scrapedUrl || defaultUrl;

                                            return (
                                                <div key={view} className="flex flex-col gap-2 group/item">
                                                    <div className="relative aspect-square bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group-hover/item:border-indigo-200 transition-all">
                                                        <div className="absolute top-2 left-2 z-10">
                                                            <span className="px-2 py-0.5 bg-slate-100/90 backdrop-blur-sm text-slate-500 text-[9px] font-black uppercase rounded text-center border border-slate-200 shadow-sm">
                                                                {view.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <a href={currentUrl} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={currentUrl}
                                                                alt={`${color.name} - ${view}`}
                                                                className="w-full h-full object-contain p-2 hover:scale-110 transition-transform duration-300"
                                                                loading="lazy"
                                                            />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="px-6 py-6 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDeleteClick(color.id, color.name)}
                                        className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                                        title="Delete Mapping"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Are you sure you want to delete the mapping for <span className="font-bold text-gray-700">{deleteModal.name}</span>? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModal(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Back to Top Button */}
            {showTopBtn && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all transform hover:scale-110 active:scale-95 z-50 flex items-center justify-center group"
                    aria-label="Back to top"
                >
                    <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                    </svg>
                </button>
            )}
        </div>
    );
}
