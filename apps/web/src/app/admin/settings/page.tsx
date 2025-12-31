'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminSettingsApi, SiteSettingsPayload, adminProductionTemplatesApi, ProductionTemplate, adminOfflineOrdersApi, OfflineOrderStage } from '@/lib/api';

const DEFAULT_SETTINGS: SiteSettingsPayload = {
  siteName: 'suvernire plus',
  contactEmail: 'support@souvenirplus.com',
  contactPhone: '800-293-4232',
  currency: 'USD',
  shippingProvider: 'UPS',
  paymentGateway: 'Stripe',
  testMode: true,
  autoApproveDesigns: false,
  copyrightCheck: true,
  reviewEmail: 'review@souvenirplus.com',
};

export default function AdminSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR('admin-site-settings', adminSettingsApi.getSite);
  const [settings, setSettings] = useState<SiteSettingsPayload>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const { data: tplData, isLoading: tplLoading, error: tplError, mutate: mutateTpl } = useSWR(
    'admin-production-templates',
    adminProductionTemplatesApi.get
  );
  const [templates, setTemplates] = useState<ProductionTemplate[]>([]);
  const [tplSaving, setTplSaving] = useState(false);

  const { data: offlineStageData, isLoading: offlineStageLoading, error: offlineStageError, mutate: mutateOfflineStage } = useSWR(
    'admin-offline-workflow-stages',
    adminOfflineOrdersApi.getWorkflowStages
  );
  const [offlineStages, setOfflineStages] = useState<OfflineOrderStage[]>([]);
  const [offlineStageSaving, setOfflineStageSaving] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setSettings(data.data);
    }
  }, [data]);

  useEffect(() => {
    if (tplData?.data) {
      setTemplates(tplData.data);
    }
  }, [tplData]);

  useEffect(() => {
    if (offlineStageData?.stages) {
      setOfflineStages(offlineStageData.stages);
    }
  }, [offlineStageData]);

  const handleChange = <K extends keyof SiteSettingsPayload>(key: K, value: SiteSettingsPayload[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      await adminSettingsApi.updateSite(settings);
      mutate();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTplName = (index: number, value: string) => {
    setTemplates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: value };
      return next;
    });
  };

  const handleStageChange = (tplIndex: number, stageIndex: number, field: 'key' | 'label', value: string) => {
    setTemplates((prev) => {
      const next = [...prev];
      const tpl = next[tplIndex];
      const stages = [...(tpl.stages || [])];
      const current = { ...(stages[stageIndex] || { key: '', label: '' }) };
      current[field] = value;
      stages[stageIndex] = current;
      next[tplIndex] = { ...tpl, stages };
      return next;
    });
  };

  const handleAddStage = (tplIndex: number) => {
    setTemplates((prev) => {
      const next = [...prev];
      const tpl = next[tplIndex];
      next[tplIndex] = { ...tpl, stages: [...(tpl.stages || []), { key: '', label: '' }] };
      return next;
    });
  };

  const handleRemoveStage = (tplIndex: number, stageIndex: number) => {
    setTemplates((prev) => {
      const next = [...prev];
      const tpl = next[tplIndex];
      const stages = [...(tpl.stages || [])];
      stages.splice(stageIndex, 1);
      next[tplIndex] = { ...tpl, stages };
      return next;
    });
  };

  const handleAddTemplate = () => {
    setTemplates((prev) => [...prev, { id: `tpl-${Date.now()}`, name: 'New Template', stages: [] }]);
  };

  const handleTplSave = async () => {
    try {
      setTplSaving(true);
      await adminProductionTemplatesApi.update(templates);
      await mutateTpl();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to save production templates');
    } finally {
      setTplSaving(false);
    }
  };

  const handleOfflineStageChange = (index: number, field: keyof OfflineOrderStage, value: string) => {
    setOfflineStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
// Ensure legacy "label" field is also updated for compatibility
      if (field === 'labelEn' || field === 'labelZh') {
        const stage = next[index];
        next[index].label = stage.labelZh || stage.labelEn || stage.label;
      }
      return next;
    });
  };

  const handleAddOfflineStage = () => {
    setOfflineStages((prev) => [...prev, { key: '', label: '', labelEn: '', labelZh: '', position: prev.length }]);
  };

  const handleRemoveOfflineStage = (index: number) => {
    setOfflineStages((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleOfflineStageSave = async () => {
    try {
      setOfflineStageSaving(true);
      await adminOfflineOrdersApi.updateWorkflowStages(offlineStages);
      await mutateOfflineStage();
      alert('Offline workflow stages updated successfully');
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to save offline workflow stages');
    } finally {
      setOfflineStageSaving(false);
    }
  };

// CMS 内容管理已移至独立的 /admin/content-manager 页面

  if (isLoading && !data) {
    return <div className="admin-table-placeholder">Loading settings…</div>;
  }

  if (error) {
    return <div className="admin-table-placeholder error">Failed to load settings.</div>;
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 840 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="settings">Settings</h1>
          <p className="text-muted">Configure storefront, payments, and review workflow</p>
        </div>
      </div>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Offline Workflow Stages</h3>
          <span className="text-muted" style={{ fontSize: 13 }}>Global stages for Kanban Board</span>
        </div>
        {offlineStageLoading && !offlineStages.length && <div className="admin-table-placeholder">Loading stages…</div>}
        {offlineStageError && <div className="admin-table-placeholder error">Failed to load offline workflow stages.</div>}
        {!offlineStageLoading && (
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            {offlineStages.map((stage, index) => (
              <div key={`offline-stage-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1.5fr auto', gap: 12, alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 4 }}>Key</label>
                  <input
                    type="text"
                    placeholder="e.g., printing"
                    value={stage.key}
                    onChange={(e) => handleOfflineStageChange(index, 'key', e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px' }}
                  />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 4 }}>Label (EN)</label>
                  <input
                    type="text"
                    placeholder="e.g., In Printing"
                    value={stage.labelEn || ''}
                    onChange={(e) => handleOfflineStageChange(index, 'labelEn', e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px' }}
                  />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 4 }}>Label (ZH)</label>
                  <input
                    type="text"
                    placeholder="例如：印刷生产"
                    value={stage.labelZh || ''}
                    onChange={(e) => handleOfflineStageChange(index, 'labelZh', e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px' }}
                  />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, marginBottom: 4 }}>Description</label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={stage.description || ''}
                    onChange={(e) => handleOfflineStageChange(index, 'description', e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--outline btn--xs"
                  onClick={() => handleRemoveOfflineStage(index)}
                  style={{ marginTop: 20, color: '#ef4444', borderColor: '#ef4444' }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn--outline" style={{ borderStyle: 'dashed' }} onClick={handleAddOfflineStage}>
              + Add Workflow Stage
            </button>
          </div>
        )}
        <button type="button" className="btn" onClick={handleOfflineStageSave} disabled={offlineStageSaving}>
          {offlineStageSaving ? 'Saving…' : 'Save Workflow Stages'}
        </button>
      </div>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Production Stage Templates</h3>
        {tplLoading && !templates.length && <div className="admin-table-placeholder">Loading templates…</div>}
        {tplError && <div className="admin-table-placeholder error">Failed to load templates.</div>}
        {!tplLoading && templates.map((tpl, ti) => (
          <div key={tpl.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div className="admin-form-group">
              <label>Template Name</label>
              <input type="text" value={tpl.name} onChange={(e) => handleTplName(ti, e.target.value)} />
            </div>
            <div className="admin-form-group">
              <label>Stages</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {(tpl.stages || []).map((stage, si) => (
                  <div key={`${tpl.id}-stage-${si}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="key (e.g., printing)"
                      value={stage.key}
                      onChange={(e) => handleStageChange(ti, si, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="label (e.g., 印刷生产)"
                      value={stage.label}
                      onChange={(e) => handleStageChange(ti, si, 'label', e.target.value)}
                    />
                    <button type="button" className="btn btn--outline btn--xs" onClick={() => handleRemoveStage(ti, si)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn--outline btn--xs" onClick={() => handleAddStage(ti)}>
                  + Add Stage
                </button>
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn--outline" onClick={handleAddTemplate}>
            + Add Template
          </button>
          <button type="button" className="btn" onClick={handleTplSave} disabled={tplSaving}>
            {tplSaving ? 'Saving…' : 'Save Templates'}
          </button>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Site Settings</h3>
        <div className="admin-form-group">
          <label>Site Name</label>
          <input type="text" value={settings.siteName} onChange={(event) => handleChange('siteName', event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Contact Email</label>
          <input type="email" value={settings.contactEmail} onChange={(event) => handleChange('contactEmail', event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Phone Number</label>
          <input type="tel" value={settings.contactPhone} onChange={(event) => handleChange('contactPhone', event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Default Currency</label>
          <select value={settings.currency} onChange={(event) => handleChange('currency', event.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>Default Shipping Provider</label>
          <select value={settings.shippingProvider} onChange={(event) => handleChange('shippingProvider', event.target.value)}>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="DHL">DHL</option>
            <option value="USPS">USPS</option>
          </select>
        </div>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Payment Integration</h3>
        <div className="admin-form-group">
          <label>Payment Gateway</label>
          <select value={settings.paymentGateway} onChange={(event) => handleChange('paymentGateway', event.target.value)}>
            <option value="Stripe">Stripe</option>
            <option value="PayPal">PayPal</option>
            <option value="Square">Square</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>Test Mode</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.testMode}
              onChange={(event) => handleChange('testMode', event.target.checked)}
            />
            <span>Enable test/sandbox mode</span>
          </div>
        </div>
        <button type="button" className="btn" disabled>
          API Keys managed via environment variables
        </button>
      </div>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Design Review Settings</h3>
        <div className="admin-form-group">
          <label>Auto-approve designs</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.autoApproveDesigns}
              onChange={(event) => handleChange('autoApproveDesigns', event.target.checked)}
            />
            <span>Automatically approve designs without review</span>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Copyright Check</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.copyrightCheck}
              onChange={(event) => handleChange('copyrightCheck', event.target.checked)}
            />
            <span>Enable automatic copyright detection</span>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Review Notification Email</label>
          <input type="email" value={settings.reviewEmail} onChange={(event) => handleChange('reviewEmail', event.target.value)} />
        </div>
        <button type="button" className="btn btn--outline" disabled={saving}>
          {saving ? 'Saving…' : 'Save Review Settings'}
        </button>
      </div>

      <div className="admin-form" style={{ border: '2px solid #EF4444', background: 'rgba(239,68,68,0.05)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#EF4444' }}>Danger Zone</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <button className="btn" style={{ background: '#EF4444', borderColor: '#EF4444' }} disabled>
            Clear All Cache
          </button>
          <button className="btn" style={{ background: '#EF4444', borderColor: '#EF4444' }} disabled>
            Reset Database
          </button>
          <button className="btn" style={{ background: '#EF4444', borderColor: '#EF4444' }} disabled>
            Delete All Test Data
          </button>
        </div>
      </div>
    </div>
  );
}
