/**
 * Site Footer component
 * [2025-11-11 23:56:40] Ported marketing footer structure from prototype into Next.js
 * [2025-01-28 06:30:00] Updated to read footer content from CMS
 */
'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

// [2025-01-28 06:30:00] 默认页脚列（向后兼容）
const defaultFooterColumns = [
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
      // [2025-01-30 12:00:00] 移除 My Designs 链接
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
  // [2025-12-07 05:10:00] 添加线下订单入口
  // [2025-01-31 20:15:00] 添加管理后台入口
  {
    title: 'Business',
    links: [
      { href: '/offline-orders/sales/login', label: 'Offline Orders' },
      { href: '/admin/offline-orders', label: 'Admin Panel' }, // [2025-01-31 20:15:00] 管理后台链接
    ],
  },
];

export function SiteFooter() {
  // [2025-01-28 06:30:00] 从 CMS 获取页脚内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const footerColumns = contentData?.data?.staticTexts?.footerColumns || defaultFooterColumns;
  const footerCopyright = contentData?.data?.staticTexts?.footerCopyright || '© 2025 Inkify LLC. All rights reserved.';

  // [2025-01-28 06:30:00] 从页脚列中提取法律链接（用于底部 meta 区域）
  const legalColumn = footerColumns.find((col) => col.title === 'Legal');
  const legalLinks = legalColumn?.links || [
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms-of-service', label: 'Terms of Service' },
    { href: '/returns', label: 'Returns' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <footer className="site-footer" role="contentinfo">
      <section className="footer-info">
        <div className="container footer-info__grid">
          {footerColumns.map((column) => (
            <div key={column.id || column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link.id || link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <div className="container footer-meta">
        <small>{footerCopyright}</small>
        <nav aria-label="Legal links" className="footer-meta__links">
          {legalLinks.map((link, index) => (
            <span key={link.id || link.href}>
              <Link href={link.href}>{link.label}</Link>
              {index < legalLinks.length - 1 && <span aria-hidden="true">|</span>}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}

