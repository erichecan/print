'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { adminSettingsApi, ColorMappingPayload } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

export default function ColorMappingPage() {
    const { t } = useAdminI18n();
    const { data, isLoading, error, mutate } = useSWR('admin-color-mappings', adminSettingsApi.getColorMappings);
    const [mappings, setMappings] = useState<ColorMappingPayload[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (data?.data) {
            setMappings(data.data);
        }
    }, [data]);

    const handleHexChange = (id: string, index: number, value: string) => {
        setMappings(prev => prev.map(m => {
            if (m.id !== id) return m;
            const newValues = [...m.values];
            newValues[index] = value;
            return { ...m, values: newValues };
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await adminSettingsApi.updateColorMappings(mappings);
            await mutate(); // Refresh source of truth
            alert(t('successfullySaved') || 'Successfully saved settings!');
        } catch (err) {
            console.error(err);
            alert(t('saveError') || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const mappingToDelete = mappings.find(m => m.id === deleteId);
        if (!mappingToDelete) return;

        try {
            setSaving(true);
            await adminSettingsApi.deleteColorMapping(deleteId);
            setDeleteId(null);
            await mutate();
            alert((t('successfullyDeleted') || 'Successfully deleted {name}').replace('{name}', mappingToDelete.productColor));
        } catch (err) {
            console.error(err);
            alert(t('deleteError') || 'Failed to delete mapping');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return <div className="admin-table-placeholder">{t('loading')}</div>;
    if (error) return <div className="admin-table-placeholder error">{t('failedDashboard')}</div>;

    const viewLabels = [t('viewFront'), t('viewBack'), t('viewLeftSleeve'), t('viewRightSleeve')];

    return (
        <div className="admin-page">
            <header className="admin-page-header">
                <div>
                    <h1>{t('colorMappingTitle')}</h1>
                    <p className="text-muted">{t('colorMappingSubtitle')}</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn btn--primary"
                    disabled={saving}
                >
                    {saving ? t('saving') : t('saveHexChanges')}
                </button>
            </header>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th data-i18n="productColorColumn">{t('productColorColumn')}</th>
                            <th data-i18n="valuesColumn">{t('valuesColumn')}</th>
                            <th data-i18n="productImagesColumn">{t('productImagesColumn')}</th>
                            <th className="text-right" data-i18n="actionsColumn">{t('actionsColumn')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mappings.map((mapping) => (
                            <tr key={mapping.id}>
                                <td className="align-top">
                                    <div className="font-bold mb-1">{mapping.productColor}</div>
                                    <div className="text-xs text-muted" title={mapping.id}>
                                        <span data-i18n="idLabel">{t('idLabel')}</span>: {mapping.id.substring(0, 8)}...
                                    </div>
                                </td>
                                <td className="align-top">
                                    <div className="flex flex-col gap-2">
                                        {mapping.values.map((hex, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border shadow-sm"
                                                    style={{ backgroundColor: hex }}
                                                />
                                                <input
                                                    type="text"
                                                    value={hex}
                                                    onChange={(e) => handleHexChange(mapping.id, index, e.target.value)}
                                                    className="font-mono text-sm px-2 py-1 border rounded w-24"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="grid grid-cols-4 gap-4">
                                        {mapping.images.map((url, i) => (
                                            <div key={i} className="text-center">
                                                <div className="border rounded p-1 bg-gray-50 mb-1">
                                                    <Image
                                                        src={url}
                                                        alt={`${mapping.productColor} - View ${i + 1}`}
                                                        width={100}
                                                        height={100}
                                                        className="object-contain mx-auto"
                                                    />
                                                </div>
                                                <span className="text-xs text-muted">{viewLabels[i] || `View ${i + 1}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="text-right align-top">
                                    <button
                                        onClick={() => setDeleteId(mapping.id)}
                                        className="btn btn--outline btn--danger btn--xs"
                                        data-i18n="delete"
                                        disabled={saving}
                                    >
                                        {t('delete')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{t('deleteMappingTitle')}</h3>
                        <p>{(t('deleteMappingConfirm') || 'Confirm delete for {name}').replace('{name}', mappings.find(m => m.id === deleteId)?.productColor || 'this item')}</p>
                        <div className="modal-actions">
                            <button className="btn btn--outline" onClick={() => setDeleteId(null)} disabled={saving}>{t('cancel')}</button>
                            <button className="btn btn--danger" onClick={handleDelete} disabled={saving}>
                                {saving ? t('saving') : t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
