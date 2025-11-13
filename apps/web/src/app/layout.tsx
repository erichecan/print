/**
 * Root Layout
 * [2025-01-27 00:00:00]
 * [2025-11-05 00:35:00] Added CartProvider
 * [2025-11-11 23:57:05] Integrated global header/footer and Inter font
 */
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

const CartProvider = dynamic(() => import('@/contexts/CartContext').then((mod) => mod.CartProvider), {
  ssr: false,
}); // [2025-11-10 22:56:25] Defer CartProvider to client to prevent SSR hook usage during static generation

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
}); // [2025-11-11 23:57:05] Ensure Inter font served via next/font for CLS stability

export const metadata: Metadata = {
  title: 'Print E-commerce',
  description: 'Custom print merchandise e-commerce platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
