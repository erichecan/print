'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { TAG_TAXONOMY, GARMENT_SLUG_TO_TAG } from '@/lib/tag-taxonomy';

// Garment columns shown in the mega menu, in display order
const GARMENT_COLS = Object.entries(GARMENT_SLUG_TO_TAG); // [['t-shirts','T-Shirt'], ...]

const AUDIENCE_TAGS = TAG_TAXONOMY.audience.tags;
const NECKLINE_TAGS = TAG_TAXONOMY.neckline.tags;

export function CatalogMegaMenu() {
  const [open, setOpen] = useState(false);
  // Track which garment column is active in the panel
  const [activeSlug, setActiveSlug] = useState<string>(GARMENT_COLS[0][0]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    <li
      className="mega__item mega__item--catalog"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger */}
      <button
        type="button"
        className={`mega__trigger${open ? ' mega__trigger--active' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Shop
        <svg className="cmm__arrow" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="cmm"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          role="region"
          aria-label="Shop by category"
        >
          <div className="cmm__inner">
            {/* Left: garment type tabs */}
            <nav className="cmm__garments" aria-label="Garment types">
              <p className="cmm__section-label">类型</p>
              {GARMENT_COLS.map(([slug, garmentTag]) => (
                <Link
                  key={slug}
                  href={`/catalog/${slug}`}
                  className={`cmm__garment-item${activeSlug === slug ? ' cmm__garment-item--active' : ''}`}
                  onMouseEnter={() => setActiveSlug(slug)}
                  onClick={() => setOpen(false)}
                >
                  {garmentTag}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                    <path d="M2 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="cmm__divider" aria-hidden="true" />

            {/* Right: audience + neckline for active garment */}
            <div className="cmm__detail">
              <p className="cmm__section-label">
                All{' '}
                <Link
                  href={`/catalog/${activeSlug}`}
                  className="cmm__all-link"
                  onClick={() => setOpen(false)}
                >
                  {GARMENT_SLUG_TO_TAG[activeSlug]}s →
                </Link>
              </p>

              <div className="cmm__audience-grid">
                {AUDIENCE_TAGS.map((audience) => (
                  <div key={audience} className="cmm__audience-col">
                    {/* Audience link — Level 2 */}
                    <Link
                      href={`/catalog/${activeSlug}?tags=${encodeURIComponent(audience)}`}
                      className="cmm__audience-label"
                      onClick={() => setOpen(false)}
                    >
                      {audience}
                    </Link>

                    {/* Neckline links — Level 3 */}
                    <ul className="cmm__necklines">
                      {NECKLINE_TAGS.map((neckline) => (
                        <li key={neckline}>
                          <Link
                            href={`/catalog/${activeSlug}?tags=${encodeURIComponent(audience)},${encodeURIComponent(neckline)}`}
                            className="cmm__neckline-link"
                            onClick={() => setOpen(false)}
                          >
                            {neckline}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .cmm__arrow {
          margin-left: 4px;
          transition: transform 0.15s;
          vertical-align: middle;
        }
        .mega__trigger--active .cmm__arrow {
          transform: rotate(180deg);
        }

        .cmm {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 200;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-top: 2px solid #111;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          min-width: 580px;
          border-radius: 0 0 6px 6px;
        }

        .cmm__inner {
          display: flex;
          gap: 0;
        }

        /* Left column: garment types */
        .cmm__garments {
          width: 180px;
          flex-shrink: 0;
          padding: 20px 0;
          background: #f7f7f7;
          border-right: 1px solid #e5e5e5;
        }

        .cmm__section-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #999;
          padding: 0 16px 8px;
          margin: 0;
        }

        .cmm__garment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          font-size: 0.875rem;
          color: #333;
          text-decoration: none;
          transition: background 0.1s, color 0.1s;
          border-left: 2px solid transparent;
        }
        .cmm__garment-item:hover,
        .cmm__garment-item--active {
          background: #fff;
          color: #111;
          border-left-color: #111;
          font-weight: 600;
        }

        /* Right panel: audience + neckline */
        .cmm__detail {
          flex: 1;
          padding: 20px 24px;
        }

        .cmm__all-link {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #111;
          text-decoration: none;
          border-bottom: 1px solid #111;
        }
        .cmm__all-link:hover {
          opacity: 0.7;
        }

        .cmm__audience-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 16px;
        }

        .cmm__audience-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cmm__audience-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #111;
          text-decoration: none;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e5e5;
          margin-bottom: 2px;
        }
        .cmm__audience-label:hover {
          color: #555;
        }

        .cmm__necklines {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cmm__neckline-link {
          font-size: 0.8rem;
          color: #555;
          text-decoration: none;
          display: block;
          padding: 2px 0;
          transition: color 0.1s;
        }
        .cmm__neckline-link:hover {
          color: #111;
        }

        .cmm__divider {
          width: 1px;
          background: #e5e5e5;
        }
      `}</style>
    </li>
  );
}
