'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { parseTagsParam, TAG_TAXONOMY } from '@/lib/tag-taxonomy';

const GARMENT_TYPES = TAG_TAXONOMY.garmentType.tags as unknown as string[];
const AUDIENCES = TAG_TAXONOMY.audience.tags as unknown as string[];
const NECKLINES = TAG_TAXONOMY.neckline.tags as unknown as string[];

const ACTIVE_STYLE: React.CSSProperties = { background: '#111', color: '#fff', borderColor: '#111' };

function buildTagsHref(tags: string[]): string {
  if (tags.length === 0) return '/products';
  return `/products?tags=${encodeURIComponent(tags.join(','))}`;
}

export function TagNavTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTags = parseTagsParam(searchParams?.get('tags') ?? null);
  const activeGarment = GARMENT_TYPES.find((g) => activeTags.includes(g)) ?? null;
  const activeAudience = AUDIENCES.find((a) => activeTags.includes(a)) ?? null;

  const isRoot = pathname === '/products' && !activeGarment;

  return (
    <nav className="tnt">
      {/* Header — mirrors tfp__head */}
      <div className="tnt__head">
        <span>Categories</span>
      </div>

      <ul className="tnt__l1">
        {/* All Products */}
        <li>
          <Link
            href="/products"
            className="tnt__item"
            style={isRoot ? ACTIVE_STYLE : undefined}
          >
            All Products
          </Link>
        </li>

        {GARMENT_TYPES.map((garment) => {
          const isL1Active = activeGarment === garment;
          const tagsWithoutTree = activeTags.filter(
            (t) => !GARMENT_TYPES.includes(t) && !AUDIENCES.includes(t) && !NECKLINES.includes(t)
          );
          const l1Tags = isL1Active ? tagsWithoutTree : [garment, ...tagsWithoutTree];
          const l1Href = buildTagsHref(l1Tags);

          return (
            <li key={garment}>
              <Link
                href={l1Href}
                className="tnt__item tnt__item--l1"
                style={isL1Active ? ACTIVE_STYLE : undefined}
              >
                <span>{garment}</span>
                <span className="tnt__icon" aria-hidden="true">{isL1Active ? '−' : '+'}</span>
              </Link>

              {isL1Active && (
                <ul className="tnt__l2">
                  {AUDIENCES.map((audience) => {
                    const isL2Active = activeAudience === audience;
                    const tagsWithoutAudience = activeTags.filter((t) => !AUDIENCES.includes(t));
                    const l2Tags = isL2Active
                      ? tagsWithoutAudience
                      : [...tagsWithoutAudience, audience];
                    const l2Href = buildTagsHref(l2Tags);

                    return (
                      <li key={audience}>
                        <Link
                          href={l2Href}
                          className="tnt__item"
                          style={isL2Active ? ACTIVE_STYLE : undefined}
                        >
                          <span>{audience}</span>
                          <span className="tnt__icon" aria-hidden="true">{isL2Active ? '−' : '+'}</span>
                        </Link>

                        {isL2Active && (
                          <ul className="tnt__l3">
                            {NECKLINES.map((neckline) => {
                              const isL3Active = activeTags.includes(neckline);
                              const tagsWithoutNecklines = activeTags.filter(
                                (t) => !NECKLINES.includes(t)
                              );
                              const l3Tags = isL3Active
                                ? tagsWithoutNecklines
                                : [...tagsWithoutNecklines, neckline];
                              const l3Href = buildTagsHref(l3Tags);

                              return (
                                <li key={neckline}>
                                  <Link
                                    href={l3Href}
                                    className="tnt__item tnt__item--l3"
                                    style={isL3Active ? ACTIVE_STYLE : undefined}
                                  >
                                    {neckline}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <style jsx>{`
        .tnt {
          font-size: 0.875rem;
        }

        /* Header — mirrors tfp__head */
        .tnt__head {
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

        /* Lists */
        .tnt__l1,
        .tnt__l2,
        .tnt__l3 {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tnt__l1 {
          margin-top: 8px;
        }

        .tnt__l2 {
          padding-left: 10px;
          margin: 2px 0 4px;
        }

        .tnt__l3 {
          padding-left: 10px;
          margin: 2px 0 4px;
        }

        /* Item links — match tfp__item style */
        .tnt__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
          box-sizing: border-box;
          transition: background 0.12s, color 0.12s;
          text-decoration: none;
          font-size: 0.8125rem;
          color: #555;
        }

        .tnt__item--l1 {
          font-weight: 600;
          color: #333;
        }

        .tnt__item--l3 {
          font-size: 0.75rem;
          color: #777;
        }

        .tnt__item:hover {
          background: #f5f5f5;
          border-color: #ddd;
          color: #111;
        }

        /* +/- icon */
        .tnt__icon {
          font-size: 16px;
          color: inherit;
          font-weight: 300;
          line-height: 1;
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }
      `}</style>
    </nav>
  );
}
