/**
 * Root Layout
* Added CartProvider
* Integrated global header/footer and Inter font
* Admin 路径不显示 header/footer
 */
import type { Metadata } from 'next';
import Script from 'next/script';
import { Marcellus, Instrument_Sans, Noto_Sans_SC, Noto_Sans_TC, Noto_Sans_JP, Noto_Sans_Devanagari } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CartProvider } from '@/contexts/CartContext'; // Next.js 15: 直接导入客户端组件，无需 dynamic
import { ToastProvider } from '@/hooks/useToast'; // 全局 Toast 提供者
import { AuthProvider } from '@/contexts/AuthContext'; // 全局认证状态管理
import { GlobalErrorFilter } from '@/components/GlobalErrorFilter'; // 全局错误过滤器
import { StripeConfigValidator } from '@/components/StripeConfigValidator'; // Stripe 配置验证组件

import LayoutWrapper from './LayoutWrapper';
import './globals.css';
import './globals-mobile.css';
// 启动时环境变量校验
import '@/server/env-check';

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-heading',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body',
});

// 加载多语言字体支持
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
}); // 简体中文

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
}); // 繁体中文

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
}); // 日文

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-devanagari',
}); // Hindi (Devanagari)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://suvernireplus.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
    siteName: 'suvernire plus',
    title: 'Custom Merch & Promotional Products | suvernire plus',
    description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed.',
    images: [
      {
        url: '/assets/hero/hero-products.jpg',
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
    images: ['/assets/hero/hero-products.jpg'],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${marcellus.variable} ${instrumentSans.variable} ${notoSansSC.variable} ${notoSansTC.variable} ${notoSansJP.variable} ${notoSansDevanagari.variable}`}>
        <GlobalErrorFilter /> {/* 过滤不相关的浏览器错误 */}
        <StripeConfigValidator /> {/* Stripe 配置验证 */}

        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/6a173b8f3f9e9f1c33fcd582/1jplc19pb';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />

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
