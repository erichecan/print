'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminSettingsApi, SiteSettingsPayload, adminProductionTemplatesApi, ProductionTemplate, adminContentApi, ContentConfig } from '@/lib/api';

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
  // [2025-11-16 18:18:30] Simple CMS content section
  const { data: contentData, isLoading: contentLoading, error: contentError, mutate: mutateContent } = useSWR(
    'admin-content-config',
    adminContentApi.get
  );
  const [content, setContent] = useState<ContentConfig>({
    heroCards: [],
    brandLogos: [],
    featuredCollections: [],
  });
  const [contentSaving, setContentSaving] = useState(false);

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
    if (contentData?.data) {
      setContent(contentData.data);
    }
  }, [contentData]);

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

  // [2025-11-16 18:18:30] Content config handlers
  const handleHeroChange = (index: number, field: 'title' | 'subtitle' | 'imageUrl' | 'linkUrl', value: string) => {
    setContent((prev) => {
      const next = { ...prev, heroCards: [...prev.heroCards] };
      const card = { ...next.heroCards[index] };
      (card as any)[field] = value;
      next.heroCards[index] = card;
      return next;
    });
  };

  const addHeroCard = () => {
    setContent((prev) => ({
      ...prev,
      heroCards: [
        ...prev.heroCards,
        { id: `hero-${Date.now()}`, title: '', subtitle: '', imageUrl: '', linkUrl: '' },
      ],
    }));
  };

  const removeHeroCard = (index: number) => {
    setContent((prev) => {
      const next = { ...prev, heroCards: [...prev.heroCards] };
      next.heroCards.splice(index, 1);
      return next;
    });
  };

  const handleLogoChange = (index: number, field: 'name' | 'imageUrl', value: string) => {
    setContent((prev) => {
      const next = { ...prev, brandLogos: [...prev.brandLogos] };
      const item = { ...next.brandLogos[index] };
      (item as any)[field] = value;
      next.brandLogos[index] = item;
      return next;
    });
  };

  const addLogo = () => {
    setContent((prev) => ({
      ...prev,
      brandLogos: [...prev.brandLogos, { id: `logo-${Date.now()}`, name: '', imageUrl: '' }],
    }));
  };

  const removeLogo = (index: number) => {
    setContent((prev) => {
      const next = { ...prev, brandLogos: [...prev.brandLogos] };
      next.brandLogos.splice(index, 1);
      return next;
    });
  };

  const handleCollectionChange = (index: number, field: 'title' | 'linkUrl', value: string) => {
    setContent((prev) => {
      const next = { ...prev, featuredCollections: [...prev.featuredCollections] };
      const item = { ...next.featuredCollections[index] };
      (item as any)[field] = value;
      next.featuredCollections[index] = item;
      return next;
    });
  };

  const addCollection = () => {
    setContent((prev) => ({
      ...prev,
      featuredCollections: [...prev.featuredCollections, { id: `collection-${Date.now()}`, title: '', linkUrl: '' }],
    }));
  };

  const removeCollection = (index: number) => {
    setContent((prev) => {
      const next = { ...prev, featuredCollections: [...prev.featuredCollections] };
      next.featuredCollections.splice(index, 1);
      return next;
    });
  };

  const saveContent = async () => {
    try {
      setContentSaving(true);
      await adminContentApi.update(content);
      await mutateContent();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to save content');
    } finally {
      setContentSaving(false);
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

      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Content Management (CMS)</h3>
        {contentLoading && !content.heroCards.length && <div className="admin-table-placeholder">Loading content…</div>}
        {contentError && <div className="admin-table-placeholder error">Failed to load content configuration.</div>}
        {/* Hero cards */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <h4 style={{ margin: '4px 0' }}>Homepage Hero Cards</h4>
          {content.heroCards.map((card, idx) => (
            <div key={card.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
              <div className="admin-form-group">
                <label>Title</label>
                <input type="text" value={card.title} onChange={(e) => handleHeroChange(idx, 'title', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Subtitle</label>
                <input type="text" value={card.subtitle} onChange={(e) => handleHeroChange(idx, 'subtitle', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Image URL</label>
                <input type="url" value={card.imageUrl} onChange={(e) => handleHeroChange(idx, 'imageUrl', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Link URL</label>
                <input type="url" value={card.linkUrl} onChange={(e) => handleHeroChange(idx, 'linkUrl', e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--outline btn--xs" onClick={() => removeHeroCard(idx)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--outline btn--xs" onClick={addHeroCard}>+ Add Hero Card</button>
        </div>
        {/* Brand logos */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <h4 style={{ margin: '4px 0' }}>Brand Logos</h4>
          {content.brandLogos.map((logo, idx) => (
            <div key={logo.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
              <div className="admin-form-group">
                <label>Name</label>
                <input type="text" value={logo.name} onChange={(e) => handleLogoChange(idx, 'name', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Image URL</label>
                <input type="url" value={logo.imageUrl} onChange={(e) => handleLogoChange(idx, 'imageUrl', e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--outline btn--xs" onClick={() => removeLogo(idx)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--outline btn--xs" onClick={addLogo}>+ Add Brand Logo</button>
        </div>
        {/* Featured collections */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <h4 style={{ margin: '4px 0' }}>Featured Collections</h4>
          {content.featuredCollections.map((col, idx) => (
            <div key={col.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 12 }}>
              <div className="admin-form-group">
                <label>Title</label>
                <input type="text" value={col.title} onChange={(e) => handleCollectionChange(idx, 'title', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Link URL</label>
                <input type="url" value={col.linkUrl} onChange={(e) => handleCollectionChange(idx, 'linkUrl', e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--outline btn--xs" onClick={() => removeCollection(idx)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--outline btn--xs" onClick={addCollection}>+ Add Collection</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={saveContent} disabled={contentSaving}>
            {contentSaving ? 'Saving…' : 'Save Content'}
          </button>
        </div>
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
