'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TAG_TAXONOMY, type DimensionKey, serializeTagsParam, parseTagsParam } from '@/lib/tag-taxonomy';

// audience is handled by the nav tree L2; only show neckline (material/fit tags not yet in product data)
const FILTER_DIMS: DimensionKey[] = ['neckline'];

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

  const activeTags = parseTagsParam(searchParams?.get('tags') ?? null);
  const activeSizes = parseTagsParam(searchParams?.get('size') ?? null);
  const activeMinPrice = searchParams?.get('minPrice') ?? null;
  const activeMaxPrice = searchParams?.get('maxPrice') ?? null;

  const hasActiveTagFilters = FILTER_DIMS.some((dim) =>
    (TAG_TAXONOMY[dim].tags as unknown as string[]).some((t) => activeTags.includes(t))
  );
  const hasActiveSizeFilters = activeSizes.length > 0;
  const hasActivePriceFilter = activeMinPrice !== null || activeMaxPrice !== null;
  const hasActiveFilters = hasActiveTagFilters || hasActiveSizeFilters || hasActivePriceFilter;

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
    const keepTags = activeTags.filter(
      (t) => !FILTER_DIMS.some((dim) => (TAG_TAXONOMY[dim].tags as unknown as string[]).includes(t))
    );
    pushParams({
      tags: keepTags.length > 0 ? serializeTagsParam(keepTags) : null,
      size: null,
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

        {/* Neckline filter (from TAG_TAXONOMY) */}
        {FILTER_DIMS.map((dimKey) => {
          const dim = TAG_TAXONOMY[dimKey];
          const dimTags = dim.tags as unknown as string[];
          const groupOpen = dimTags.some((t) => activeTags.includes(t));

          return (
            <details key={dimKey} className="tfp__group" open={groupOpen}>
              <summary className="tfp__summary">
                <span>{dim.label}</span>
                <span className="tfp__chevron" aria-hidden="true" />
              </summary>
              <ul className="tfp__list">
                {dimTags.map((tag) => {
                  const isActive = activeTags.includes(tag);
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        className={`tfp__item${isActive ? ' tfp__item--active' : ''}`}
                        onClick={() => toggleTag(tag)}
                        aria-pressed={isActive}
                      >
                        {tag}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}

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
