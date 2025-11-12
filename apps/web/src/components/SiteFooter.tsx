/**
 * Site Footer component
 * [2025-11-11 23:56:40] Ported marketing footer structure from prototype into Next.js
 */
'use client';

import Link from 'next/link';

const footerColumns = [
  {
    title: 'About Us',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/design-gallery', label: 'Design Gallery' },
    ],
  },
  {
    title: 'Your Account',
    links: [
      { href: '/account', label: 'My Account' },
      { href: '/account/designs', label: 'My Designs' },
      { href: '/order-tracking', label: 'Track Your Order' },
      { href: '/cart', label: 'View Cart' },
    ],
  },
  {
    title: 'Shop',
    links: [
      { href: '/products', label: 'All Products' },
      { href: '/design-lab', label: 'Design Lab' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/help', label: 'Help Center' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/shipping-info', label: 'Shipping Info' },
      { href: '/returns', label: 'Returns' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-of-service', label: 'Terms of Service' },
      { href: '/size-guide', label: 'Size Guide' },
      { href: '/sitemap.xml', label: 'Sitemap' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <section className="footer-info">
        <div className="container footer-info__grid">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <div className="container footer-meta">
        <small>© 2025 Inkify LLC. All rights reserved.</small>
        <nav aria-label="Legal links" className="footer-meta__links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms-of-service">Terms of Service</Link>
          <span aria-hidden="true">|</span>
          <Link href="/returns">Returns</Link>
          <span aria-hidden="true">|</span>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

