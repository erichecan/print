'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminSettingsApi, SiteSettingsPayload } from '@/lib/api';

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

  useEffect(() => {
    if (data?.data) {
      setSettings(data.data);
    }
  }, [data]);

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
