'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import useSWR from 'swr';
import { TagFilterSidebar } from '@/components/catalog/TagFilterSidebar';
import { GARMENT_SLUG_TO_TAG, parseTagsParam } from '@/lib/tag-taxonomy';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  price?: { base: number };
  images?: Array<{ url: string; alt?: string }>;
  tags?: string[];
  category?: { name: string; slug: string };
}

interface CatalogGroupClientProps {
  groupSlug: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export function CatalogGroupClient({ groupSlug }: CatalogGroupClientProps) {
  const searchParams = useSearchParams();
  const [groupName, setGroupName] = useState<string>('');

  const garmentTag = GARMENT_SLUG_TO_TAG[groupSlug];
  const extraTags = parseTagsParam(searchParams.get('tags'));
  const allTags = garmentTag ? [garmentTag, ...extraTags] : extraTags;

  useEffect(() => {
    setGroupName(
      garmentTag
        ? garmentTag + 's'
        : groupSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }, [garmentTag, groupSlug]);

  const apiUrl =
    allTags.length > 0
      ? `${API_BASE_URL}/products?tags=${encodeURIComponent(allTags.join(','))}&limit=48&includeOutOfStock=true`
      : `${API_BASE_URL}/products?limit=48&includeOutOfStock=true`;

  const { data, error, isLoading } = useSWR<{
    data: Product[];
    pagination: { total: number };
  }>(apiUrl, fetcher, { revalidateOnFocus: false });

  const products = data?.data || [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="cg-layout">
      <TagFilterSidebar fixedTag={garmentTag} />

      <div className="cg-main">
        <nav className="breadcrumb-nav">
          <ol>
            <li>
              <Link href="/products">All Products</Link>
            </li>
            <li>›</li>
            <li>{groupName}</li>
          </ol>
        </nav>

        <h1 className="plp-new__title">{groupName}</h1>

        {!isLoading && (
          <p className="plp-new__count">
            {total} {total === 1 ? 'product' : 'products'}
            {extraTags.length > 0 && (
              <span className="cg-filter-hint"> · filtered by: {extraTags.join(', ')}</span>
            )}
          </p>
        )}

        {isLoading && (
          <div className="plp-new__loading">
            <p>Loading products...</p>
          </div>
        )}
        {error && (
          <div className="plp-new__error">
            <p>Failed to load products.</p>
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="product-grid-new">
            {products.map((product) => {
              const imageUrl =
                product.images?.[0]?.url || '/assets/hero/hero-card-tee.jpg';
              const priceVal =
                product.price?.base ?? product.basePrice / 100;
              return (
                <article key={product.id} className="product-card-new">
                  <Link
                    href={`/products/${product.slug}`}
                    className="product-card-new__image-link"
                  >
                    <div className="product-card-new__image">
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        width={480}
                        height={600}
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                  </Link>
                  <div className="product-card-new__info">
                    <h3 className="product-card-new__title">{product.name}</h3>
                    <div className="product-card-new__price-row">
                      <div className="product-card-new__price">
                        <span className="price-amount">${priceVal.toFixed(2)}/ea</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="plp-new__empty">
            <p>
              No products found
              {extraTags.length > 0 ? ' for these filters' : ''}.
            </p>
            <Link href="/products">Browse all products</Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .cg-layout {
          display: flex;
          gap: 32px;
          align-items: flex-start;
        }
        .cg-main {
          flex: 1;
          min-width: 0;
        }
        .cg-filter-hint {
          color: #6b7280;
          font-style: italic;
        }
        .breadcrumb-nav {
          margin-bottom: 16px;
        }
        .breadcrumb-nav ol {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }
        .breadcrumb-nav a {
          color: var(--color-accent, #B40C1C);
          text-decoration: none;
        }
        .breadcrumb-nav a:hover {
          text-decoration: underline;
        }
        .plp-new__title {
          font-size: 32px;
          font-weight: 400;
          font-family: var(--font-heading, 'Marcellus', serif);
          color: var(--color-text, #121212);
          margin: 0 0 8px 0;
        }
        .plp-new__count {
          font-size: 14px;
          color: var(--color-text-muted, #737373);
          margin: 0 0 24px 0;
        }
        .plp-new__loading,
        .plp-new__error,
        .plp-new__empty {
          padding: 48px;
          text-align: center;
          color: var(--color-text-muted, #737373);
        }
        .plp-new__error {
          color: var(--color-accent, #B40C1C);
        }
      `}</style>
    </div>
  );
}
