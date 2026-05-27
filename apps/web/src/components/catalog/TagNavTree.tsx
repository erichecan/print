'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { parseTagsParam, TAG_TAXONOMY } from '@/lib/tag-taxonomy';

const GARMENT_TYPES = TAG_TAXONOMY.garmentType.tags as unknown as string[];
const AUDIENCES = TAG_TAXONOMY.audience.tags as unknown as string[];
const NECKLINES = TAG_TAXONOMY.neckline.tags as unknown as string[];
const ART_THEMES = TAG_TAXONOMY.artTheme.tags as unknown as string[];

const ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '3px 8px',
  borderRadius: '6px',
  border: '1px solid transparent',
  boxSizing: 'border-box',
  transition: 'background 0.12s, color 0.12s',
  textDecoration: 'none',
  fontSize: '0.8125rem',
  color: '#555',
};

const ITEM_L1: React.CSSProperties = { ...ITEM_BASE, fontWeight: 600, color: '#333' };
const ITEM_L3: React.CSSProperties = { ...ITEM_BASE, fontSize: '0.75rem', color: '#777' };
const ACTIVE: React.CSSProperties = { background: '#111', color: '#fff', borderColor: '#111' };
const ICON_STYLE: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 300,
  lineHeight: 1,
  width: '16px',
  textAlign: 'center',
  flexShrink: 0,
};

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
      <div className="tnt__head">
        <span>Categories</span>
      </div>

      <ul className="tnt__l1">
        <li>
          <Link
            href="/products"
            style={isRoot ? { ...ITEM_BASE, ...ACTIVE } : ITEM_BASE}
          >
            All Products
          </Link>
        </li>

        {GARMENT_TYPES.map((garment) => {
          const isL1Active = activeGarment === garment;
          const tagsWithoutTree = activeTags.filter(
            (t) => !GARMENT_TYPES.includes(t) && !AUDIENCES.includes(t) && !NECKLINES.includes(t) && !ART_THEMES.includes(t)
          );
          const l1Tags = isL1Active ? tagsWithoutTree : [garment, ...tagsWithoutTree];
          const l1Href = buildTagsHref(l1Tags);

          return (
            <li key={garment}>
              <Link
                href={l1Href}
                style={isL1Active ? { ...ITEM_L1, ...ACTIVE } : ITEM_L1}
              >
                <span>{garment}</span>
                <span style={ICON_STYLE} aria-hidden="true">{isL1Active ? '−' : '+'}</span>
              </Link>

              {isL1Active && (
                <ul className="tnt__l2">
                  {AUDIENCES.map((audience) => {
                    const isL2Active = activeAudience === audience;
                    const tagsWithoutAudNeck = activeTags.filter(
                      (t) => !AUDIENCES.includes(t) && !NECKLINES.includes(t)
                    );
                    const l2Tags = isL2Active
                      ? tagsWithoutAudNeck
                      : [...tagsWithoutAudNeck, audience];
                    const l2Href = buildTagsHref(l2Tags);

                    return (
                      <li key={audience}>
                        <Link
                          href={l2Href}
                          style={isL2Active ? { ...ITEM_BASE, ...ACTIVE } : ITEM_BASE}
                        >
                          <span>{audience}</span>
                          <span style={ICON_STYLE} aria-hidden="true">{isL2Active ? '−' : '+'}</span>
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
                                    style={isL3Active ? { ...ITEM_L3, ...ACTIVE } : ITEM_L3}
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
      `}</style>
    </nav>
  );
}
