'use client';

import useSWR from 'swr';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { serializeTagsParam, parseTagsParam } from '@/lib/tag-taxonomy';
import { productsApi } from '@/lib/api';

// Gildan 标准色准确 hex（DB 存储的 hex 值不准确，以此为准）
// 只有出现在此映射表中的颜色才会显示为色块（仅保留 canonical 名称，别名通过 COLOR_ALIASES 处理）
// 灰色系只保留四档：Ash（浅）/ Sport Grey（中）/ Charcoal（深）/ Dark Heather（深杂）
const COLOR_HEX_MAP: Record<string, string> = {
  // 中性
  'White':          '#FFFFFF',
  'Black':          '#111111',
  'Ash':            '#C9C9C9',
  'Sport Grey':     '#9EA3A8',
  'Charcoal':       '#3D3D3D',
  'Dark Heather':   '#4A4A4A',
  'Natural':        '#F5F0E1',
  'Vintage White':  '#EDE8D5',
  // 蓝色系
  'Navy':           '#1B2A4A',
  'Royal Blue':     '#1F4DAA',
  'Sapphire':       '#0E4F8F',
  'Indigo':         '#3B3C8C',
  'Carolina Blue':  '#82B4D8',
  'Light Blue':     '#A8D0E6',
  'Turquoise':      '#00A9C0',
  // 红色系
  'Red':            '#CC2529',
  'Cherry Red':     '#B22040',
  'Cardinal Red':   '#8B1A2D',
  'Maroon':         '#5C1A2A',
  'Heliconia':      '#CD2C6E',
  'Azalea':         '#E8638E',
  'Coral':          '#E8604C',
  'Light Pink':     '#F5AABB',
  // 黄/橙
  'Daisy':          '#F5C842',
  'Gold':           '#D4A800',
  'Orange':         '#E5581A',
  'Safety Orange':  '#FF6600',
  // 紫色系
  'Purple':         '#6B3F8F',
  'Violet':         '#5B3D8F',
  // 绿色系
  'Irish Green':    '#2A7B3F',
  'Forest Green':   '#2D5C34',
  'Military Green': '#3E4A2F',
  'Lime':           '#93C83D',
  // 棕/土
  'Brown':          '#5C3A1E',
  'Sand':           '#C8B880',
  'Tan':            '#C8A87A',
};

// DB 中存在拼写变体，映射到同一个色块。canonical 名称 → 所有 DB 颜色名
const COLOR_ALIASES: Record<string, string[]> = {
  'Sport Grey': ['Sport Grey', 'Sports Grey'],
  'Royal Blue': ['Royal Blue', 'Royal'],
};

function getColorDbNames(canonical: string): string[] {
  return COLOR_ALIASES[canonical] ?? [canonical];
}

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const PRICE_RANGES = [
  { label: 'Under $15', min: null, max: 15 },
  { label: '$15 – $30', min: 15, max: 30 },
  { label: '$30 – $50', min: 30, max: 50 },
  { label: '$50+', min: 50, max: null },
] as const;

