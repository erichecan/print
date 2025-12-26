'use client';

import React from 'react';
import { getDefaultProductBaseImages } from '@/lib/customink-images';
import { PRODUCT_COLORS } from '@/lib/product-data';

export default function ColorCheckPage() {
    // Use static data from PRODUCT_COLORS directly
    // This avoids API timeouts if backend is unresponsive
    const product = {
        name: 'Design Lab Default Tee (Static Data)',
        variants: PRODUCT_COLORS.map((c, i) => ({
            id: `static-${i}`,
            color: c.name,
            colorHex: c.hex,
            imageUrl: null
        })).sort((a, b) => (a.color || '').localeCompare(b.color || ''))
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Design Lab Color Check: {product.name}</h1>
            <p className="mb-4 text-gray-500">Note: Showing static data from PRODUCT_COLORS to fallback for API timeouts.</p>

            <table className="min-w-full bg-white border border-gray-300">
                <thead>
                    <tr className="bg-gray-100 border-b">
                        <th className="py-2 px-4 border-r text-left">#</th>
                        <th className="py-2 px-4 border-r text-left">Color Hex (Codefile)</th>
                        <th className="py-2 px-4 border-r text-left">Color Name</th>
                        <th className="py-2 px-4 border-r text-left">Swatch Preview</th>
                        <th className="py-2 px-4 text-left">Product Image (GCS)</th>
                    </tr>
                </thead>
                <tbody>
                    {product.variants.map((v, index) => {
                        // Calculate the image URL that Design Lab frontend uses
                        const gcsImage = getDefaultProductBaseImages(v.color).front;

                        return (
                            <tr key={v.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4 border-r">{index + 1}</td>
                                <td className="py-2 px-4 border-r font-mono">{v.colorHex || 'N/A'}</td>
                                <td className="py-2 px-4 border-r">{v.color}</td>
                                <td className="py-2 px-4 border-r align-middle">
                                    <div
                                        style={{
                                            backgroundColor: v.colorHex || '#ccc',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd'
                                        }}
                                        title={v.colorHex || 'No Hex'}
                                    />
                                </td>
                                <td className="py-2 px-4 align-middle">
                                    {/* Raw Image */}
                                    <div className="relative w-20 h-20 bg-gray-100 border rounded overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={gcsImage}
                                            alt={v.color || 'Product'}
                                            className="object-contain w-full h-full"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholders/image-not-found.png' }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 break-all mt-1">{gcsImage.split('/').pop()}</div>
                                </td>
                                <td className="py-2 px-4 align-middle">
                                    {/* Proposed Tint Fix */}
                                    <div
                                        className="relative w-20 h-20 border rounded overflow-hidden"
                                        style={{ backgroundColor: v.colorHex || '#fff' }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getDefaultProductBaseImages('White').front}
                                            alt="Base"
                                            className="object-contain w-full h-full mix-blend-multiply opacity-90"
                                        />
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">Proposed Fix</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
