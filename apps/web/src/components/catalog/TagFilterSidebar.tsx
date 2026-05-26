'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TAG_TAXONOMY, type DimensionKey, serializeTagsParam, parseTagsParam } from '@/lib/tag-taxonomy';

const DIMENSIONS: DimensionKey[] = ['audience', 'neckline', 'material', 'fit'];

interface TagFilterSidebarProps {
  fixedTag?: string;
}

export function TagFilterSidebar({ fixedTag }: TagFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTags = parseTagsParam(searchParams.get('tags'));
  const hasActive = activeTags.length > 0;

  function applyTags(nextTags: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTags.length > 0) {
      params.set('tags', serializeTagsParam(nextTags));
    } else {
      params.delete('tags');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleTagClick(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    applyTags(next);
  }

  function clearAll() {
    applyTags([]);
  }

  return (
    <aside className="tfs">
      <div className="tfs__head">
        <span className="tfs__title">筛选</span>
        {hasActive && (
          <button type="button" className="tfs__clear" onClick={clearAll}>
            清除全部
          </button>
        )}
      </div>

      {hasActive && (
        <div className="tfs__chips">
          {activeTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tfs__chip"
              onClick={() => handleTagClick(tag)}
              aria-label={`移除 ${tag}`}
            >
              {tag} ×
            </button>
          ))}
        </div>
      )}

      {DIMENSIONS.map((dimKey) => {
        const dim = TAG_TAXONOMY[dimKey];
        const groupHasActive = dim.tags.some((t) => activeTags.includes(t));

        return (
          <details key={dimKey} className="tfs__group" open={groupHasActive}>
            <summary className="tfs__summary">
              <span>{dim.label}</span>
              <span className="tfs__toggle-icon" aria-hidden="true" />
            </summary>
            <ul className="tfs__list">
              {dim.tags.map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      className={`tfs__tag${isActive ? ' tfs__tag--on' : ''}`}
                      onClick={() => handleTagClick(tag)}
                      aria-pressed={isActive}
                    >
                      <span className="tfs__check" aria-hidden="true" />
                      {tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}

      <style jsx>{`
        .tfs {
          width: 210px;
          flex-shrink: 0;
          font-size: 0.875rem;
        }

        .tfs__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 0.75rem;
          margin-bottom: 0;
          border-bottom: 2px solid #111;
        }

        .tfs__title {
          font-weight: 700;
          font-size: 0.9375rem;
          color: #121212;
        }

        .tfs__clear {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #737373;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }

        .tfs__clear:hover {
          color: #121212;
        }

        .tfs__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin: 0.5rem 0 0.75rem;
        }

        .tfs__chip {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.2rem 0.55rem;
          background: #eee;
          border: none;
          border-radius: 0;
          font-size: 0.75rem;
          color: #333;
          cursor: pointer;
          transition: background 0.15s;
        }

        .tfs__chip:hover {
          background: #ddd;
        }

        .tfs__group {
          border-bottom: 1px solid #DBDBDB;
          padding: 16px 0;
        }

        .tfs__group:last-of-type {
          border-bottom: none;
        }

        .tfs__summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0;
          cursor: pointer;
          list-style: none;
          user-select: none;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #121212;
          line-height: 1.4;
        }

        .tfs__summary::-webkit-details-marker {
          display: none;
        }

        .tfs__toggle-icon {
          font-size: 16px;
          color: #737373;
          font-weight: 300;
          line-height: 1;
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }

        details:not([open]) .tfs__toggle-icon::before {
          content: '+';
        }

        details[open] .tfs__toggle-icon::before {
          content: '−';
        }

        .tfs__list {
          list-style: none;
          margin: 14px 0 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .tfs__tag {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 1px 0;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: #737373;
          text-align: left;
          transition: color 0.15s;
          font-family: "Instrument Sans", sans-serif;
          line-height: 1.4;
        }

        .tfs__tag:hover {
          color: #121212;
        }

        .tfs__tag--on {
          color: #121212;
        }

        .tfs__check {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 1px solid #737373;
          border-radius: 0;
          flex-shrink: 0;
          position: relative;
          transition: border-color 0.15s, background 0.15s;
          box-sizing: border-box;
        }

        .tfs__tag--on .tfs__check {
          background-color: #000;
          border-color: #000;
        }

        .tfs__tag--on .tfs__check::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: 2px solid #fff;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
        }
      `}</style>
    </aside>
  );
}
