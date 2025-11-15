'use client';

import { useState } from 'react';

interface ContentImage {
  id: string;
  label: string;
  placeholder: string;
  value: string;
}

const HERO_ITEMS: ContentImage[] = [
  { id: 'hero-tee', label: 'T-Shirt Card', placeholder: '/assets/hero/hero-card-tee.jpg', value: '' },
  { id: 'hero-bottle', label: 'Water Bottle Card', placeholder: '/assets/hero/hero-card-bottle.jpg', value: '' },
  { id: 'hero-hat', label: 'Hat Card', placeholder: '/assets/hero/hero-card-hat.jpg', value: '' },
  { id: 'hero-bag', label: 'Tote Bag Card', placeholder: '/assets/hero/hero-card-bag.jpg', value: '' },
];

const BRAND_LOGOS = ['Nike', 'Adidas', 'Canada Goose', 'Shopify'];

const CATEGORY_ITEMS: ContentImage[] = [
  { id: 'category-apparel', label: 'Apparel', placeholder: '/assets/category/apparel.jpg', value: '' },
  { id: 'category-bags', label: 'Bags', placeholder: '/assets/category/bags.jpg', value: '' },
  { id: 'category-drinkware', label: 'Drinkware', placeholder: '/assets/category/drinkware.jpg', value: '' },
];

export default function ContentManagerPage() {
  const [hero, setHero] = useState(HERO_ITEMS);
  const [categories, setCategories] = useState(CATEGORY_ITEMS);

  const updateHero = (id: string, value: string) => {
    setHero((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const updateCategory = (id: string, value: string) => {
    setCategories((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const handleSave = () => {
    alert('Content saved (demo only).');
  };

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
          {hero.map((item) => (
            <ContentImageField key={item.id} item={item} onChange={(value) => updateHero(item.id, value)} />
          ))}
        </div>
      </section>

      <section className="content-section">
        <h2>Brand Logos</h2>
        <p className="text-muted">Brand logos displayed on homepage</p>
        <div className="image-grid">
          {BRAND_LOGOS.map((brand) => (
            <div key={brand} className="image-item">
              <label>{brand}</label>
              <div className="image-preview" aria-hidden="true">
                <div className="placeholder-preview">Logo placeholder</div>
              </div>
              <div className="image-info">
                <input type="text" placeholder={`/assets/logos/${brand.toLowerCase().replace(/\s+/g, '-')}.svg`} readOnly />
                <button className="btn btn-sm" disabled>
                  Update
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <h2>Category Images</h2>
        <p className="text-muted">Product category images</p>
        <div className="image-grid">
          {categories.map((item) => (
            <ContentImageField key={item.id} item={item} onChange={(value) => updateCategory(item.id, value)} />
          ))}
        </div>
      </section>

      <div className="content-actions" style={{ marginTop: 24 }}>
        <button className="btn btn--primary" onClick={handleSave}>
          Save All Changes
        </button>
        <button className="btn btn--outline" type="button" disabled>
          Reload Config
        </button>
      </div>
    </div>
  );
}

function ContentImageField({ item, onChange }: { item: ContentImage; onChange: (value: string) => void }) {
  return (
    <div className="image-item">
      <label>{item.label}</label>
      <div className="image-preview">
        <div className="placeholder-preview">点击上传图片</div>
        <input type="file" accept="image/*" disabled />
      </div>
      <div className="image-info">
        <input
          type="text"
          className="image-url"
          placeholder={item.placeholder}
          value={item.value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="btn btn-sm" type="button" disabled>
          Update
        </button>
      </div>
    </div>
  );
}
