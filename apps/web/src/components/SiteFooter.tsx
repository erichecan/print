/**
 * Site Footer component
 * Updated to match the requested 3-column layout design
 * Integrates with Admin CMS for link management
 */
'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

// Default footer link structure (Fallback if CMS is empty)
const DEFAULT_SECTIONS = {
  about: {
    title: 'About Us',
    links: [
      { label: 'Get to Know Custom Ink', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Partnerships', href: '/partnerships' },
      { label: 'Diversity & Belonging', href: '/diversity' },
      { label: 'Customer Reviews', href: '/reviews' },
      { label: 'Customer Photos', href: '/photos' },
      { label: 'Custom Ink Blog', href: '/blog' },
      { label: 'Store Locations', href: '/locations' },
    ]
  },
  account: {
    title: 'Your Account',
    links: [
      { label: 'Retrieve a Saved Design', href: '/designs' },
      { label: 'Retrieve a Printed Proof', href: '/proofs' },
      { label: 'Track Your Order', href: '/order-tracking' },
      { label: 'Place a Reorder', href: '/reorder' },
    ]
  },
  service: {
    title: 'Service Center',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Get a Quick Quote', href: '/quote' },
      { label: 'Content Guidelines', href: '/content-guidelines' },
      { label: 'Our Commitment to Accessibility', href: '/accessibility' },
    ]
  }
};

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  // Fetch dynamic content from CMS
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const footerColumns = contentData?.data?.staticTexts?.footerColumns || [];
  const footerCopyright = contentData?.data?.staticTexts?.footerCopyright || `© ${currentYear} Inkify LLC. All rights reserved.`;

  // Helper to find a CMS column by title (case-insensitive) or return default
  const getSectionLinks = (key: keyof typeof DEFAULT_SECTIONS) => {
    const defaultSection = DEFAULT_SECTIONS[key];
    const cmsColumn = footerColumns.find(col => col.title.toLowerCase() === defaultSection.title.toLowerCase());
    return cmsColumn?.links && cmsColumn.links.length > 0
      ? cmsColumn.links
      : defaultSection.links;
  };

  const aboutLinks = getSectionLinks('about');
  const accountLinks = getSectionLinks('account');
  const serviceLinks = getSectionLinks('service');

  return (
    <footer className="w-full bg-white pt-12 pb-8 border-t border-gray-200 text-gray-800">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">

          {/* Column 1: Multimedia, Newsletter, Social */}
          <div className="flex flex-col gap-8">
            {/* TV Commercial Section */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-4 tracking-wide text-gray-900">Watch our TV Commercial</h4>
              <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center relative group cursor-pointer overflow-hidden border border-gray-200">
                {/* Placeholder Image/Video */}
                <div className="absolute inset-0 bg-gray-200 group-hover:bg-gray-300 transition-colors" />
                <div className="relative z-10 w-12 h-12 bg-black/70 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L5 21V3Z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Email Sign-up */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-3 tracking-wide text-gray-900">Email Sign-up</h4>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="your email address"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded text-sm font-semibold transition-colors"
                >
                  Submit
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2 italic leading-tight">
                By clicking submit, I acknowledge I have read and accepted the <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            {/* Follow Us */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-4 tracking-wide text-gray-900">Follow Us</h4>
              <div className="flex gap-4">
                {/* Facebook */}
                <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                {/* Pinterest */}
                <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a10 10 0 0 0-3.666 19.315c-.097-.822-.178-2.086.037-2.986l1.288-5.464s-.328-.655-.328-1.625c0-1.522.883-2.658 1.983-2.658.935 0 1.387.702 1.387 1.544 0 .94-.599 2.346-.908 3.65-.259 1.091.547 1.982 1.622 1.982 1.947 0 3.444-2.053 3.444-5.015 0-2.622-1.884-4.453-4.576-4.453-3.333 0-5.286 2.5-5.286 5.084 0 1.006.388 2.084.872 2.67.096.116.11.218.081.336l-.328 1.353c-.053.22-.175.267-.404.161-1.503-.699-2.441-2.886-2.441-4.646 0-3.784 2.748-7.256 7.922-7.256 4.159 0 7.394 2.964 7.394 6.924 0 4.134-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.749 2.853c-.271 1.043-1.002 2.35-1.492 3.146C10.519 21.921 11.246 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                  </svg>
                </a>
                {/* Instagram */}
                <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                {/* RSS */}
                <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 11a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 4a16 16 0 0 1 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="5" cy="19" r="1" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="flex flex-col gap-10">
            {/* About Us */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-4 tracking-wide text-gray-900">{DEFAULT_SECTIONS.about.title}</h4>
              <ul className="space-y-3 text-base text-gray-700">
                {aboutLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-blue-600">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Your Account */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-4 tracking-wide text-gray-900">{DEFAULT_SECTIONS.account.title}</h4>
              <ul className="space-y-3 text-base text-gray-700">
                {accountLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-blue-600">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3: Contact & Service */}
          <div className="flex flex-col gap-10">

            {/* Talk to a Real Person */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-2 tracking-wide text-gray-900">Talk to a Real Person</h4>
              <p className="font-bold text-xs uppercase text-gray-800 mb-4">7 Days a Week</p>

              <ul className="space-y-1 text-base text-gray-700 mb-6">
                <li>Monday-Friday: 8am - Midnight ET</li>
                <li>Saturday: 10am - 6pm ET</li>
                <li>Sunday: 10am - 6pm ET</li>
              </ul>

              <div className="mb-6">
                <p className="font-bold text-red-600 text-sm">Holiday Hours:</p>
                <p className="text-gray-700">Jan. 1st - Closed</p>
              </div>

              {/* Contact Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700 hover:text-blue-600 cursor-pointer">
                  <span className="text-orange-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span className="text-lg font-medium text-gray-500">855-256-1652</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700 hover:text-blue-600 cursor-pointer">
                  <span className="text-orange-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <span className="text-lg font-normal text-gray-500">Live Chat</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700 hover:text-blue-600 cursor-pointer">
                  <span className="text-orange-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span className="text-lg font-normal text-gray-500">Send us an Email</span>
                </div>
              </div>
            </div>

            {/* Service Center */}
            <div>
              <h4 className="font-bold text-sm uppercase mb-4 tracking-wide text-gray-900">{DEFAULT_SECTIONS.service.title}</h4>
              <ul className="space-y-3 text-base text-gray-700">
                {serviceLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-blue-600">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>{footerCopyright}</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy-policy" className="hover:text-blue-600">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms-of-service" className="hover:text-blue-600">Terms of Service</Link>
              <span>|</span>
              <Link href="/sitemap.xml" className="hover:text-blue-600">Sitemap</Link>
              {/* 保持后台入口，但在 UI 上稍微隐蔽一点或保持原样 */}
              <span>|</span>
              <Link href="/admin/offline-orders" className="hover:text-blue-600">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
