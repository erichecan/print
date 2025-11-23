/**
 * Root Layout
 * [2025-01-27 00:00:00]
 * [2025-11-05 00:35:00] Added CartProvider
 * [2025-11-11 23:57:05] Integrated global header/footer and Inter font
 * [2025-11-15 12:35:00] Admin 路径不显示 header/footer
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CartProvider } from '@/contexts/CartContext'; // [2025-01-27 15:10:00] Next.js 15: 直接导入客户端组件，无需 dynamic
import { ToastProvider } from '@/hooks/useToast'; // [2025-01-27 16:35:00] 全局 Toast 提供者
import { AuthProvider } from '@/contexts/AuthContext'; // [2025-01-28 07:30:00] 全局认证状态管理
import LayoutWrapper from './LayoutWrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
}); // [2025-11-11 23:57:05] Ensure Inter font served via next/font for CLS stability

// [2025-01-27 16:30:00] 补充完整的 SEO 元数据，基于原型实现
export const metadata: Metadata = {
  title: {
    default: 'Custom Merch & Promotional Products | suvernire plus',
    template: '%s | suvernire plus',
  },
  description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed. Professional design tools, bulk pricing available.',
  keywords: ['custom t-shirts', 'custom apparel', 'promotional products', 'bulk printing', 'custom hoodies', 'design tools'],
  authors: [{ name: 'suvernire plus' }],
  creator: 'suvernire plus',
  publisher: 'suvernire plus',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://suvernireplus.com',
    siteName: 'suvernire plus',
    title: 'Custom Merch & Promotional Products | suvernire plus',
    description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed.',
    images: [
      {
        url: 'https://suvernireplus.com/assets/og-home.jpg',
        width: 1200,
        height: 630,
        alt: 'suvernire plus - Custom Merch & Promotional Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Custom Merch & Promotional Products | suvernire plus',
    description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed.',
    images: ['https://suvernireplus.com/assets/twitter-home.jpg'],
  },
  alternates: {
    canonical: 'https://suvernireplus.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
