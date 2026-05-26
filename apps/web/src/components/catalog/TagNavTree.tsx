'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { parseTagsParam, TAG_TAXONOMY } from '@/lib/tag-taxonomy';

const GARMENT_TYPES = TAG_TAXONOMY.garmentType.tags as unknown as string[];
const AUDIENCES = TAG_TAXONOMY.audience.tags as unknown as string[];
const NECKLINES = TAG_TAXONOMY.neckline.tags as unknown as string[];

const ACTIVE_STYLE: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  borderColor: '#111',
  borderRadius: '6px',
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
      <Link href="/products" className={`tnt__root${isRoot ? ' tnt__root--active' : ''}`}>
        All Products
      </Link>

      <ul className="tnt__l1">
        {GARMENT_TYPES.map((garment) => {
          const isL1Active = activeGarment === garment;

          // Toggle: selecting an active garment removes it and all child tags
          const tagsWithoutTree = activeTags.filter(
            (t) => !GARMENT_TYPES.includes(t) && !AUDIENCES.includes(t) && !NECKLINES.includes(t)
          );
          const l1Tags = isL1Active ? tagsWithoutTree : [garment, ...tagsWithoutTree];
          const l1Href = buildTagsHref(l1Tags);

          return (
            <li key={garment}>
              <Link
                href={l1Href}
                className="tnt__link tnt__link--l1"
                style={isL1Active ? ACTIVE_STYLE : undefined}
              >
                {garment}
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
                          className="tnt__link tnt__link--l2"
                          style={isL2Active ? ACTIVE_STYLE : undefined}
                        >
                          {audience}
                        </Link>

                        {isL2Active && (
                          <ul className="tnt__l3">
                            {NECKLINES.map((neckline) => {
                              const isL3Active = activeTags.includes(neckline);
                              const l3Tags = isL3Active
                                ? activeTags.filter((t) => t !== neckline)
                                : [...activeTags, neckline];
                              const l3Href = buildTagsHref(l3Tags);

                              return (
                                <li key={neckline}>
                                  <Link
                                    href={l3Href}
                                    className="tnt__link tnt__link--l3"
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
          padding-bottom: 1rem;
          margin-bottom: 0.25rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .tnt__root {
          display: block;
          font-weight: 700;
          font-size: 0.9375rem;
          text-decoration: none;
          color: #111;
          padding-bottom: 0.75rem;
          margin-bottom: 0.25rem;
          border-bottom: 2px solid #111;
        }

        .tnt__root--active {
          opacity: 0.6;
        }

        .tnt__l1,
        .tnt__l2,
        .tnt__l3 {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tnt__l2 {
          padding-left: 0.625rem;
          margin: 1px 0 4px;
        }

        .tnt__l3 {
          padding-left: 0.625rem;
          margin: 1px 0 4px;
        }

        .tnt__link {
          display: flex;
          align-items: center;
          width: 100%;
          text-decoration: none;
          padding: 0.28rem 0.5rem;
          border-radius: 6px;
          border: 1px solid transparent;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }

        .tnt__link--l1 {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #333;
        }

        .tnt__link--l2 {
          font-size: 0.8125rem;
          color: #555;
        }

        .tnt__link--l3 {
          font-size: 0.75rem;
          color: #777;
        }

        .tnt__link:hover {
          background: #f5f5f5;
          border-color: #ddd;
          color: #111;
        }

      `}</style>
    </nav>
  );
}
