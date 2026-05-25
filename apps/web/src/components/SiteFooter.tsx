'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

export function SiteFooter() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const footerConfig = contentData?.data?.footer;

  const footerCopyright = footerConfig?.copyrightText || `© ${currentYear} Suvernire Plus. All rights reserved.`;
  const socialLinks = footerConfig?.socialLinks || [];
  const bottomLinks = footerConfig?.bottomLinks || [];

  const toggleSection = (title: string) => {
    setOpenSection(openSection === title ? null : title);
  };

  const navColumns = [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press', href: '/press' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Shipping Info', href: '/shipping-info' },
        { label: 'Returns & Exchanges', href: '/returns' },
        { label: 'FAQ', href: '/help#faq' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Saved Designs', href: '/designs' },
        { label: 'Track Your Order', href: '/order-tracking' },
        { label: 'Place a Reorder', href: '/reorder' },
        { label: 'Get a Quick Quote', href: '/quote' },
      ],
    },
    {
      title: 'Contact',
      links: [
        { label: '416-916-6352', href: 'tel:4169166352' },
        { label: 'Live Chat', href: '/help#chat' },
        { label: 'Email Us', href: '/contact' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#29272B', color: '#fff' }} className="font-sans">
      {/* Main footer grid */}
      <div className="container" style={{ paddingTop: '64px', paddingBottom: '48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>

          {/* Desktop layout */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: '40px', alignItems: 'start' }}>
            {/* Brand column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Link href="/" aria-label="Suvernire Plus home">
                <Image
                  src="/logo.png"
                  alt="Suvernire Plus"
                  width={160}
                  height={28}
                  style={{ width: 'auto', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                />
              </Link>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', maxWidth: '240px' }}>
                Premium custom merch for teams, businesses & events. Free shipping. 100% satisfaction guaranteed.
              </p>

              {/* Newsletter */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  Stay in the loop
                </p>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  style={{ display: 'flex', gap: '0' }}
                >
                  <input
                    type="email"
                    placeholder="your@email.com"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRight: 'none',
                      borderRadius: 0,
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '10px 16px',
                      background: '#fff',
                      color: '#000',
                      border: '1px solid #fff',
                      borderRadius: 0,
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Subscribe
                  </button>
                </form>
              </div>

              {/* Social icons */}
              {socialLinks.length > 0 && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {socialLinks.map((link: { id: string; url: string; platform: string }) => (
                    <a
                      key={link.id}
                      href={link.url}
                      style={{ color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                      title={link.platform}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Nav columns */}
            {navColumns.map((col) => (
              <div key={col.title}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                  {col.title}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile layout — accordion */}
          <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Brand block */}
            <div style={{ padding: '0 0 32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Link href="/" aria-label="Suvernire Plus home">
                <Image
                  src="/logo.png"
                  alt="Suvernire Plus"
                  width={140}
                  height={24}
                  style={{ width: 'auto', height: '24px', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: '16px' }}
                />
              </Link>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                Premium custom merch. Free shipping. 100% satisfaction.
              </p>
            </div>

            {/* Accordion sections */}
            {navColumns.map((col) => (
              <div key={col.title} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => toggleSection(col.title)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <span>{col.title}</span>
                  <span style={{ fontSize: '20px', fontWeight: 300, transform: openSection === col.title ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                </button>
                <div style={{
                  overflow: 'hidden',
                  maxHeight: openSection === col.title ? '400px' : '0',
                  transition: 'max-height 0.3s ease',
                }}>
                  <ul style={{ listStyle: 'none', padding: '0 0 20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* Mobile newsletter */}
            <div style={{ padding: '28px 0' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                Stay in the loop
              </p>
              <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    fontSize: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRight: 'none',
                    borderRadius: 0,
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 18px',
                    background: '#fff',
                    color: '#000',
                    border: '1px solid #fff',
                    borderRadius: 0,
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '20px 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {footerCopyright}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
            {bottomLinks.length > 0 ? (
              bottomLinks.map((link: { id?: string; href: string; label: string }, idx: number) => (
                <React.Fragment key={link.id || idx}>
                  <Link
                    href={link.href}
                    style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    {link.label}
                  </Link>
                </React.Fragment>
              ))
            ) : (
              <>
                <Link
                  href="/privacy-policy"
                  style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Privacy Policy
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>|</span>
                <Link
                  href="/terms-of-service"
                  style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Terms of Service
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
