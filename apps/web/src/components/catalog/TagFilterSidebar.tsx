'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TAG_TAXONOMY, type DimensionKey, toggleTag, serializeTagsParam, parseTagsParam } from '@/lib/tag-taxonomy';

// Tree levels: each inner array is a group of dimensions shown at that depth.
// A level becomes visible only when the previous level has ≥1 active tag.
const TREE_LEVELS: DimensionKey[][] = [
  ['audience'],
  ['neckline'],
  ['material', 'fit'],
];

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
    applyTags(toggleTag(activeTags, tag));
  }

  function clearAll() {
    applyTags([]);
  }

  // Determine how many levels are currently visible
  function isLevelVisible(levelIdx: number): boolean {
    if (levelIdx === 0) return true;
    const prevDims = TREE_LEVELS[levelIdx - 1];
    return prevDims.some((dk) =>
      TAG_TAXONOMY[dk].tags.some((t) => activeTags.includes(t))
    );
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

      {/* Active tag chips */}
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

      {/* Progressive tree levels */}
      {TREE_LEVELS.map((levelDims, levelIdx) => {
        if (!isLevelVisible(levelIdx)) return null;

        const indent = levelIdx > 0;

        return (
          <div key={levelIdx} className={`tfs__level${indent ? ' tfs__level--indented' : ''}`}>
            {indent && <div className="tfs__level-connector" aria-hidden="true" />}

            {levelDims.map((dimKey) => {
              const dim = TAG_TAXONOMY[dimKey];
              const groupHasActive = dim.tags.some((t) => activeTags.includes(t));

              return (
                <details key={dimKey} className="tfs__group" open={groupHasActive || levelIdx === 0}>
                  <summary className="tfs__summary">
                    <span>{dim.label}</span>
                    <svg className="tfs__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 4l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
                            <span className="tfs__check" aria-hidden="true">
                              {isActive ? '✓' : ''}
                            </span>
                            {tag}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
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
          margin-bottom: 0.25rem;
          border-bottom: 2px solid #111;
        }
        .tfs__title {
          font-weight: 700;
          font-size: 0.9375rem;
        }
        .tfs__clear {
          font-size: 0.75rem;
          color: #888;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
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
          border-radius: 999px;
          font-size: 0.75rem;
          color: #333;
          cursor: pointer;
        }
        .tfs__chip:hover {
          background: #ddd;
        }

        /* Tree level wrapper */
        .tfs__level {
          position: relative;
        }
        .tfs__level--indented {
          margin-left: 12px;
          padding-left: 12px;
          border-left: 2px solid #e0e0e0;
          margin-top: 2px;
        }
        .tfs__level-connector {
          /* visual connector handled by border-left on parent */
        }

        .tfs__group {
          border-top: 1px solid #e5e5e5;
        }
        .tfs__level--indented .tfs__group:first-child {
          border-top: none;
        }
        .tfs__summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.65rem 0;
          cursor: pointer;
          font-weight: 600;
          list-style: none;
          user-select: none;
        }
        .tfs__summary::-webkit-details-marker {
          display: none;
        }
        details[open] .tfs__chevron {
          transform: rotate(180deg);
        }
        .tfs__chevron {
          transition: transform 0.2s;
          color: #888;
          flex-shrink: 0;
        }

        .tfs__list {
          list-style: none;
          margin: 0 0 0.75rem;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .tfs__tag {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          width: 100%;
          padding: 0.3rem 0.5rem;
          background: none;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8125rem;
          color: #333;
          text-align: left;
          transition: background 0.12s, border-color 0.12s;
        }
        .tfs__tag:hover {
          background: #f5f5f5;
          border-color: #ddd;
        }
        .tfs__tag--on {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .tfs__tag--on:hover {
          background: #333;
          border-color: #333;
        }

        .tfs__check {
          width: 14px;
          flex-shrink: 0;
          text-align: center;
          font-size: 0.75rem;
        }
      `}</style>
    </aside>
  );
}
