'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TAG_TAXONOMY, type DimensionKey, serializeTagsParam, parseTagsParam } from '@/lib/tag-taxonomy';

// audience is handled by the nav tree L2; only show neckline (material/fit tags not yet in product data)
const FILTER_DIMS: DimensionKey[] = ['neckline'];

const ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '3px 8px',
  borderRadius: '6px',
  border: '1px solid transparent',
  boxSizing: 'border-box',
  transition: 'background 0.12s, color 0.12s',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  fontSize: '0.8125rem',
};

export function TagFilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTags = parseTagsParam(searchParams?.get('tags') ?? null);
  const hasActiveFilters = FILTER_DIMS.some((dim) =>
    (TAG_TAXONOMY[dim].tags as unknown as string[]).some((t) => activeTags.includes(t))
  );

  function applyTags(nextTags: string[]) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (nextTags.length > 0) {
      params.set('tags', serializeTagsParam(nextTags));
    } else {
      params.delete('tags');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    applyTags(next);
  }

  function clearFilters() {
    const keep = activeTags.filter(
      (t) => !FILTER_DIMS.some((dim) => (TAG_TAXONOMY[dim].tags as unknown as string[]).includes(t))
    );
    applyTags(keep);
  }

  return (
    <>
      <nav className="tfp" style={{ marginTop: '20px' }}>
        {/* Header — mirrors tnt__root style */}
        <div className="tfp__head">
          <span>Filters</span>
          {hasActiveFilters && (
            <button type="button" className="tfp__clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

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

        /* +/− toggle icon — same pattern as tnt */
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

        /* Items — same link-pill style as tnt links */
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
      `}</style>
    </>
  );
}
