/**
 * SEO Utilities
* 创建 SEO 工具函数，用于生成结构化数据和元数据
 */

import type { Metadata } from 'next';

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
    image = 'https://suvernireplus.com/assets/og-home.jpg',
    url = 'https://suvernireplus.com',
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
    url: 'https://suvernireplus.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://suvernireplus.com/search?q={search_term_string}',
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
    url: 'https://suvernireplus.com',
logo: 'https://suvernireplus.com/logo.png', // 使用 Souvenir Plus Inc 官方 logo
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-416-916-6352',
      contactType: 'Customer Service',
      areaServed: 'US',
      availableLanguage: ['en', 'zh'],
    },
    sameAs: [
      // 可以添加社交媒体链接
    ],
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
    image = 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
    price,
    currency = 'CAD',
    sku,
    brand = 'suvernire plus',
    availability = 'InStock',
    url,
    category,
  } = product;

  const images = Array.isArray(image) ? image : [image];
  const productUrl = url || (sku ? `https://suvernireplus.com/products/${sku}` : `https://suvernireplus.com/products/${name.toLowerCase().replace(/\s+/g, '-')}`);

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

