'use client';

import { useState, useEffect } from 'react';
import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { AdminProductPayload } from '@/lib/api';

interface ProductVariantsEditorProps {
    control: Control<AdminProductPayload>;
    register: UseFormRegister<AdminProductPayload>;
    watch: UseFormWatch<AdminProductPayload>;
    setValue: UseFormSetValue<AdminProductPayload>;
    errors: FieldErrors<AdminProductPayload>;
    onUpload?: (file: File) => Promise<string>;
}

export function ProductVariantsEditor({
    control,
    register,
    watch,
    setValue,
    errors,
    onUpload
}: ProductVariantsEditorProps) {
    const { fields, replace, update } = useFieldArray({
        control,
        name: 'variants',
    });

    const productImages = watch('images') || [];

    // Local state for attribute configuration
    const [colors, setColors] = useState<string[]>([]);
    const [sizes, setSizes] = useState<string[]>([]);
    const [newColor, setNewColor] = useState('');
    const [newSize, setNewSize] = useState('');

    // Color to Image URL mapping
    const [colorImages, setColorImages] = useState<Record<string, string>>({});

    // Bulk edit state
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkStock, setBulkStock] = useState('');

    // Initialize attributes from existing variants if present (on first load)
    useEffect(() => {
        if (fields.length > 0 && colors.length === 0 && sizes.length === 0) {
            const existingColors = new Set<string>();
            const existingSizes = new Set<string>();
            fields.forEach((field: any) => {
                if (field.color) existingColors.add(field.color);
                if (field.size) existingSizes.add(field.size);
            });
            if (existingColors.size > 0) setColors(Array.from(existingColors));
            if (existingSizes.size > 0) setSizes(Array.from(existingSizes));

            // Initialize color image mapping
            const existingColorImages: Record<string, string> = {};
            fields.forEach((field: any) => {
                if (field.color && field.imageUrl && !existingColorImages[field.color]) {
                    existingColorImages[field.color] = field.imageUrl;
                }
            });
            if (Object.keys(existingColorImages).length > 0) setColorImages(existingColorImages);
        }
    }, []); // Run once on mount

    const addColor = () => {
        if (newColor && !colors.includes(newColor)) {
            setColors([...colors, newColor]);
            setNewColor('');
        }
    };

    const addSize = () => {
        if (newSize && !sizes.includes(newSize)) {
            setSizes([...sizes, newSize]);
            setNewSize('');
        }
    };

    const removeColor = (color: string) => {
        setColors(colors.filter(c => c !== color));
        const newColorImages = { ...colorImages };
        delete newColorImages[color];
        setColorImages(newColorImages);
    };

    const updateColorImage = (color: string, imageUrl: string) => {
        const newColorImages = { ...colorImages, [color]: imageUrl };
        setColorImages(newColorImages);

        // Update existing variants with this color
        fields.forEach((field: any, index) => {
            if (field.color === color) {
                update(index, { ...field, imageUrl });
            }
        });
    };

    const removeSize = (size: string) => {
        setSizes(sizes.filter(s => s !== size));
    };

    const generateVariants = () => {
        if (colors.length === 0 || sizes.length === 0) {
            alert('Please add at least one color and one size.');
            return;
        }

        const currentSku = watch('sku') || 'SKU';
        const newVariants = [];

        for (const color of colors) {
            for (const size of sizes) {
                // Try to find existing variant to preserve price/stock
                const existing = fields.find((f: any) => f.color === color && f.size === size);

                newVariants.push({
                    sku: existing?.sku || `${currentSku}-${color.toUpperCase()}-${size.toUpperCase()}`.replace(/[^A-Z0-9-]/g, ''),
                    color,
                    size,
                    stockQuantity: existing ? existing.stockQuantity : 0,
                    priceAdjustment: existing ? existing.priceAdjustment : 0,
                    imageUrl: existing ? existing.imageUrl : (colorImages[color] || ''),
                });
            }
        }

        replace(newVariants);
    };

    const applyBulkPrice = () => {
        const price = parseFloat(bulkPrice);
        if (!isNaN(price)) {
            fields.forEach((field, index) => {
                update(index, { ...field, priceAdjustment: price });
            });
        }
    };

    const applyBulkStock = () => {
        const stock = parseInt(bulkStock);
        if (!isNaN(stock)) {
            fields.forEach((field, index) => {
                update(index, { ...field, stockQuantity: stock });
            });
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3>Variants Configuration</h3>
            </div>

            <div className="checkbox-row mb-4">
                <input type="checkbox" {...register('isCustomizable')} id="isCustomizable" />
                <label htmlFor="isCustomizable">This product has options, like size or color</label>
            </div>

            {watch('isCustomizable') && (
                <div className="variants-config">
                    {/* Attributes Section */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {/* Colors */}
                        <div className="attribute-section">
                            <label className="attribute-label">Colors</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    placeholder="e.g. Red, Blue"
                                    className="input-sm flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                                />
                                <button type="button" onClick={addColor} className="btn-secondary btn-sm">Add</button>
                            </div>
                            <div className="flex flex-col gap-3">
                                {colors.map(color => (
                                    <div key={color} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full border border-gray-300"
                                                style={{ backgroundColor: color.toLowerCase() }} // Basic color preview
                                            ></div>
                                            <span className="font-medium">{color}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Image Preview / Upload Area */}
                                            <div className="relative group">
                                                {colorImages[color] ? (
                                                    <div className="relative">
                                                        <img
                                                            src={colorImages[color]}
                                                            alt={color}
                                                            className="w-12 h-12 object-cover rounded border bg-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateColorImage(color, '')}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove image"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-white text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors relative overflow-hidden">
                                                        <span className="text-xs">IMG</span>
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file && onUpload) {
                                                                    try {
                                                                        const url = await onUpload(file);
                                                                        updateColorImage(color, url);
                                                                    } catch (err) {
                                                                        alert('Failed to upload image');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fallback Select (if reused existing images is needed) */}
                                            <select
                                                className="text-xs border rounded p-1 max-w-[100px] text-gray-600"
                                                value={colorImages[color] || ''}
                                                onChange={(e) => updateColorImage(color, e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                {productImages.map((img, i) => (
                                                    <option key={i} value={img.url}>Image {i + 1}</option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() => removeColor(color)}
                                                className="text-gray-400 hover:text-red-500 ml-2 p-1"
                                                title="Remove color"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sizes */}
                        <div className="attribute-section">
                            <label className="attribute-label">Sizes</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value)}
                                    placeholder="e.g. S, M, L"
                                    className="input-sm flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                                />
                                <button type="button" onClick={addSize} className="btn-secondary btn-sm">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sizes.map(size => (
                                    <span key={size} className="chip">
                                        {size}
                                        <button type="button" onClick={() => removeSize(size)} className="ml-2 text-red-500">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex justify-between items-center mb-6 pt-4 border-t">
                        <button type="button" onClick={generateVariants} className="btn-primary">
                            Generate Variants
                        </button>
                        <div className="text-sm text-gray-500">
                            {fields.length} variants will be created/updated
                        </div>
                    </div>

                    {/* Bulk Edit Toolbar */}
                    {fields.length > 0 && (
                        <div className="bulk-edit-toolbar mb-4 p-3 bg-gray-50 rounded">
                            <span className="text-sm font-semibold mr-4">Bulk Edit:</span>
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Price Adj."
                                        className="input-sm w-24"
                                        value={bulkPrice}
                                        onChange={(e) => setBulkPrice(e.target.value)}
                                    />
                                    <button type="button" onClick={applyBulkPrice} className="text-blue-600 text-sm">Apply</button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Stock"
                                        className="input-sm w-24"
                                        value={bulkStock}
                                        onChange={(e) => setBulkStock(e.target.value)}
                                    />
                                    <button type="button" onClick={applyBulkStock} className="text-blue-600 text-sm">Apply</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Variants Table */}
                    {fields.length > 0 && (
                        <div className="variants-table-container overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b text-sm text-gray-600">
                                        <th className="p-2">Variant</th>
                                        <th className="p-2">SKU</th>
                                        <th className="p-2">Price (+/-)</th>
                                        <th className="p-2">Stock</th>
                                        <th className="p-2">Image</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((field: any, index) => (
                                        <tr key={field.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="p-2 font-medium">
                                                {field.color} / {field.size}
                                                {/* Hidden Inputs for Attributes */}
                                                <input type="hidden" {...register(`variants.${index}.color` as const)} />
                                                <input type="hidden" {...register(`variants.${index}.size` as const)} />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    className="input-sm w-full"
                                                    {...register(`variants.${index}.sku` as const)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="input-sm w-24 pl-6"
                                                        {...register(`variants.${index}.priceAdjustment` as const)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="input-sm w-20"
                                                    {...register(`variants.${index}.stockQuantity` as const)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                {field.imageUrl && (
                                                    <img src={field.imageUrl} alt="Variant" className="w-8 h-8 object-cover rounded border" />
                                                )}
                                                <input type="hidden" {...register(`variants.${index}.imageUrl` as const)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
        .chip {
          background: #e2e8f0;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
        }
        .attribute-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #334155;
        }
        .input-sm {
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
        }
        .variants-table-container th {
          font-weight: 600;
        }
      `}</style>
        </div>
    );
}
