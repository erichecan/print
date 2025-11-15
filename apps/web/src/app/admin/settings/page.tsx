'use client';

import { useState } from 'react';

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState('suvernire plus');
  const [contactEmail, setContactEmail] = useState('support@souvenirplus.com');
  const [contactPhone, setContactPhone] = useState('800-293-4232');
  const [currency, setCurrency] = useState('USD');
  const [shippingProvider, setShippingProvider] = useState('UPS');
  const [gateway, setGateway] = useState('Stripe');
  const [testMode, setTestMode] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [copyrightCheck, setCopyrightCheck] = useState(true);
  const [reviewEmail, setReviewEmail] = useState('review@souvenirplus.com');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert('Settings saved (demo only).');
  };

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
          <input type="text" value={siteName} onChange={(event) => setSiteName(event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Contact Email</label>
          <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Phone Number</label>
          <input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
        </div>
        <div className="admin-form-group">
          <label>Default Currency</label>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>Default Shipping Provider</label>
          <select value={shippingProvider} onChange={(event) => setShippingProvider(event.target.value)}>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="DHL">DHL</option>
            <option value="USPS">USPS</option>
          </select>
        </div>
        <button type="submit" className="btn">
          Save Settings
        </button>
      </form>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Payment Integration</h3>
        <div className="admin-form-group">
          <label>Payment Gateway</label>
          <select value={gateway} onChange={(event) => setGateway(event.target.value)}>
            <option value="Stripe">Stripe</option>
            <option value="PayPal">PayPal</option>
            <option value="Square">Square</option>
          </select>
        </div>
        <div className="admin-form-group">
          <label>API Key</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input type="password" value="••••••••••••••••" readOnly />
            <button type="button" className="btn btn--outline" disabled>
              Show
            </button>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Test Mode</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} />
            <span>Enable test/sandbox mode</span>
          </div>
        </div>
        <button type="button" className="btn" disabled>
          Save Payment Settings
        </button>
      </div>

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Design Review Settings</h3>
        <div className="admin-form-group">
          <label>Auto-approve designs</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={autoApprove} onChange={(event) => setAutoApprove(event.target.checked)} />
            <span>Automatically approve designs without review</span>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Copyright Check</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={copyrightCheck}
              onChange={(event) => setCopyrightCheck(event.target.checked)}
            />
            <span>Enable automatic copyright detection</span>
          </div>
        </div>
        <div className="admin-form-group">
          <label>Review Notification Email</label>
          <input type="email" value={reviewEmail} onChange={(event) => setReviewEmail(event.target.value)} />
        </div>
        <button type="button" className="btn" disabled>
          Save Review Settings
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
