'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminContentApi, ContentConfig } from '@/lib/api';

export default function ContentManagerPage() {
  const { data, isLoading, error, mutate } = useSWR('admin-content-config', adminContentApi.get);
  const [content, setContent] = useState<ContentConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setContent(data.data);
    }
  }, [data]);

  const updateHeroCard = (id: string, field: 'title' | 'subtitle' | 'imageUrl' | 'linkUrl', value: string) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            heroCards: prev.heroCards.map((card) => (card.id === id ? { ...card, [field]: value } : card)),
          }
        : prev
    );
  };

  const updateBrandLogo = (id: string, field: 'name' | 'imageUrl', value: string) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            brandLogos: prev.brandLogos.map((logo) => (logo.id === id ? { ...logo, [field]: value } : logo)),
          }
        : prev
    );
  };

  const updateCollection = (id: string, field: 'title' | 'linkUrl', value: string) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            featuredCollections: prev.featuredCollections.map((collection) =>
              collection.id === id ? { ...collection, [field]: value } : collection
            ),
          }
        : prev
    );
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      setSaving(true);
      await adminContentApi.update(content);
      mutate();
    } catch (apiError) {
      alert((apiError as Error).message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !content) {
    return <div className="admin-table-placeholder">Loading content…</div>;
  }

  if (error || !content) {
    return <div className="admin-table-placeholder error">Failed to load content configuration.</div>;
  }

  return (
    <div style={{ marginTop: 24 }}>
      <header className="admin-page-header">
        <div>
          <h1>Content Manager</h1>
          <p className="text-muted">Update hero imagery, logos, and category assets</p>
        </div>
        <nav style={{ display: 'flex', gap: 16 }}>
          <a href="/admin" className="text-muted">
            Dashboard
          </a>
          <a href="/admin/content-manager" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Content
          </a>
          <a href="/admin/settings" className="text-muted">
            Settings
          </a>
          <a href="/" className="text-muted" target="_blank" rel="noreferrer">
            View Site
          </a>
        </nav>
      </header>

      <section className="content-section">
        <h2>Hero Section Images</h2>
        <p className="text-muted">Main hero cards displayed on homepage</p>
        <div className="image-grid">
          {content.heroCards.map((card) => (
            <div key={card.id} className="image-item">
              <label>{card.title || 'Hero Card'}</label>
              <div className="image-preview">
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.imageUrl} alt={card.title} />
                ) : (
                  <div className="placeholder-preview">Upload preview</div>
                )}
              </div>
              <div className="image-info">
                <input
                  type="text"
                  className="image-url"
                  placeholder="Image URL"
                  value={card.imageUrl}
                  onChange={(event) => updateHeroCard(card.id, 'imageUrl', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={card.title}
                  onChange={(event) => updateHeroCard(card.id, 'title', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Subtitle"
                  value={card.subtitle}
                  onChange={(event) => updateHeroCard(card.id, 'subtitle', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Link URL"
                  value={card.linkUrl}
                  onChange={(event) => updateHeroCard(card.id, 'linkUrl', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <h2>Brand Logos</h2>
        <p className="text-muted">Brand logos displayed on homepage</p>
        <div className="image-grid">
          {content.brandLogos.map((logo) => (
            <div key={logo.id} className="image-item">
              <label>{logo.name}</label>
              <div className="image-preview" aria-hidden="true">
                {logo.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.imageUrl} alt={logo.name} />
                ) : (
                  <div className="placeholder-preview">Logo placeholder</div>
                )}
              </div>
              <div className="image-info">
                <input
                  type="text"
                  placeholder="Brand Name"
                  value={logo.name}
                  onChange={(event) => updateBrandLogo(logo.id, 'name', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={logo.imageUrl}
                  onChange={(event) => updateBrandLogo(logo.id, 'imageUrl', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <h2>Featured Collections</h2>
        <p className="text-muted">Homepage featured content</p>
        <div className="image-grid">
          {content.featuredCollections.map((collection) => (
            <div key={collection.id} className="image-item">
              <label>{collection.title}</label>
              <div className="image-info">
                <input
                  type="text"
                  placeholder="Collection Title"
                  value={collection.title}
                  onChange={(event) => updateCollection(collection.id, 'title', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Link URL"
                  value={collection.linkUrl}
                  onChange={(event) => updateCollection(collection.id, 'linkUrl', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="content-actions" style={{ marginTop: 24 }}>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
        <button className="btn btn--outline" type="button" onClick={() => mutate()} disabled={saving}>
          Reload Config
        </button>
      </div>
    </div>
  );
}
