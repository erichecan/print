/**
 * Art Panel - 艺术素材面板
 * 显示带 artTheme 标签的产品，单屏：搜索 + 主题 pills + 3列网格 + 数字分页
 * 页面大小由 ResizeObserver 动态计算，保证不出现纵向滚动条
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TAG_TAXONOMY } from '@/lib/tag-taxonomy';
import { API_BASE_URL } from '@/lib/api-config';
import useSWR from 'swr';

const ART_THEMES = TAG_TAXONOMY.artTheme.tags as unknown as string[];

const ITEM_H = 88;  // px，与 CSS height 一致
const ITEM_GAP = 6; // px，与 CSS gap 一致
const COLS = 3;
const MIN_ROWS = 2;

type ArtProduct = {
  id: string;
  name: string;
  slug: string;
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  tags?: string[];
};

type ProductsResponse = {
  data: ArtProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

function getPageRange(current: number, total: number): (number | 'ellipsis-l' | 'ellipsis-r')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) { start = 2; end = Math.min(total - 1, 5); }
  if (current >= total - 2) { end = total - 1; start = Math.max(2, total - 4); }
  const result: (number | 'ellipsis-l' | 'ellipsis-r')[] = [1];
  if (start > 2) result.push('ellipsis-l');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < total - 1) result.push('ellipsis-r');
  result.push(total);
  return result;
}

interface ArtPanelProps {
  onSelectArt: (artUrl: string, artName: string) => void;
  isMobile?: boolean;
}

const ArtPanel: React.FC<ArtPanelProps> = ({ onSelectArt }) => {
  const [activeTheme, setActiveTheme] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetsRef = useRef<HTMLDivElement>(null);

  // ResizeObserver: 动态计算每页显示的图片数量，让内容恰好填满不出滚动条
  useEffect(() => {
    const el = assetsRef.current;
    if (!el) return;
    const recalc = () => {
      const h = el.clientHeight;
      const rows = Math.max(MIN_ROWS, Math.floor((h + ITEM_GAP) / (ITEM_H + ITEM_GAP)));
      setPageSize(rows * COLS);
    };
    recalc();
    const obs = new ResizeObserver(recalc);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 构建 API URL
  const tags = activeTheme || ART_THEMES.join(',');
  const params = new URLSearchParams({
    tags,
    limit: String(pageSize),
    page: String(page),
    includeOutOfStock: 'true',
  });
  if (debouncedSearch) params.set('search', debouncedSearch);
  const apiUrl = `${API_BASE_URL}/products?${params.toString()}`;

  const { data, isLoading, error } = useSWR<ProductsResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const artworks = data?.data || [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleThemeClick = useCallback((theme: string) => {
    setActiveTheme(prev => prev === theme ? '' : theme);
    setPage(1);
    setSearchInput('');
    setDebouncedSearch('');
  }, []);

  const getImageUrl = (product: ArtProduct): string | null => {
    return product.primaryImage?.url || product.images?.[0]?.url || null;
  };

  const pageRange = getPageRange(page, totalPages);

  return (
    <div className="dl-art-panel">
      {/* 搜索栏 */}
      <div className="dl-art-panel__header">
        <h2 className="dl-art-panel__title">Add Art</h2>
        <div className="dl-art-panel__search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dl-art-panel__search-icon">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="dl-art-panel__search-input"
            placeholder="Search artwork..."
            value={searchInput}
            onChange={handleSearchChange}
            data-testid="art-search-input"
          />
        </div>
      </div>

      {/* 主题 pills */}
      <div className="dl-art-panel__pills">
        <button
          type="button"
          className={`dl-art-panel__pill ${activeTheme === '' ? 'is-active' : ''}`}
          onClick={() => handleThemeClick('')}
        >
          All
        </button>
        {ART_THEMES.map(theme => (
          <button
            key={theme}
            type="button"
            className={`dl-art-panel__pill ${activeTheme === theme ? 'is-active' : ''}`}
            onClick={() => handleThemeClick(theme)}
          >
            {theme}
          </button>
        ))}
      </div>

      {/* 计数 */}
      <div className="dl-art-panel__count">
        {!isLoading && `${total} artwork${total !== 1 ? 's' : ''}`}
      </div>

      {/* 艺术品网格 */}
      <div className="dl-art-panel__assets" ref={assetsRef}>
        {isLoading && <div className="dl-art-panel__loading">Loading...</div>}
        {!isLoading && error && <div className="dl-art-panel__error">Failed to load artworks</div>}
        {!isLoading && !error && artworks.length === 0 && (
          <div className="dl-art-panel__empty">No artworks found</div>
        )}
        {artworks.length > 0 && (
          <div className="dl-art-panel__assets-grid">
            {artworks.map(artwork => {
              const imgUrl = getImageUrl(artwork);
              return (
                <button
                  key={artwork.id}
                  type="button"
                  className="dl-art-panel__asset-item"
                  onClick={() => {
                    if (imgUrl) onSelectArt(imgUrl, artwork.name);
                  }}
                  title={artwork.name}
                  data-testid={`artwork-${artwork.slug}`}
                >
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl} alt={artwork.name} loading="lazy" />
                  ) : (
                    <div className="dl-art-panel__asset-placeholder">🎨</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 数字分页 */}
      {totalPages > 1 && (
        <div className="dl-art-panel__pagination">
          <button
            type="button"
            className="dl-art-panel__page-btn"
            onClick={() => setPage(p => p - 1)}
            disabled={page <= 1}
          >
            ‹
          </button>
          {pageRange.map((item, idx) =>
            item === 'ellipsis-l' || item === 'ellipsis-r' ? (
              <span key={item} className="dl-art-panel__page-ellipsis">…</span>
            ) : (
              <button
                key={`p-${item}`}
                type="button"
                className={`dl-art-panel__page-btn ${item === page ? 'is-current' : ''}`}
                onClick={() => setPage(item as number)}
                disabled={item === page}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className="dl-art-panel__page-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ArtPanel;
