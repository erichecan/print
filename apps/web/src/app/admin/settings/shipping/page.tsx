'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminShippingApi, ShippingSettingsPayload } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

const DEFAULT_SHIPPING: ShippingSettingsPayload = {
    standard: {
        enabled: true,
        cost: 9.99,
        costUS: 12.99,
        costIntl: 15.99,
        estimatedDaysCA: 7,
        estimatedDaysUS: 10,
    },
    express: {
        enabled: true,
        cost: 19.99,
        costUS: 24.99,
        costIntl: 29.99,
        estimatedDaysCA: 3,
        estimatedDaysUS: 5,
    },
};

export default function ShippingSettingsPage() {
    const { t } = useAdminI18n();
    const { data, isLoading, error, mutate } = useSWR('admin-shipping-settings', adminShippingApi.get);
    const [settings, setSettings] = useState<ShippingSettingsPayload>(DEFAULT_SHIPPING);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data?.data) {
            setSettings(data.data);
        }
    }, [data]);

    const handleStandardChange = (field: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            standard: { ...prev.standard, [field]: value },
        }));
    };

    const handleExpressChange = (field: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            express: { ...prev.express, [field]: value },
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            setSaving(true);
            await adminShippingApi.update(settings);
            await mutate();
            alert(t('saveShippingSuccess') || 'Shipping settings saved successfully');
        } catch (apiError) {
            alert((apiError as Error).message || t('saveError') || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading && !data) {
        return <div className="admin-table-placeholder">{t('loading')}</div>;
    }

    if (error) {
        return <div className="admin-table-placeholder error">{t('failedDashboard')}</div>;
    }

    return (
        <div style={{ marginTop: 24, maxWidth: 840 }}>
            <div className="admin-page-header">
                <div>
                    <h1>{t('shippingConfigTitle')}</h1>
                    <p className="text-muted">{t('shippingConfigSubtitle')}</p>
                </div>
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
                <div style={{ marginBottom: 32 }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 20 }}>{t('standardShipping')}</h3>

                    <div className="admin-form-group">
                        <label>{t('enableStandard')}</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={settings.standard.enabled}
                                onChange={(e) => handleStandardChange('enabled', e.target.checked)}
                            />
                            <span>{t('enabled')}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div className="admin-form-group">
                            <label>{t('costCAD')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.standard.cost}
                                onChange={(e) => handleStandardChange('cost', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('costUSD')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.standard.costUS || 0}
                                onChange={(e) => handleStandardChange('costUS', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('costIntl')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.standard.costIntl || 0}
                                onChange={(e) => handleStandardChange('costIntl', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="admin-form-group">
                            <label>{t('estDaysCA')}</label>
                            <input
                                type="number"
                                value={settings.standard.estimatedDaysCA}
                                onChange={(e) => handleStandardChange('estimatedDaysCA', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('estDaysUS')}</label>
                            <input
                                type="number"
                                value={settings.standard.estimatedDaysUS}
                                onChange={(e) => handleStandardChange('estimatedDaysUS', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 20 }}>{t('expressShipping')}</h3>

                    <div className="admin-form-group">
                        <label>{t('enableExpress')}</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={settings.express.enabled}
                                onChange={(e) => handleExpressChange('enabled', e.target.checked)}
                            />
                            <span>{t('enabled')}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div className="admin-form-group">
                            <label>{t('costCAD')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.express.cost}
                                onChange={(e) => handleExpressChange('cost', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('costUSD')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.express.costUS || 0}
                                onChange={(e) => handleExpressChange('costUS', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('costIntl')}</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.express.costIntl || 0}
                                onChange={(e) => handleExpressChange('costIntl', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="admin-form-group">
                            <label>{t('estDaysCA')}</label>
                            <input
                                type="number"
                                value={settings.express.estimatedDaysCA}
                                onChange={(e) => handleExpressChange('estimatedDaysCA', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>{t('estDaysUS')}</label>
                            <input
                                type="number"
                                value={settings.express.estimatedDaysUS}
                                onChange={(e) => handleExpressChange('estimatedDaysUS', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn" disabled={saving}>
                    {saving ? t('saving') : t('saveSettings')}
                </button>
            </form>
        </div>
    );
}