export function TagFilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: filterOptions } = useSWR(
    'filter-options',
    () => productsApi.getFilterOptions(),
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
  const colorOptions = filterOptions?.colors ?? [];

  const activeTags = parseTagsParam(searchParams?.get('tags') ?? null);
  const activeSizes = parseTagsParam(searchParams?.get('size') ?? null);
  const activeColors = parseTagsParam(searchParams?.get('color') ?? null);
  const activeMinPrice = searchParams?.get('minPrice') ?? null;
  const activeMaxPrice = searchParams?.get('maxPrice') ?? null;

  const hasActiveSizeFilters = activeSizes.length > 0;
  const hasActiveColorFilters = activeColors.length > 0;
  const hasActivePriceFilter = activeMinPrice !== null || activeMaxPrice !== null;
  const hasActiveFilters = hasActiveSizeFilters || hasActiveColorFilters || hasActivePriceFilter;

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyTags(nextTags: string[]) {
    pushParams({ tags: nextTags.length > 0 ? serializeTagsParam(nextTags) : null });
  }

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    applyTags(next);
  }

  function toggleSize(size: string) {
    const next = activeSizes.includes(size)
      ? activeSizes.filter((s) => s !== size)
      : [...activeSizes, size];
    pushParams({ size: next.length > 0 ? next.join(',') : null });
  }

  function toggleColor(canonical: string) {
    const dbNames = getColorDbNames(canonical);
    const isCurrentlyActive = dbNames.some((n) => activeColors.includes(n));
    const next = isCurrentlyActive
      ? activeColors.filter((c) => !dbNames.includes(c))
      : [...activeColors.filter((c) => !dbNames.includes(c)), ...dbNames];
    pushParams({ color: next.length > 0 ? next.join(',') : null });
  }

  function selectPriceRange(min: number | null, max: number | null) {
    const currentMin = activeMinPrice !== null ? parseFloat(activeMinPrice) : null;
    const currentMax = activeMaxPrice !== null ? parseFloat(activeMaxPrice) : null;
    const isSame = currentMin === min && currentMax === max;
    if (isSame) {
      pushParams({ minPrice: null, maxPrice: null });
    } else {
      pushParams({
        minPrice: min !== null ? String(min) : null,
        maxPrice: max !== null ? String(max) : null,
      });
    }
  }

  function clearFilters() {
    pushParams({
      tags: activeTags.length > 0 ? serializeTagsParam(activeTags) : null,
      size: null,
      color: null,
      minPrice: null,
      maxPrice: null,
    });
  }

  return (
    <>
      <nav className="tfp" style={{ marginTop: '20px' }}>
        {/* Header */}
        <div className="tfp__head">
          <span>Filters</span>
          {hasActiveFilters && (
            <button type="button" className="tfp__clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {/* Color filter */}
        {colorOptions.length > 0 && (
          <details className="tfp__group" open={hasActiveColorFilters}>
            <summary className="tfp__summary">
              <span>Color</span>
              <span className="tfp__chevron" aria-hidden="true" />
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '3px', paddingBottom: '15px' }}>
              {colorOptions
                .filter(({ name }) => name in COLOR_HEX_MAP)
                .map(({ name }) => {
                  const hex = COLOR_HEX_MAP[name];
                  const dbNames = getColorDbNames(name);
                  const isActive = dbNames.some((n) => activeColors.includes(n));
                  const isLight = hex === '#FFFFFF' || hex === '#EDE8D5' || hex === '#F5F0E1';
                  return (
                    <span
                      key={name}
                      role="button"
                      tabIndex={0}
                      title={name}
                      aria-label={name}
                      aria-pressed={isActive}
                      onClick={() => toggleColor(name)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleColor(name)}
                      style={{
                        display: 'inline-block',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        outline: isActive ? '1px solid #111' : isLight ? '1px solid #ccc' : 'none',
                        outlineOffset: '1px',
                        backgroundColor: hex,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
            </div>
          </details>
        )}

        {/* Size filter */}
        <details className="tfp__group" open={hasActiveSizeFilters}>
          <summary className="tfp__summary">
            <span>Size</span>
            <span className="tfp__chevron" aria-hidden="true" />
          </summary>
          <div className="tfp__size-grid">
            {SIZES.map((size) => {
              const isActive = activeSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  className={`tfp__size${isActive ? ' tfp__size--active' : ''}`}
                  onClick={() => toggleSize(size)}
                  aria-pressed={isActive}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </details>

        {/* Price range filter */}
        <details className="tfp__group" open={hasActivePriceFilter}>
          <summary className="tfp__summary">
            <span>Price</span>
            <span className="tfp__chevron" aria-hidden="true" />
          </summary>
          <ul className="tfp__list">
            {PRICE_RANGES.map((range) => {
              const currentMin = activeMinPrice !== null ? parseFloat(activeMinPrice) : null;
              const currentMax = activeMaxPrice !== null ? parseFloat(activeMaxPrice) : null;
              const isActive = currentMin === range.min && currentMax === range.max;
              return (
                <li key={range.label}>
                  <button
                    type="button"
                    className={`tfp__item${isActive ? ' tfp__item--active' : ''}`}
                    onClick={() => selectPriceRange(range.min, range.max)}
                    aria-pressed={isActive}
                  >
                    {range.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </nav>

      <style jsx>{`
        .tfp {
          font-size: 0.875rem;
        }

        /* ── Header ── */
        .tfp__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-weight: 700;
          font-size: 0.9375rem;
          color: #111;
          padding-bottom: 0.75rem;
          margin-bottom: 0.25rem;
          border-bottom: 2px solid #111;
        }

        .tfp__clear {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #737373;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          transition: color 0.15s;
        }

        .tfp__clear:hover {
          color: #111;
        }

        /* ── Collapsible group ── */
        .tfp__group {
          border-bottom: 1px solid #e5e5e5;
        }

        .tfp__summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          cursor: pointer;
          list-style: none;
          user-select: none;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #333;
        }

        .tfp__summary::-webkit-details-marker {
          display: none;
        }

        .tfp__chevron {
          font-size: 16px;
          color: #737373;
          font-weight: 300;
          line-height: 1;
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }

        details:not([open]) .tfp__chevron::before {
          content: '+';
        }

        details[open] .tfp__chevron::before {
          content: '−';
        }

        /* ── Item list ── */
        .tfp__list {
          list-style: none;
          padding: 0 0 12px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Items — pill style */
        .tfp__item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
          box-sizing: border-box;
          transition: background 0.12s, color 0.12s;
          background: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: 0.8125rem;
          color: #555;
        }

        .tfp__item:hover {
          background: #f5f5f5;
          border-color: #ddd;
          color: #111;
        }

        .tfp__item--active {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .tfp__item--active:hover {
          background: #333;
          border-color: #333;
          color: #fff;
        }

        /* ── Color swatches grid ── */
        .tfp__swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding-bottom: 12px;
        }

        .tfp__swatch {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          border: 1px solid transparent;
          padding: 0;
          box-sizing: border-box;
          cursor: pointer;
          transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
          flex-shrink: 0;
        }

        .tfp__swatch:hover {
          transform: scale(1.25);
        }

        .tfp__swatch--active {
          border-color: #111;
          box-shadow: 0 0 0 1px #111;
        }

        /* ── Size grid ── */
        .tfp__size-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding-bottom: 12px;
        }

        .tfp__size {
          padding: 5px 4px;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 500;
          color: #555;
          text-align: center;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }

        .tfp__size:hover {
          background: #f5f5f5;
          border-color: #999;
          color: #111;
        }

        .tfp__size--active {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .tfp__size--active:hover {
          background: #333;
          border-color: #333;
        }
      `}</style>
    </>
  );
}
