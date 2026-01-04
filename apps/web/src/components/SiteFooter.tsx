import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

const DEFAULT_FOOTER_SECTIONS = [
  {
    title: 'About Us',
    links: [
      { label: 'Get to Know Custom Ink', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ]
  },
  {
    title: 'Your Account',
    links: [
      { label: 'Retrieve a Saved Design', href: '/designs' },
      { label: 'Track Your Order', href: '/order-tracking' },
    ]
  },
  {
    title: 'Contact Us',
    links: [
      { label: '416-916-6352', href: 'tel:4169166352' },
      { label: 'Chat Now', href: '/help#guestbook' },
      { label: 'Email Us', href: '/contact' },
    ]
  },
  {
    title: 'Service Center',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Get a Quick Quote', href: '/quote' },
    ]
  }
];

export function SiteFooter() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  // Fetch dynamic content from CMS
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const footerConfig = contentData?.data?.footer;

  const footerColumns = footerConfig?.columns || [];
  const footerCopyright = footerConfig?.copyrightText || `© ${currentYear} Inkify LLC. All rights reserved.`;
  const socialLinks = footerConfig?.socialLinks || [];
  const bottomLinks = footerConfig?.bottomLinks || [];

  const toggleSection = (title: string) => {
    setOpenSection(openSection === title ? null : title);
  };

  // Sections to display in order: use CMS columns if available, otherwise default
  const sections = footerColumns.length > 0 ? footerColumns : DEFAULT_FOOTER_SECTIONS;

  return (
    <footer className="w-full bg-white border-t border-gray-100 font-sans">
      {/* Navigation Sections */}
      <div className="border-b border-gray-100">
        {sections.map((section: any) => (
          <div key={section.title} className="border-b border-gray-50 last:border-b-0">
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex justify-between items-center px-6 py-5 text-lg font-medium text-gray-800"
            >
              <span>{section.title}</span>
              <span className={`text-2xl text-gray-300 font-light transition-transform duration-200 ${openSection === section.title ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === section.title ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
              <ul className="px-6 pb-6 space-y-4">
                {(section.links || []).map((link: any) => (
                  <li key={link.label || link.id || Math.random()}>
                    <Link href={link.href} className="text-gray-600 hover:text-blue-600 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-10 space-y-12">
        {/* Email Sign-up */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-900 tracking-wider">EMAIL SIGN-UP</h4>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="your email address"
              className="flex-1 px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-600 text-gray-600"
            />
            <button
              type="submit"
              className="bg-[#1a47e5] text-white px-8 py-3 rounded font-bold hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </form>
          <p className="text-[13px] text-gray-500 italic leading-relaxed">
            By clicking submit, I acknowledge I have read and accepted the{' '}
            <Link href="/privacy-policy" className="text-blue-600 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Social Follow */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-900 tracking-wider text-center">FOLLOW US</h4>
          <div className="flex justify-center gap-6">
            {socialLinks.length > 0 ? (
              socialLinks.map((link: any) => (
                <a key={link.id} href={link.url} className="text-[#ff4500] hover:opacity-80 transition-opacity" title={link.platform}>
                  {link.platform.toLowerCase().includes('facebook') && (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z" /></svg>
                  )}
                  {link.platform.toLowerCase().includes('linkedin') && (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                  )}
                  {link.platform.toLowerCase().includes('pinterest') && (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.25 2.66 7.87 6.42 9.29-.09-.79-.17-2 .03-2.87l1.24-5.26s-.31-.63-.31-1.56c0-1.46.85-2.55 1.90-2.55.9 0 1.33.67 1.33 1.48 0 .9-.57 2.25-.87 3.5-.25 1.05.52 1.9 1.55 1.9 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.36-4.25-2.96 0-4.7 2.22-4.7 4.51 0 .9.34 1.86.77 2.38.09.11.1.2.07.3l-.31 1.3c-.05.19-.16.23-.37.13-1.39-.65-2.26-2.69-2.26-4.32 0-3.52 2.56-6.76 7.37-6.76 3.87 0 6.87 2.76 6.87 6.44 0 3.84-2.42 6.94-5.78 6.94-1.13 0-2.2-.59-2.56-1.28l-.7 2.66c-.25.96-.93 2.16-1.39 2.9 1.04.31 2.14.47 3.28.47 5.52 0 10-4.48 10-10S17.52 2 12 2z" /></svg>
                  )}
                  {link.platform.toLowerCase().includes('instagram') && (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" /></svg>
                  )}
                  {!['facebook', 'linkedin', 'pinterest', 'instagram'].some(p => link.platform.toLowerCase().includes(p)) && (
                    <div className="w-8 h-8 bg-[#ff4500] text-white rounded-sm flex items-center justify-center font-bold text-xs">
                      {link.platform[0].toUpperCase()}
                    </div>
                  )}
                </a>
              ))
            ) : (
              /* Fallback Social Icons */
              <>
                <a href="#" className="text-[#ff4500] hover:opacity-80 transition-opacity">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z" /></svg>
                </a>
                <a href="#" className="text-[#ff4500] hover:opacity-80 transition-opacity">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Footer Bottom / Copyright */}
        <div className="flex flex-col items-center gap-4 text-center pt-4">
          <p className="text-xs text-gray-500">{footerCopyright}</p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {bottomLinks.length > 0 ? (
              bottomLinks.map((link: any, idx: number) => (
                <React.Fragment key={link.id || idx}>
                  <Link href={link.href} className="hover:text-blue-600 transition-colors cursor-pointer">{link.label}</Link>
                  {idx < bottomLinks.length - 1 && <span>|</span>}
                </React.Fragment>
              ))
            ) : (
              <>
                <Link href="/privacy-policy" className="hover:text-blue-600 cursor-pointer">Privacy Policy</Link>
                <span>|</span>
                <Link href="/terms-of-service" className="hover:text-blue-600 cursor-pointer">Terms of Service</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
