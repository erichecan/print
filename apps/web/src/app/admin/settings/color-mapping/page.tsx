'use client';

import React, { useState, useEffect } from 'react';
import { PRODUCT_COLORS, ProductColor } from '@/lib/product-data';
import { getDefaultProductBaseImages } from '@/lib/customink-images';

export default function ColorMappingPage() {
    const [colors, setColors] = useState<ProductColor[]>([]);
    const [pendingFiles, setPendingFiles] = useState<Record<string, { front?: File; back?: File; sleeve?: File }>>({});
    const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Initialize from imported data
    useEffect(() => {
        setColors(PRODUCT_COLORS);
    }, []);

    const handleHexChange = (index: number, newHex: string) => {
        const updated = [...colors];
        updated[index] = { ...updated[index], hex: newHex };
        setColors(updated);
    };

    const handleFileChange = (colorName: string, view: 'front' | 'back' | 'sleeve', file: File | null) => {
        setPendingFiles(prev => ({
            ...prev,
            [colorName]: {
                ...prev[colorName],
                [view]: file || undefined
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            // 1. Upload pending images first
            const colorsWithFiles = Object.keys(pendingFiles);
            for (const colorName of colorsWithFiles) {
                const files = pendingFiles[colorName];
                for (const view of (['front', 'back', 'sleeve'] as const)) {
                    const file = files[view];
                    if (file) {
                        setUploadStatus(prev => ({ ...prev, [`${colorName}-${view}`]: 'Uploading...' }));
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('colorName', colorName);
                        formData.append('view', view);

                        const uploadRes = await fetch('/api/admin/product-images/upload', {
                            method: 'POST',
                            body: formData,
                        });

                        if (!uploadRes.ok) {
                            const errData = await uploadRes.json();
                            throw new Error(`Upload failed for ${colorName} ${view}: ${errData.error}`);
                        }
                        setUploadStatus(prev => ({ ...prev, [`${colorName}-${view}`]: 'Done ✅' }));
                    }
                }
            }

            // 2. Update HEX mapping
            const res = await fetch('/api/admin/product-data/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ colors }),
            });

            if (!res.ok) throw new Error('Failed to update mapping file');

            setMessage('Successfully saved! Images uploaded and mapping updated. Reloading...');

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setMessage('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 py-4 z-10 border-b">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Color & Image Editor</h1>
                    <p className="text-gray-500 text-sm">Design Lab GCS Asset Manager (Gildan Softstyle T-shirt)</p>
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
                        {saving ? 'Processing Assets...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                    <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                        Admin Instructions
                    </h3>
                    <ul className="text-sm text-indigo-700 list-disc list-inside space-y-2">
                        <li><strong>Hex Updates:</strong> Adjust color swatches instantly in the Design Lab.</li>
                        <li><strong>GCS Uploads:</strong> Select transparent PNGs for Front, Back, or Sleeve.</li>
                        <li><strong>Automatic Pathing:</strong> Files are auto-renamed and synced to GCS folders.</li>
                        <li><strong>Preview:</strong> The "Tint Preview" shows how the Hex applies to the white base image.</li>
                    </ul>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-slate-300">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                        Target GCS Path
                    </h3>
                    <div className="bg-slate-900 p-3 rounded-lg overflow-x-auto">
                        <code className="text-[11px] text-emerald-400">
                            gs://print-main-product-images/design-lab-products/gildan-softstyle-tshirt/&#123;color-slug&#125;/&#123;view&#125;-large_extended.png
                        </code>
                    </div>
                    <p className="mt-4 text-xs italic text-slate-500">Note: Existing files in GCS will be overwritten on Save.</p>
                </div>
            </div>

            <div className="overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product Color</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Values</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Visuals</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-widest">GCS Image Assets</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {colors.map((color, index) => (
                            <tr key={`${color.name}-${index}`} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-8 whitespace-nowrap text-sm text-gray-300 font-mono">{index + 1}</td>
                                <td className="px-6 py-8 whitespace-nowrap">
                                    <div className="text-sm font-black text-slate-800">{color.name}</div>
                                </td>
                                <td className="px-6 py-8 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={color.hex}
                                            onChange={(e) => handleHexChange(index, e.target.value)}
                                            className="h-12 w-12 p-1 border border-gray-200 rounded-xl bg-white cursor-pointer shadow-sm hover:ring-2 ring-indigo-500 transition-all"
                                        />
                                        <input
                                            type="text"
                                            value={color.hex}
                                            onChange={(e) => handleHexChange(index, e.target.value)}
                                            className="border border-gray-200 rounded-xl px-4 py-2 w-32 font-mono text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-8 whitespace-nowrap">
                                    <div
                                        className="relative w-24 h-24 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-100 group-hover:ring-indigo-200 transition-all"
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        <img
                                            src={getDefaultProductBaseImages('White').front}
                                            alt="Base"
                                            className="object-contain w-full h-full mix-blend-multiply opacity-90 scale-90"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="grid grid-cols-1 gap-4">
                                        {(['front', 'back', 'sleeve'] as const).map(view => {
                                            const currentUrl = getDefaultProductBaseImages(color.name)[view];
                                            const status = uploadStatus[`${color.name}-${view}`];

                                            return (
                                                <div key={view} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm group-hover:border-indigo-100 transition-all">
                                                    <div className="w-20 text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-md text-center">{view}</div>

                                                    <div className="flex flex-col gap-2 flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <a
                                                                href={currentUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                                                Inspect Current
                                                            </a>
                                                            {status && (
                                                                <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${status.includes('Done') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                                                                    {status}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <label className="relative">
                                                            <input
                                                                type="file"
                                                                accept="image/png"
                                                                onChange={(e) => handleFileChange(color.name, view, e.target.files?.[0] || null)}
                                                                className="block w-full text-[10px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                            />
                                                            {pendingFiles[color.name]?.[view] && (
                                                                <div className="absolute right-2 top-1.5 pointer-events-none">
                                                                    <span className="bg-emerald-500 w-2 h-2 rounded-full block shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                                                </div>
                                                            )}
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

