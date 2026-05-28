'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE_URL } from '@/lib/api-config';
import { TAG_TAXONOMY } from '@/lib/tag-taxonomy';

const ART_THEMES = TAG_TAXONOMY.artTheme.tags as unknown as string[];

type Product = {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  tags?: string[];
};

type ProductsResponse = {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export default function GalleryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTheme = searchParams.get('theme') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);

  const navigate = useCallback(
    (params: { theme?: string; q?: string; page?: number }) => {
      const sp = new URLSearchParams();
      const theme = params.theme !== undefined ? params.theme : activeTheme;
      const q = params.q !== undefined ? params.q : query;
      const pg = params.page !== undefined ? params.page : 1;
      if (theme) sp.set('theme', theme);
      if (q) sp.set('q', q);
      if (pg > 1) sp.set('page', pg.toString());
      router.push(`/gallery${sp.toString() ? `?${sp.toString()}` : ''}`);
    },
    [activeTheme, query, router]
  );

  // 构建 API URL：artTheme 产品 + 可选的主题过滤
  const tags = activeTheme ? activeTheme : ART_THEMES.join(',');
  const params = new URLSearchParams({
    tags,
    limit: '24',
    page: page.toString(),
    includeOutOfStock: 'true',
  });
  if (query) params.set('search', query);
  const apiUrl = `${API_BASE_URL}/products?${params.toString()}`;

  const { data, isLoading } = useSWR<ProductsResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const products = data?.data || [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const breadcrumbTitle = activeTheme || (query ? `Search: "${query}"` : 'All Artwork');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput, theme: '', page: 1 });
  };

  return (
    <div className="gallery-layout">
      <div className="gallery-main">
        {/* 面包屑 */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <ol>
            <li><Link href="/gallery">Gallery</Link></li>
            {(activeTheme || query) && (
              <>
                <li>›</li>
                <li>{breadcrumbTitle}</li>
              </>
            )}
          </ol>
        </nav>

        <div className="gallery-main__header">
          <h1 className="plp-new__title">{breadcrumbTitle}</h1>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="gallery-search">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search artwork..."
              className="gallery-search__input"
              aria-label="Search artwork"
            />
            <button type="submit" className="gallery-search__btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </form>
        </div>

        {/* Art Theme pill 导航 */}
        <div className="gallery-pills">
          <button
            className={`gallery-pill ${!activeTheme ? 'is-active' : ''}`}
            onClick={() => navigate({ theme: '', page: 1 })}
            type="button"
          >
            All
          </button>
          {ART_THEMES.map((theme) => (
            <button
              key={theme}
              className={`gallery-pill ${activeTheme === theme ? 'is-active' : ''}`}
              onClick={() => navigate({ theme, page: 1 })}
              type="button"
            >
              {theme}
            </button>
          ))}
        </div>

        {!isLoading && (
          <p className="plp-new__count">
            {total} {total === 1 ? 'artwork' : 'artworks'}
          </p>
        )}

        {isLoading && (
          <div className="plp-new__loading">
            <p>Loading artwork...</p>
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="plp-new__empty">
            <p>No artwork found{activeTheme ? ` in "${activeTheme}"` : ''}.</p>
            <button
              onClick={() => navigate({ theme: '', page: 1 })}
              style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              type="button"
            >
              Browse all artwork
            </button>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <>
            <div className="gallery-grid">
              {products.map((product) => {
                const imageUrl =
                  product.primaryImage?.url ||
                  product.images?.[0]?.url ||
                  '/assets/hero/hero-card-tee.jpg';
                const priceVal = product.price?.base ?? 0;
                return (
                  <article key={product.id} className="gallery-card">
                    <Link
                      href={`/design-lab?artUrl=${encodeURIComponent(imageUrl)}&artName=${encodeURIComponent(product.name)}`}
                      className="gallery-card__image-link"
                    >
                      <div className="gallery-card__image">
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={400}
                          height={400}
                          sizes="(max-width: 768px) 50vw, 220px"
                        />
                      </div>
                    </Link>
                    <div className="gallery-card__info">
                      <h3 className="gallery-card__title">{product.name}</h3>
                      {priceVal > 0 && (
                        <p className="gallery-card__price">${(priceVal / 100).toFixed(2)}/ea</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="gallery-pagination">
                <button
                  onClick={() => navigate({ page: page - 1 })}
                  disabled={page <= 1}
                  className="gallery-pagination__btn"
                  type="button"
                >
                  ← Previous
                </button>
                <span className="gallery-pagination__info">Page {page} of {totalPages}</span>
                <button
                  onClick={() => navigate({ page: page + 1 })}
                  disabled={page >= totalPages}
                  className="gallery-pagination__btn"
                  type="button"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .gallery-layout {
          width: 100%;
        }

        /* ── Main ── */
        .gallery-main {
          width: 100%;
        }
        .gallery-main__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        /* ── Search ── */
        .gallery-search {
          display: flex;
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
          min-width: 220px;
        }
        .gallery-search__input {
          flex: 1;
          padding: 8px 12px;
          border: none;
          outline: none;
          font-size: 14px;
          color: #121212;
          background: transparent;
        }
        .gallery-search__btn {
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
        }
        .gallery-search__btn:hover {
          color: #121212;
        }

        /* ── Pills ── */
        .gallery-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .gallery-pill {
          padding: 6px 14px;
          border: 1px solid #d1d5db;
          border-radius: 9999px;
          background: #fff;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }
        .gallery-pill:hover {
          border-color: #9ca3af;
          background: #f9fafb;
        }
        .gallery-pill.is-active {
          background: var(--color-accent, #B40C1C);
          border-color: var(--color-accent, #B40C1C);
          color: #fff;
          font-weight: 600;
        }

        /* ── Grid ── */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 8px;
        }

        /* ── Card ── */
        .gallery-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .gallery-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .gallery-card__image-link {
          display: block;
          text-decoration: none;
        }
        .gallery-card__image {
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #f9fafb;
          overflow: hidden;
          position: relative;
        }
        .gallery-card__image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.3s;
        }
        .gallery-card:hover .gallery-card__image img {
          transform: scale(1.04);
        }
        .gallery-card__info {
          padding: 10px 12px 12px;
        }
        .gallery-card__title {
          font-size: 13px;
          font-weight: 500;
          color: #121212;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gallery-card__price {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        /* ── Pagination ── */
        .gallery-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 40px;
        }
        .gallery-pagination__btn {
          padding: 8px 20px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }
        .gallery-pagination__btn:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        .gallery-pagination__btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .gallery-pagination__info {
          font-size: 14px;
          color: #6b7280;
        }

        /* ── Breadcrumb ── */
        .breadcrumb-nav {
          margin-bottom: 12px;
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

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
