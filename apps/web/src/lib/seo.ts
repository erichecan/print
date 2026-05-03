/**
 * SEO Utilities
* 创建 SEO 工具函数，用于生成结构化数据和元数据
 */

import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://suvernireplus.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/hero/hero-products.jpg`;

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
type?: 'website' | 'article'; // Next Metadata 不支持 'product'，统一用 article/website
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * 生成页面 SEO 元数据
* 基于页面信息生成完整的 SEO 元数据
 */
export function generateSEOMetadata(options: SEOMetadata): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = DEFAULT_OG_IMAGE,
    url = SITE_URL,
    type = 'website',
    publishedTime,
    modifiedTime,
  } = options;

  const fullTitle = `${title} | suvernire plus`;

  return {
    title: fullTitle,
    description,
    keywords,
    openGraph: {
      type,
      title: fullTitle,
      description,
      url,
      siteName: 'suvernire plus',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * 生成网站结构化数据 (JSON-LD)
* 基于原型实现，生成 schema.org 结构化数据
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'suvernire plus',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * 生成组织结构化数据 (JSON-LD)
* 生成 Organization schema
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'suvernire plus',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-416-916-6352',
      contactType: 'Customer Service',
      areaServed: 'CA',
      availableLanguage: ['en', 'zh'],
    },
    sameAs: [],
  };
}

/**
 * 生成本地商家结构化数据 (JSON-LD)
 * 用于提升本地搜索排名
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'suvernire plus',
    description: 'Custom merch and promotional products. T-shirts, hoodies, hats & more with expert design help.',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: DEFAULT_OG_IMAGE,
    telephone: '+1-416-916-6352',
    email: 'support@suvernireplus.com',
    priceRange: '$$',
    currenciesAccepted: 'CAD, USD',
    paymentAccepted: 'Credit Card, Debit Card',
    areaServed: ['CA', 'US'],
    hasMap: 'https://maps.google.com',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    sameAs: [],
  };
}

/**
 * 生成产品结构化数据 (JSON-LD)
* 用于产品详情页
* 优化产品 schema，支持更多字段 for Issue #154
 */
export function generateProductSchema(product: {
  name: string;
  description: string;
  image?: string | string[];
  price?: number | string;
  currency?: string;
  sku?: string;
  brand?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  url?: string;
  category?: string;
}) {
  const {
    name,
    description,
    image = `${SITE_URL}/assets/hero/hero-card-tee.jpg`,
    price,
    currency = 'CAD',
    sku,
    brand = 'suvernire plus',
    availability = 'InStock',
    url,
    category,
  } = product;

  const images = Array.isArray(image) ? image : [image];
  const productUrl = url || (sku ? `${SITE_URL}/products/${sku}` : `${SITE_URL}/products/${name.toLowerCase().replace(/\s+/g, '-')}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images,
    ...(category && { category }),
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    ...(sku && { sku }),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: currency,
      price: typeof price === 'string' ? price : (price?.toFixed(2) || '0.00'),
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: brand,
      },
    },
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
